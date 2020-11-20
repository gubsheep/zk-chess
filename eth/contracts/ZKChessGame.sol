pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "./ZKChessTypes.sol";
import "./ZKChessInit.sol";
import "./ZKChessUtils.sol";
import "./Verifier.sol";

contract ZKChessGame is Initializable {
    uint8 public constant NROWS = 5;
    uint8 public constant NCOLS = 7;

    uint256 public gameId;

    uint8 public turnNumber;
    uint16 public sequenceNumber;
    GameState public gameState;
    uint8[][] public boardPieces; // board[row][col]

    Objective[] public objectives;
    uint8[] public pieceIds;
    mapping(uint8 => Piece) public pieces;
    CardPrototype[] public cards;

    mapping(PieceType => PieceDefaultStats) public defaultStats;

    address public player1;
    address public player2;

    uint8 public player1Mana;
    uint8 public player2Mana;

    bool public player1HasDrawn;
    bool public player2HasDrawn;

    uint256 public player1HandCommit;
    uint256 public player2HandCommit;

    uint256 public lastTurnTimestamp;

    // mapping from turn # -> piece # -> has acted
    mapping(uint8 => mapping(uint8 => bool)) public hasMoved;
    mapping(uint8 => mapping(uint8 => bool)) public hasAttacked;

    function initialize(uint256 _gameId) public {
        gameId = _gameId;
        gameState = GameState.WAITING_FOR_PLAYERS;

        for (uint8 i = 0; i < NROWS; i++) {
            boardPieces.push();
            for (uint8 j = 0; j < NCOLS; j++) {
                boardPieces[i].push(0);
            }
        }

        // initialize pieces
        ZKChessInit.initializeDefaults(defaultStats);
        ZKChessInit.initializeObjectives(objectives);
        ZKChessInit.initializeCards(cards);
    }

    //////////////
    /// EVENTS ///
    //////////////

    event GameStart(address p1, address p2);
    event DidSummon(
        address player,
        uint8 pieceId,
        uint16 sequenceNumber,
        PieceType pieceType,
        uint8 atRow,
        uint8 atCol
    );
    event DidMove(
        uint16 sequenceNumber,
        uint8 pieceId,
        uint8 fromRow,
        uint8 fromCol,
        uint8 toRow,
        uint8 toCol
    );
    event DidAttack(
        uint16 sequenceNumber,
        uint8 attacker,
        uint8 attacked,
        uint8 attackerHp,
        uint8 attackedHp
    );
    event DidEndTurn(address player, uint8 turnNumber, uint16 sequenceNumber);
    event GameFinished();

    ///////////////
    /// GETTERS ///
    ///////////////

    function getMetadata() public view returns (GameMetadata memory ret) {
        ret = GameMetadata({gameId: gameId, NROWS: NROWS, NCOLS: NCOLS});
        return ret;
    }

    function getInfo() public view returns (GameInfo memory ret) {
        ret = GameInfo({
            turnNumber: turnNumber,
            sequenceNumber: sequenceNumber,
            gameState: gameState,
            player1: player1,
            player2: player2,
            player1Mana: player1Mana,
            player2Mana: player2Mana,
            player1HasDrawn: player1HasDrawn,
            player2HasDrawn: player2HasDrawn,
            player1HandCommit: player1HandCommit,
            player2HandCommit: player2HandCommit,
            lastTurnTimestamp: lastTurnTimestamp
        });
        return ret;
    }

    function getPieces() public view returns (Piece[] memory ret) {
        ret = new Piece[](pieceIds.length);
        for (uint8 i = 0; i < pieceIds.length; i++) {
            ret[i] = pieces[pieceIds[i]];
        }
        return ret;
    }

    function getDefaults()
        public
        view
        returns (PieceDefaultStats[] memory ret)
    {
        ret = new PieceDefaultStats[](6);
        // TODO hardcode bad >:(
        for (uint8 i = 0; i < 6; i++) {
            ret[i] = defaultStats[PieceType(i)];
        }
        return ret;
    }

    function getObjectives() public view returns (Objective[] memory ret) {
        ret = new Objective[](objectives.length);
        for (uint8 i = 0; i < objectives.length; i++) {
            ret[i] = objectives[i];
        }
        return ret;
    }

    function getCards() public view returns (CardPrototype[] memory ret) {
        ret = new CardPrototype[](cards.length);
        for (uint8 i = 0; i < cards.length; i++) {
            ret[i] = cards[i];
        }
        return ret;
    }

    //////////////
    /// Helper ///
    //////////////

    function checkAction(uint8 _turnNumber, uint16 _sequenceNumber)
        public
        view
        returns (bool)
    {
        return
            ZKChessUtils.checkAction(
                _turnNumber,
                turnNumber,
                _sequenceNumber,
                sequenceNumber,
                player1,
                player2,
                gameState
            );
    }

    function gameShouldBeCompleted() public view returns (bool) {
        return ZKChessUtils.gameShouldBeCompleted(pieces);
    }

    //////////////////////
    /// Game Mechanics ///
    //////////////////////

    function joinGame() public {
        require(
            gameState == GameState.WAITING_FOR_PLAYERS,
            "Game already started"
        );
        if (player1 == address(0)) {
            // first player to join game
            player1 = msg.sender;
            return;
        }
        // another player has joined. game is ready to start

        require(msg.sender != player1, "can't join game twice");
        // randomize player order
        if (block.timestamp % 2 == 0) {
            player2 = msg.sender;
        } else {
            player2 = player1;
            player1 = msg.sender;
        }

        // set pieces
        ZKChessInit.initializeMotherships(
            player1,
            player2,
            pieces,
            pieceIds,
            boardPieces,
            defaultStats
        );

        gameState = GameState.P1_TO_MOVE;
        turnNumber = 1;
        player1Mana = turnNumber;
        lastTurnTimestamp = block.timestamp;
        emit GameStart(player1, player2);
    }

    function doSummon(Summon memory summon) public {
        checkAction(summon.turnNumber, summon.sequenceNumber);
        require(!pieces[summon.pieceId].initialized, "piece ID already in use");

        uint8 availableMana = msg.sender == player1 ? player1Mana : player2Mana;
        uint8 homePieceId = msg.sender == player1 ? 1 : 2;
        require(
            ZKChessUtils.checkSummon(
                summon,
                homePieceId,
                availableMana,
                defaultStats,
                boardPieces,
                pieces,
                NROWS,
                NCOLS
            ),
            "invalid summon"
        );

        // create piece
        pieces[summon.pieceId] = Piece({
            id: summon.pieceId,
            pieceType: summon.pieceType,
            owner: msg.sender,
            row: summon.row,
            col: summon.col,
            alive: true,
            commitment: summon.zkp.input[0],
            initialized: true,
            hp: defaultStats[summon.pieceType].hp,
            atk: defaultStats[summon.pieceType].atk,
            lastMove: turnNumber,
            lastAttack: turnNumber
        });
        pieceIds.push(summon.pieceId);
        boardPieces[summon.row][summon.col] = summon.pieceId;
        // if piece has just been made, can't use it yet
        // in the future this should be tracked in its own field
        hasMoved[summon.turnNumber][summon.pieceId] = true;
        hasAttacked[summon.turnNumber][summon.pieceId] = true;

        if (msg.sender == player1) {
            player1Mana -= defaultStats[summon.pieceType].cost;
        } else if (msg.sender == player2) {
            player2Mana -= defaultStats[summon.pieceType].cost;
        }
        emit DidSummon(
            msg.sender,
            summon.pieceId,
            summon.sequenceNumber,
            summon.pieceType,
            summon.row,
            summon.col
        );
        sequenceNumber++;
    }

    function doMove(Move memory move) public {
        checkAction(move.turnNumber, move.sequenceNumber);
        Piece storage piece = pieces[move.pieceId];
        uint8 originRow = piece.row;
        uint8 originCol = piece.col;

        require(
            ZKChessUtils.checkMove(
                move,
                pieces,
                defaultStats,
                hasMoved,
                hasAttacked,
                boardPieces,
                NROWS,
                NCOLS
            ),
            "move failed"
        );

        if (defaultStats[piece.pieceType].isZk) {
            piece.commitment = move.zkp.input[1];
        } else {
            uint8[] memory moveToRow = move.moveToRow;
            uint8[] memory moveToCol = move.moveToCol;
            uint8 toRow = moveToRow[moveToRow.length - 1];
            uint8 toCol = moveToCol[moveToCol.length - 1];
            boardPieces[piece.row][piece.col] = 0;
            boardPieces[toRow][toCol] = piece.id;
            piece.row = toRow;
            piece.col = toCol;
        }
        hasMoved[move.turnNumber][piece.id] = true;
        piece.lastMove = move.turnNumber;
        emit DidMove(
            move.sequenceNumber,
            move.pieceId,
            originRow,
            originCol,
            piece.row,
            piece.col
        );
        sequenceNumber++;
    }

    function doAttack(Attack memory attack) public {
        checkAction(attack.turnNumber, attack.sequenceNumber);
        require(
            ZKChessUtils.checkAttack(
                attack,
                pieces,
                defaultStats,
                hasAttacked,
                NROWS,
                NCOLS
            ),
            "invalid attack"
        );

        ZKChessUtils.executeAttack(
            attack,
            pieces,
            boardPieces,
            defaultStats,
            hasAttacked
        );

        emit DidAttack(
            attack.sequenceNumber,
            attack.pieceId,
            attack.attackedId,
            pieces[attack.pieceId].hp,
            pieces[attack.attackedId].hp
        );
        sequenceNumber++;

        if (gameShouldBeCompleted()) {
            gameState = GameState.COMPLETE;
            emit GameFinished();
        }
    }

    function endTurn(uint8 _turnNumber, uint8 _sequenceNumber) public {
        lastTurnTimestamp = block.timestamp;
        checkAction(_turnNumber, _sequenceNumber);
        if (msg.sender == player1) {
            // change to p2's turn
            player1Mana = 0;
            player2Mana = turnNumber;
            if (player2Mana > 8) {
                player2Mana = 8;
            }
            for (uint8 i = 0; i < objectives.length; i++) {
                uint8 row = objectives[i].row;
                uint8 col = objectives[i].col;
                Piece storage occupyingPiece = pieces[boardPieces[row][col]];
                if (occupyingPiece.alive && occupyingPiece.owner == player2) {
                    player2Mana++;
                }
            }
            gameState = GameState.P2_TO_MOVE;
        } else {
            // change to p1's turn
            turnNumber++;
            player2Mana = 0;
            player1Mana = turnNumber;
            if (player1Mana > 8) {
                player1Mana = 8;
            }
            for (uint8 i = 0; i < objectives.length; i++) {
                uint8 row = objectives[i].row;
                uint8 col = objectives[i].col;
                Piece storage occupyingPiece = pieces[boardPieces[row][col]];
                if (occupyingPiece.alive && occupyingPiece.owner == player1) {
                    player1Mana++;
                }
            }
            gameState = GameState.P1_TO_MOVE;
        }
        emit DidEndTurn(msg.sender, _turnNumber, _sequenceNumber);
        sequenceNumber++;

        if (gameShouldBeCompleted()) {
            gameState = GameState.COMPLETE;
            emit GameFinished();
        }
    }
}
