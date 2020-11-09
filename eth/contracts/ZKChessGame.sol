pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "./ZKChessTypes.sol";
import "./ZKChessUtils.sol";
import "./Verifier.sol";

contract ZKChessGame is Initializable {
    uint256
        public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256
        public constant GHOST_START_COMMITMENT = 7374563847362678215915084925243633004703986452179446109135597066279732561698;
    uint256 public constant BOARD_SIZE = 7;

    uint256 public gameId;

    uint8 public turnNumber;
    GameState public gameState;
    uint8[BOARD_SIZE][BOARD_SIZE] public boardPieces; // board[row][col]
    uint8[BOARD_SIZE][BOARD_SIZE] public boardObjectives;

    uint8[8] public pieceIds;
    mapping(uint8 => Piece) public pieces;
    uint8[6] public objectiveIds;
    mapping(uint8 => Objective) public objectives;

    bool public DISABLE_ZK_CHECK;

    address public player1;
    address public player2;

    uint8 public player1Score;
    uint8 public player2Score;

    uint8 p1CurrentlyCapturing;
    uint8 p2CurrentlyCapturing;

    // mapping from turn # -> piece # -> has acted
    mapping(uint8 => mapping(uint8 => bool)) public hasMoved;
    mapping(uint8 => mapping(uint8 => bool)) public hasAttacked;

    uint256 pfsVerified;

    function initialize(uint256 _gameId, bool _disableZKCheck) public {
        gameId = _gameId;
        DISABLE_ZK_CHECK = _disableZKCheck;
        gameState = GameState.WAITING_FOR_PLAYERS;

        pieceIds = [1, 2, 3, 4, 5, 6, 7, 8];
        objectiveIds = [9, 10, 11, 12, 13, 14];

        // initialize pieces
        pieces[1] = Piece({
            id: 1,
            pieceType: PieceType.KING,
            owner: address(0),
            row: 0,
            col: 1,
            alive: true,
            commitment: 0
        });
        boardPieces[0][1] = 1;
        pieces[2] = Piece({
            id: 2,
            pieceType: PieceType.KNIGHT,
            owner: address(0),
            row: 0,
            col: 3,
            alive: true,
            commitment: 0
        });
        boardPieces[0][3] = 2;
        pieces[3] = Piece({
            id: 3,
            pieceType: PieceType.KING,
            owner: address(0),
            row: 0,
            col: 5,
            alive: true,
            commitment: 0
        });
        boardPieces[0][5] = 3;
        pieces[4] = Piece({
            id: 4,
            pieceType: PieceType.GHOST,
            owner: address(0),
            row: 0,
            col: 0,
            alive: true,
            commitment: GHOST_START_COMMITMENT
        });
        pieces[5] = Piece({
            id: 5,
            pieceType: PieceType.KING,
            owner: address(0),
            row: 6,
            col: 1,
            alive: true,
            commitment: 0
        });
        boardPieces[6][1] = 5;
        pieces[6] = Piece({
            id: 6,
            pieceType: PieceType.KNIGHT,
            owner: address(0),
            row: 6,
            col: 3,
            alive: true,
            commitment: 0
        });
        boardPieces[6][3] = 6;
        pieces[7] = Piece({
            id: 7,
            pieceType: PieceType.KING,
            owner: address(0),
            row: 6,
            col: 5,
            alive: true,
            commitment: 0
        });
        boardPieces[6][5] = 7;
        pieces[8] = Piece({
            id: 8,
            pieceType: PieceType.GHOST,
            owner: address(0),
            row: 6,
            col: 0,
            alive: true,
            commitment: GHOST_START_COMMITMENT
        });

        // initialize objectives
        objectives[9] = Objective({
            id: 9,
            value: 5,
            row: 3,
            col: 0,
            capturedBy: address(0)
        });
        boardObjectives[3][0] = 9;
        objectives[10] = Objective({
            id: 10,
            value: 5,
            row: 2,
            col: 2,
            capturedBy: address(0)
        });
        boardObjectives[2][2] = 10;
        objectives[11] = Objective({
            id: 11,
            value: 10,
            row: 4,
            col: 2,
            capturedBy: address(0)
        });
        boardObjectives[4][2] = 11;
        objectives[12] = Objective({
            id: 12,
            value: 10,
            row: 2,
            col: 4,
            capturedBy: address(0)
        });
        boardObjectives[2][4] = 12;
        objectives[13] = Objective({
            id: 13,
            value: 5,
            row: 4,
            col: 4,
            capturedBy: address(0)
        });
        boardObjectives[4][4] = 13;
        objectives[14] = Objective({
            id: 14,
            value: 5,
            row: 3,
            col: 6,
            capturedBy: address(0)
        });
        boardObjectives[3][6] = 14;
    }

    //////////////
    /// EVENTS ///
    //////////////

    event ProofVerified(uint256 pfsAccepted);
    event GameStart(address p1, address p2);
    event MoveMade(address player);
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

    function getObjectives() public view returns (Objective[] memory ret) {
        ret = new Objective[](objectiveIds.length);
        for (uint8 i = 0; i < objectiveIds.length; i++) {
            ret[i] = objectives[objectiveIds[i]];
        }
        return ret;
    }

    //////////////
    /// Helper ///
    //////////////

    function isValidMove(
        Piece memory piece,
        uint8[] memory toRow,
        uint8[] memory toCol
    ) public view returns (bool) {
        uint8 currentRow = piece.row;
        uint8 currentCol = piece.col;
        require(toRow.length == toCol.length, "invalid move");
        uint8 moveRange = 0;
        if (piece.pieceType == PieceType.KING) {
            moveRange = 1;
        } else if (piece.pieceType == PieceType.KNIGHT) {
            moveRange = 2;
        }
        require(
            toRow.length <= moveRange,
            "tried to move piece further than range allows"
        );

        for (uint256 i = 0; i < toRow.length; i++) {
            uint8 nextRow = toRow[i];
            uint8 nextCol = toCol[i];
            // must be in range [0, SIZE - 1]
            require(
                nextRow < BOARD_SIZE || nextCol < BOARD_SIZE,
                "tried to move out of bounds"
            );
            // (nextRow, nextCol) must be adjacent to (currentRow, currentCol)
            require(
                (nextRow == currentRow || nextCol == currentCol) &&
                    (nextRow - currentRow == 1 ||
                        currentRow - nextRow == 1 ||
                        nextCol - currentCol == 1 ||
                        currentCol - nextCol == 1),
                "invalid move"
            );
            // can't move through or onto a square with a piece on it
            uint8 pieceIdAtNextTile = boardPieces[nextRow][nextCol];
            Piece storage pieceAtNextTile = pieces[pieceIdAtNextTile];
            require(
                !pieceAtNextTile.alive,
                "tried to move through an existing piece"
            );
            currentRow = nextRow;
            currentCol = nextCol;
        }
        return true;
    }

    function gameShouldBeCompleted() public view returns (bool) {
        // check if game is over: no pieces left, OR no objectives left
        bool noPiecesLeft = true;
        for (uint8 i = 0; i < pieceIds.length; i++) {
            if (pieces[pieceIds[i]].alive) {
                noPiecesLeft = false;
                break;
            }
        }
        if (noPiecesLeft) {
            return true;
        }

        bool noObjectivesLeft = true;
        for (uint8 i = 0; i < objectiveIds.length; i++) {
            if (objectives[objectiveIds[i]].capturedBy == address(0)) {
                noObjectivesLeft = false;
                break;
            }
        }
        if (noObjectivesLeft) {
            return true;
        }
        return false;
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
        for (uint8 i = 1; i < 5; i++) {
            pieces[i].owner = player1;
        }
        for (uint8 i = 5; i < 9; i++) {
            pieces[i].owner = player2;
        }

        gameState = GameState.P1_TO_MOVE;
        emit GameStart(player1, player2);
    }

    function doMove(Move memory move) public {
        require(gameState != GameState.COMPLETE, "Game is ended");
        if (msg.sender == player1) {
            require(gameState == GameState.P1_TO_MOVE, "Not p1's turn");
        }
        if (msg.sender == player2) {
            require(gameState == GameState.P2_TO_MOVE, "Not p2's turn");
        }
        require(move.turnNumber == turnNumber, "Wrong turn number");
        Piece storage piece = pieces[move.pieceId];
        require(
            piece.owner == msg.sender && piece.owner != address(0),
            "can't move opponent's piece"
        );
        require(piece.alive, "Piece is dead");
        require(!hasMoved[move.turnNumber][piece.id], "piece already moved");
        require(!hasAttacked[move.turnNumber][piece.id], "piece already acted");

        if (piece.pieceType == PieceType.GHOST) {
            require(piece.commitment == move.zkp.input[0], "ZK Proof invalid");
            if (!DISABLE_ZK_CHECK) {
                require(
                    Verifier.verifyMoveProof(
                        move.zkp.a,
                        move.zkp.b,
                        move.zkp.c,
                        move.zkp.input
                    ),
                    "Failed zk move check"
                );
            }
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
            if (
                objectives[boardObjectives[toRow][toCol]].value > 0 &&
                objectives[boardObjectives[toRow][toCol]].capturedBy ==
                address(0)
            ) {
                if (msg.sender == player1) {
                    p1CurrentlyCapturing = boardObjectives[toRow][toCol];
                } else {
                    p2CurrentlyCapturing = boardObjectives[toRow][toCol];
                }
            }
        }
        hasMoved[move.turnNumber][piece.id] = true;
    }

    function endTurn(uint8 _turnNumber) public {
        require(_turnNumber == turnNumber, "wrong turn number");
        if (msg.sender == player1) {
            // check if opponent captures any objectives
            Objective storage capturing = objectives[p2CurrentlyCapturing];
            if (capturing.value > 0 && capturing.capturedBy == address(0)) {
                // is an uncaptured objective
                Piece storage onObjective = pieces[boardPieces[capturing
                    .row][capturing.col]];
                if (onObjective.owner == player2 && onObjective.alive) {
                    // p2's live piece is stationed on top
                    capturing.capturedBy = player2;
                    player2Score += capturing.value;
                }
            }
            // change to p2's turn
            p2CurrentlyCapturing = 0;
            gameState = GameState.P2_TO_MOVE;
        } else {
            // check if opponent captures any objectives
            Objective storage capturing = objectives[p1CurrentlyCapturing];
            if (capturing.value > 0 && capturing.capturedBy == address(0)) {
                // is an uncaptured objective
                Piece storage onObjective = pieces[boardPieces[capturing
                    .row][capturing.col]];
                if (onObjective.owner == player1 && onObjective.alive) {
                    // p1's live piece is stationed on top
                    capturing.capturedBy = player1;
                    player1Score += capturing.value;
                }
            }
            // change to p1's turn
            p1CurrentlyCapturing = 0;
            turnNumber++;
            gameState = GameState.P1_TO_MOVE;
        }
        emit MoveMade(msg.sender);

        if (gameShouldBeCompleted()) {
            gameState = GameState.COMPLETE;
            emit GameFinished();
        }
    }
}
