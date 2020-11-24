pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "./ZKChessTypes.sol";
import "./ZKChessInit.sol";
import "./ZKChessChecks.sol";
import "./ZKChessActions.sol";

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
    CardPrototype[7] public cards;
    uint8 public constant cardPlayCost = 2;

    mapping(PieceType => PieceDefaultStats) public defaultStats;

    Player public player1;
    Player public player2;

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

        player1
            .handCommit = 16227963524034219233279650312501310147918176407385833422019760797222680144279;
        player2
            .handCommit = 16227963524034219233279650312501310147918176407385833422019760797222680144279;

        // initialize pieces
        ZKChessInit.initializeDefaults(defaultStats);
        ZKChessInit.initializeObjectives(objectives);
        ZKChessInit.initializeCards(cards);
    }

    //////////////
    /// EVENTS ///
    //////////////

    event GameStart(address p1, address p2);
    event DidCardDraw(address playerAddr, uint16 sequenceNumber);
    event DidCardPlay(
        address playerAddr,
        uint8 pieceId,
        uint8 cardId,
        uint16 sequenceNumber
    );
    event DidSummon(
        address playerAddr,
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
    event DidEndTurn(
        address playerAddr,
        uint8 turnNumber,
        uint16 sequenceNumber
    );
    event GameFinished();

    ///////////////
    /// GETTERS ///
    ///////////////

    function getMetadata() public view returns (GameMetadata memory ret) {
        ret = GameMetadata({
            gameId: gameId,
            NROWS: NROWS,
            NCOLS: NCOLS,
            player1: player1.addr,
            player2: player2.addr,
            player1SeedCommit: player1.seedCommit,
            player2SeedCommit: player2.seedCommit
        });
        return ret;
    }

    function getInfo() public view returns (GameInfo memory ret) {
        ret = GameInfo({
            turnNumber: turnNumber,
            sequenceNumber: sequenceNumber,
            gameState: gameState,
            player1Mana: player1.mana,
            player2Mana: player2.mana,
            player1HasDrawn: player1.hasDrawn,
            player2HasDrawn: player2.hasDrawn,
            player1HandCommit: player1.handCommit,
            player2HandCommit: player2.handCommit,
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
            ZKChessChecks.checkAction(
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
        return ZKChessActions.gameShouldBeCompleted(pieces);
    }

    //////////////////////
    /// Game Mechanics ///
    //////////////////////

    function joinGame(uint256 seedCommit) public {
        require(
            gameState == GameState.WAITING_FOR_PLAYERS,
            "Game already started"
        );
        if (player1.addr == address(0)) {
            // first player to join game
            player1.addr = msg.sender;
            player1.seedCommit = seedCommit;
            return;
        }
        // another player has joined. game is ready to start

        require(msg.sender != player1.addr, "can't join game twice");
        // randomize player order
        if (block.timestamp % 2 == 0) {
            player2.addr = msg.sender;
            player2.seedCommit = seedCommit;
        } else {
            player2.addr = player1.addr;
            player2.seedCommit = player1.seedCommit;
            player1.addr = msg.sender;
            player1.seedCommit = seedCommit;
        }

        // set pieces
        ZKChessInit.initializeMotherships(
            player1.addr,
            player2.addr,
            pieces,
            pieceIds,
            boardPieces,
            defaultStats
        );

        gameState = GameState.P1_TO_MOVE;
        turnNumber = 1;
        player1.mana = turnNumber;
        lastTurnTimestamp = block.timestamp;
        emit GameStart(player1.addr, player2.addr);
    }

    function doCardDraw(CardDraw memory cardDraw) public {
        checkAction(cardDraw.turnNumber, cardDraw.sequenceNumber);
        require(
            ZKChessChecks.checkCardDraw(
                cardDraw,
                player1,
                player2,
                lastTurnTimestamp
            ),
            "not valid card draw"
        );
        if (msg.sender == player1.addr) {
            player1.handCommit = cardDraw.zkp.input[2];
            player1.hasDrawn = true;
        } else {
            player2.handCommit = cardDraw.zkp.input[2];
            player2.hasDrawn = true;
        }
        emit DidCardDraw(msg.sender, sequenceNumber);
        sequenceNumber++;
    }

    function doCardPlay(CardPlay memory cardPlay) public {
        checkAction(cardPlay.turnNumber, cardPlay.sequenceNumber);
        require(
            ZKChessChecks.checkCardPlay(
                cardPlay,
                player1,
                player2,
                pieces,
                cardPlayCost
            ),
            "not valid card play"
        );

        ZKChessActions.executeCardPlay(
            cardPlay,
            pieces,
            boardPieces,
            defaultStats,
            player1,
            player2,
            cards,
            cardPlayCost
        );

        emit DidCardPlay(
            msg.sender,
            cardPlay.pieceId,
            uint8(cardPlay.zkp.input[2]),
            sequenceNumber
        );
        sequenceNumber++;

        if (gameShouldBeCompleted()) {
            gameState = GameState.COMPLETE;
            emit GameFinished();
        }
    }

    function doSummon(Summon memory summon) public {
        checkAction(summon.turnNumber, summon.sequenceNumber);

        uint8 availableMana = msg.sender == player1.addr
            ? player1.mana
            : player2.mana;
        uint8 homePieceId = msg.sender == player1.addr ? 1 : 2;
        require(
            ZKChessChecks.checkSummon(
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

        ZKChessActions.executeSummon(
            summon,
            player1,
            player2,
            boardPieces,
            pieceIds,
            pieces,
            defaultStats,
            hasMoved,
            hasAttacked,
            turnNumber
        );

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
            ZKChessChecks.checkMove(
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

        ZKChessActions.executeMove(
            move,
            pieces,
            boardPieces,
            defaultStats,
            hasMoved
        );
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
            ZKChessChecks.checkAttack(
                attack,
                pieces,
                defaultStats,
                hasAttacked,
                NROWS,
                NCOLS
            ),
            "invalid attack"
        );

        ZKChessActions.executeAttack(
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
        // change value vars
        if (msg.sender == player1.addr) {
            gameState = GameState.P2_TO_MOVE;
        } else {
            turnNumber++;
            gameState = GameState.P1_TO_MOVE;
        }
        // change ref vars
        ZKChessActions.executeEndTurn(
            player1,
            player2,
            objectives,
            pieces,
            boardPieces,
            turnNumber
        );

        emit DidEndTurn(msg.sender, _turnNumber, _sequenceNumber);
        sequenceNumber++;
    }
}
