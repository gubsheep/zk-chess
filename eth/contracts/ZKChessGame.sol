pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "./ZKChessTypes.sol";
import "./ZKChessUtils.sol";
import "./Verifier.sol";

contract ZKChessGame is Initializable {
    uint256 public constant BOARD_SIZE = 7;

    uint256 public gameId;

    uint8 public turnNumber;
    uint16 public sequenceNumber;
    GameState public gameState;
    uint8[][] public boardPieces; // board[row][col]

    uint8[] public pieceIds;
    mapping(uint8 => Piece) public pieces;

    mapping(PieceType => PieceDefaultStats) public defaultStats;

    address public player1;
    address public player2;

    uint8 public player1Mana;
    uint8 public player2Mana;

    // mapping from turn # -> piece # -> has acted
    mapping(uint8 => mapping(uint8 => bool)) public hasMoved;
    mapping(uint8 => mapping(uint8 => bool)) public hasAttacked;

    function initialize(uint256 _gameId) public {
        gameId = _gameId;
        gameState = GameState.WAITING_FOR_PLAYERS;

        for (uint8 i = 0; i < BOARD_SIZE; i++) {
            boardPieces.push();
            for (uint8 j = 0; j < BOARD_SIZE; j++) {
                boardPieces[i].push(0);
            }
        }

        // initialize pieces
        ZKChessUtils.initializeDefaults(defaultStats);
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
        ret = new PieceDefaultStats[](4);
        // TODO hardcode bad >:(
        for (uint8 i = 0; i < 4; i++) {
            ret[i] = defaultStats[PieceType(i)];
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

    function isValidMove(
        Piece memory piece,
        uint8[] memory toRow,
        uint8[] memory toCol
    ) private view returns (bool) {
        return
            ZKChessUtils.isValidMove(
                piece,
                toRow,
                toCol,
                boardPieces,
                pieces,
                defaultStats,
                BOARD_SIZE
            );
    }

    function gameShouldBeCompleted() public view returns (bool) {
        return
            ZKChessUtils.gameShouldBeCompleted(
                pieceIds,
                pieces,
                player1,
                player2
            );
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
        pieces[1] = Piece({
            id: 1,
            pieceType: PieceType.PORT,
            owner: player1,
            row: 0,
            col: 3,
            alive: true,
            commitment: 0,
            initialized: true,
            hp: defaultStats[PieceType.PORT].hp,
            initializedOnTurn: 0,
            lastMove: 0,
            lastAttack: 0
        });
        pieceIds.push(1);
        boardPieces[0][3] = 1;
        pieces[2] = Piece({
            id: 2,
            pieceType: PieceType.PORT,
            owner: player2,
            row: 6,
            col: 3,
            alive: true,
            commitment: 0,
            initialized: true,
            hp: defaultStats[PieceType.PORT].hp,
            initializedOnTurn: 0,
            lastMove: 0,
            lastAttack: 0
        });
        pieceIds.push(2);
        boardPieces[6][3] = 2;

        gameState = GameState.P1_TO_MOVE;
        turnNumber = 1;
        player1Mana = turnNumber;
        emit GameStart(player1, player2);
    }

    function doSummon(Summon memory summon) public {
        checkAction(summon.turnNumber, summon.sequenceNumber);
        require(!pieces[summon.pieceId].initialized, "piece ID already in use");

        // PORT tile
        uint8 homeRow;
        uint8 homeCol = 3;
        if (msg.sender == player1) {
            homeRow = 0;
        } else {
            homeRow = 6;
        }

        // MANA checks
        if (msg.sender == player1) {
            require(
                player1Mana >= defaultStats[summon.pieceType].cost,
                "not enough mana"
            );
            player1Mana -= defaultStats[summon.pieceType].cost;
        } else {
            require(
                player2Mana >= defaultStats[summon.pieceType].cost,
                "not enough mana"
            );
            player2Mana -= defaultStats[summon.pieceType].cost;
        }

        // validity checks
        if (!defaultStats[summon.pieceType].isZk) {
            require(
                summon.row < BOARD_SIZE && summon.col < BOARD_SIZE,
                "not in bounds"
            );
            // if visible piece, can't summon on existing piece
            uint8 pieceIdAtSummonTile = boardPieces[summon.row][summon.col];
            Piece storage pieceAtSummonTile = pieces[pieceIdAtSummonTile];
            require(!pieceAtSummonTile.alive, "can't summon there");
            // must summon adjacent to the PORT tile
            require(
                ZKChessUtils.taxiDist(
                    summon.row,
                    summon.col,
                    homeRow,
                    homeCol
                ) == 1,
                "can't summon there"
            );
        } else {
            require(
                summon.zkp.input[1] == homeRow &&
                    summon.zkp.input[2] == homeCol,
                "bad ZKP"
            );
            require(summon.zkp.input[3] == 1, "bad ZKP");
            require(summon.zkp.input[4] == BOARD_SIZE, "bad ZKP");
            require(
                Verifier.verifyDist1Proof(
                    summon.zkp.a,
                    summon.zkp.b,
                    summon.zkp.c,
                    summon.zkp.input
                ),
                "bad ZKP"
            );
        }

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
            initializedOnTurn: turnNumber,
            lastMove: turnNumber,
            lastAttack: turnNumber
        });
        pieceIds.push(summon.pieceId);
        boardPieces[summon.row][summon.col] = summon.pieceId;
        // if piece has just been made, can't use it yet
        // in the future this should be tracked in its own field
        hasMoved[summon.turnNumber][summon.pieceId] = true;
        hasAttacked[summon.turnNumber][summon.pieceId] = true;
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
        require(
            piece.owner == msg.sender && piece.owner != address(0),
            "can't move that"
        );
        require(piece.alive, "piece dead");
        require(!hasMoved[move.turnNumber][piece.id], "already moved");
        require(!hasAttacked[move.turnNumber][piece.id], "already acted");

        uint8 originRow = piece.row;
        uint8 originCol = piece.col;
        if (defaultStats[piece.pieceType].isZk) {
            require(piece.commitment == move.zkp.input[0], "bad ZKP");
            require(move.zkp.input[3] == BOARD_SIZE, "bad ZKP");
            require(
                move.zkp.input[2] <= defaultStats[piece.pieceType].mvRange,
                "bad ZKP"
            );
            require(
                Verifier.verifyDist2Proof(
                    move.zkp.a,
                    move.zkp.b,
                    move.zkp.c,
                    move.zkp.input
                ),
                "bad ZKP"
            );
            piece.commitment = move.zkp.input[1];
        } else {
            uint8[] memory moveToRow = move.moveToRow;
            uint8[] memory moveToCol = move.moveToCol;
            require(isValidMove(piece, moveToRow, moveToCol), "Invalid move");
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
                BOARD_SIZE
            ),
            "invalid attack"
        );

        ZKChessUtils.executeAttack(
            attack,
            pieces,
            boardPieces,
            defaultStats,
            hasAttacked,
            BOARD_SIZE
        );
        emit DidAttack(
            attack.sequenceNumber,
            attack.pieceId,
            attack.attackedId,
            pieces[attack.pieceId].hp,
            pieces[attack.attackedId].hp
        );
        sequenceNumber++;
    }

    function endTurn(uint8 _turnNumber, uint8 _sequenceNumber) public {
        checkAction(_turnNumber, _sequenceNumber);
        if (msg.sender == player1) {
            // change to p2's turn
            player1Mana = 0;
            player2Mana = turnNumber;
            if (player2Mana > 8) {
                player2Mana = 8;
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
