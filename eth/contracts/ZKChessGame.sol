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

    uint8[] public pieceIds;
    mapping(uint8 => Piece) public pieces;

    mapping(PieceType => PieceDefaultStats) public defaultStats;

    bool public DISABLE_ZK_CHECK;

    address public player1;
    address public player2;

    // mapping from turn # -> piece # -> has acted
    mapping(uint8 => mapping(uint8 => bool)) public hasMoved;
    mapping(uint8 => mapping(uint8 => bool)) public hasAttacked;

    uint256 pfsVerified;

    function initialize(uint256 _gameId, bool _disableZKCheck) public {
        gameId = _gameId;
        DISABLE_ZK_CHECK = _disableZKCheck;
        gameState = GameState.WAITING_FOR_PLAYERS;

        // initialize pieces
        defaultStats[PieceType.KING] = PieceDefaultStats({
            pieceType: PieceType.KING,
            mvRange: 2,
            atkRange: 1,
            hp: 3,
            atk: 2,
            isZk: false
        });
        defaultStats[PieceType.KNIGHT] = PieceDefaultStats({
            pieceType: PieceType.KNIGHT,
            mvRange: 2,
            atkRange: 2,
            hp: 3,
            atk: 2,
            isZk: false
        });
        defaultStats[PieceType.GHOST] = PieceDefaultStats({
            pieceType: PieceType.GHOST,
            mvRange: 1,
            atkRange: 1,
            hp: 3,
            atk: 1,
            isZk: true
        });
        defaultStats[PieceType.PORT] = PieceDefaultStats({
            pieceType: PieceType.PORT,
            mvRange: 0,
            atkRange: 2,
            hp: 10,
            atk: 2,
            isZk: false
        });
    }

    //////////////
    /// EVENTS ///
    //////////////

    event ProofVerified(uint256 pfsAccepted);
    event GameStart(address p1, address p2);
    event ActionMade(address player);
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

    function taxiDist(
        uint8 row1,
        uint8 col1,
        uint8 row2,
        uint8 col2
    ) private pure returns (uint8) {
        uint8 ret = 0;
        if (row1 > row2) {
            ret += row1 - row2;
        } else {
            ret += row2 - row1;
        }
        if (col1 > col2) {
            ret += col1 - col2;
        } else {
            ret += col2 - col1;
        }
        return ret;
    }

    function isValidMove(
        Piece memory piece,
        uint8[] memory toRow,
        uint8[] memory toCol
    ) private view returns (bool) {
        uint8 currentRow = piece.row;
        uint8 currentCol = piece.col;
        require(toRow.length == toCol.length, "invalid move");
        require(
            toRow.length <= defaultStats[piece.pieceType].mvRange,
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
        // check if game is over: at least one player has no pieces left
        bool player1HasPiecesLeft = false;
        bool player2HasPiecesLeft = false;
        for (uint8 i = 0; i < pieceIds.length; i++) {
            Piece storage piece = pieces[pieceIds[i]];
            if (piece.owner == player1 && piece.alive) {
                player1HasPiecesLeft = true;
            } else if (piece.owner == player2 && piece.alive) {
                player2HasPiecesLeft = true;
            }
        }
        return !(player1HasPiecesLeft && player2HasPiecesLeft);
    }

    //////////////////////
    /// Game Mechanics ///
    //////////////////////

    function checkAction(uint8 _turnNumber) internal {
        require(gameState != GameState.COMPLETE, "Game is ended");
        if (msg.sender == player1) {
            require(gameState == GameState.P1_TO_MOVE, "Not p1's turn");
        }
        if (msg.sender == player2) {
            require(gameState == GameState.P2_TO_MOVE, "Not p2's turn");
        }
        require(_turnNumber == turnNumber, "Wrong turn number");
    }

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
            initializedOnTurn: 0
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
            initializedOnTurn: 0
        });
        pieceIds.push(2);
        boardPieces[6][3] = 2;

        gameState = GameState.P1_TO_MOVE;
        emit GameStart(player1, player2);
    }

    function doSummon(Summon memory summon) public {
        checkAction(summon.turnNumber);
        require(!pieces[summon.pieceId].initialized, "piece ID already in use");

        // PORT tile
        uint8 homeRow = 0;
        uint8 homeCol = 3;
        if (msg.sender == player2) {
            homeRow = 6;
        }
        if (!defaultStats[summon.pieceType].isZk) {
            require(
                summon.row < BOARD_SIZE && summon.col < BOARD_SIZE,
                "not in bounds"
            );
            // if visible piece, can't summon on existing piece
            uint8 pieceIdAtSummonTile = boardPieces[summon.row][summon.col];
            Piece storage pieceAtSummonTile = pieces[pieceIdAtSummonTile];
            require(
                !pieceAtSummonTile.alive,
                "tried to summon onto an existing piece"
            );
            // must summon adjacent to the PORT tile
            require(
                taxiDist(summon.row, summon.col, homeRow, homeCol) == 1,
                "can't summon there"
            );
        } else {
            if (!DISABLE_ZK_CHECK) {
                require(
                    summon.zkp.input[1] == homeRow &&
                        summon.zkp.input[2] == homeCol,
                    "invalid ZK proof: invalid port"
                );
                require(
                    summon.zkp.input[3] == 1,
                    "invalid ZK proof: can only summon next to port"
                );
                require(
                    summon.zkp.input[4] == BOARD_SIZE,
                    "invalid ZK proof: invalid board size"
                );
                require(
                    Verifier.verifyDist1Proof(
                        summon.zkp.a,
                        summon.zkp.b,
                        summon.zkp.c,
                        summon.zkp.input
                    ),
                    "Failed ZK summon check"
                );
            }
        }
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
            initializedOnTurn: turnNumber
        });
        pieceIds.push(summon.pieceId);
        boardPieces[summon.row][summon.col] = summon.pieceId;
        // if piece has just been made, can't use it yet
        // in the future this should be tracked in its own field
        hasMoved[summon.turnNumber][summon.pieceId] = true;
        hasAttacked[summon.turnNumber][summon.pieceId] = true;
        emit ActionMade(msg.sender);
    }

    function doMove(Move memory move) public {
        checkAction(move.turnNumber);
        Piece storage piece = pieces[move.pieceId];
        require(
            piece.owner == msg.sender && piece.owner != address(0),
            "can't move opponent's piece"
        );
        require(piece.alive, "Piece is dead");
        require(!hasMoved[move.turnNumber][piece.id], "piece already moved");
        require(!hasAttacked[move.turnNumber][piece.id], "piece already acted");

        if (defaultStats[piece.pieceType].isZk) {
            require(piece.commitment == move.zkp.input[0], "ZK Proof invalid");
            require(move.zkp.input[3] == BOARD_SIZE);
            // TODO: check that move is within pieceType's move range
            require(
                move.zkp.input[2] <= defaultStats[piece.pieceType].mvRange,
                "Tried to move too far"
            );
            if (!DISABLE_ZK_CHECK) {
                require(
                    Verifier.verifyDist2Proof(
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
        }
        hasMoved[move.turnNumber][piece.id] = true;
        emit ActionMade(msg.sender);
    }

    function endTurn(uint8 _turnNumber) public {
        checkAction(_turnNumber);
        if (msg.sender == player1) {
            // change to p2's turn
            gameState = GameState.P2_TO_MOVE;
        } else {
            // change to p1's turn
            turnNumber++;
            gameState = GameState.P1_TO_MOVE;
        }
        emit ActionMade(msg.sender);

        if (gameShouldBeCompleted()) {
            gameState = GameState.COMPLETE;
            emit GameFinished();
        }
    }
}
