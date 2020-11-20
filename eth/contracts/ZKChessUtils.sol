// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./Hasher.sol";
import "./ZKChessTypes.sol";
import "./Verifier.sol";
import "hardhat/console.sol";

library ZKChessUtils {
    function hashTriple(
        uint256 val1,
        uint256 val2,
        uint256 val3,
        uint256 FIELD_SIZE
    ) public pure returns (uint256) {
        uint256 R = 0;
        uint256 C = 0;

        R = addmod(R, val1, FIELD_SIZE);
        (R, C) = Hasher.MiMCSponge(R, C, 0);
        R = addmod(R, val2, FIELD_SIZE);
        (R, C) = Hasher.MiMCSponge(R, C, 0);
        R = addmod(R, val3, FIELD_SIZE);
        (R, C) = Hasher.MiMCSponge(R, C, 0);

        return R;
    }

    function taxiDist(
        uint8 row1,
        uint8 col1,
        uint8 row2,
        uint8 col2
    ) public pure returns (uint8) {
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

    function checkAction(
        uint8 claimedTurnNumber,
        uint8 turnNumber,
        uint16 claimedSequenceNumber,
        uint16 sequenceNumber,
        address player1,
        address player2,
        GameState gameState
    ) public view returns (bool) {
        require(
            msg.sender == player1 || msg.sender == player2,
            "Not registered for this game"
        );
        require(gameState != GameState.COMPLETE, "Game is ended");
        if (msg.sender == player1) {
            require(gameState == GameState.P1_TO_MOVE, "Not p1's turn");
        }
        if (msg.sender == player2) {
            require(gameState == GameState.P2_TO_MOVE, "Not p2's turn");
        }
        require(claimedTurnNumber == turnNumber, "Wrong turn number");

        require(
            claimedSequenceNumber == sequenceNumber,
            "Wrong sequence number"
        );
        return true;
    }

    function checkSummon(
        Summon memory summon,
        uint8 homePieceId,
        uint8 availableMana,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        uint8[][] storage boardPieces,
        mapping(uint8 => Piece) storage pieces,
        uint8 NROWS,
        uint8 NCOLS
    ) public view returns (bool) {
        uint8 homeRow = pieces[homePieceId].row;
        uint8 homeCol = pieces[homePieceId].col;

        // MANA checks
        require(
            availableMana >= defaultStats[summon.pieceType].cost,
            "not enough mana"
        );

        if (!defaultStats[summon.pieceType].isZk) {
            require(summon.row < NROWS && summon.col < NCOLS, "not in bounds");
            // if visible piece, can't summon on existing piece
            uint8 pieceIdAtSummonTile = boardPieces[summon.row][summon.col];
            Piece storage pieceAtSummonTile = pieces[pieceIdAtSummonTile];
            require(!pieceAtSummonTile.alive, "can't summon there");
            // must summon adjacent to the PORT tile
            require(
                taxiDist(summon.row, summon.col, homeRow, homeCol) == 1,
                "can't summon there"
            );
        } else {
            require(
                summon.zkp.input[1] == homeRow &&
                    summon.zkp.input[2] == homeCol,
                "bad ZKP"
            );
            require(summon.zkp.input[3] == 1, "bad ZKP");
            require(summon.zkp.input[4] == NROWS, "bad ZKP");
            require(summon.zkp.input[5] == NCOLS, "bad ZKP");
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
        return true;
    }

    function isValidMove(
        Piece memory piece,
        uint8[] memory toRow,
        uint8[] memory toCol,
        uint8[][] storage boardPieces,
        mapping(uint8 => Piece) storage pieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        uint8 NROWS,
        uint8 NCOLS
    ) public view returns (bool) {
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
                nextRow < NROWS || nextCol < NCOLS,
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

    function gameShouldBeCompleted(mapping(uint8 => Piece) storage pieces)
        public
        view
        returns (bool)
    {
        // check if game is over: at least one player has no pieces left
        return !pieces[1].alive || !pieces[2].alive;
    }

    function checkMove(
        Move memory move,
        mapping(uint8 => Piece) storage pieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasMoved,
        mapping(uint8 => mapping(uint8 => bool)) storage hasAttacked,
        uint8[][] storage boardPieces,
        uint8 NROWS,
        uint8 NCOLS
    ) public view returns (bool) {
        Piece storage piece = pieces[move.pieceId];
        require(
            piece.owner == msg.sender && piece.owner != address(0),
            "can't move that"
        );
        require(piece.alive, "piece dead");
        require(!hasMoved[move.turnNumber][piece.id], "already moved");
        require(!hasAttacked[move.turnNumber][piece.id], "already acted");
        if (defaultStats[piece.pieceType].isZk) {
            require(piece.commitment == move.zkp.input[0], "bad ZKP");
            require(move.zkp.input[3] == NROWS, "bad ZKP");
            require(move.zkp.input[4] == NCOLS, "bad ZKP");
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
        } else {
            uint8[] memory moveToRow = move.moveToRow;
            uint8[] memory moveToCol = move.moveToCol;
            require(
                isValidMove(
                    piece,
                    moveToRow,
                    moveToCol,
                    boardPieces,
                    pieces,
                    defaultStats,
                    NROWS,
                    NCOLS
                ),
                "Invalid move"
            );
        }
        return true;
    }

    function checkAttack(
        Attack memory attack,
        mapping(uint8 => Piece) storage pieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasAttacked,
        uint8 NROWS,
        uint8 NCOLS
    ) public view returns (bool) {
        Piece storage piece = pieces[attack.pieceId];
        Piece storage attacked = pieces[attack.attackedId];
        require(
            piece.owner == msg.sender && piece.owner != address(0),
            "can't attack with opponent's piece"
        );
        require(piece.alive, "Piece is dead");
        require(
            !hasAttacked[attack.turnNumber][piece.id],
            "piece already attacked"
        );
        require(attacked.owner != msg.sender, "can't attack own piece");
        require(
            !defaultStats[attacked.pieceType].isZk,
            "can't attack submarines"
        );
        console.log(attacked.id);
        require(attacked.alive, "attacked piece doesn't exist");

        if (defaultStats[piece.pieceType].isZk) {
            require(piece.commitment == attack.zkp.input[0], "ZKP invalid");
            require(
                attacked.row == attack.zkp.input[1] &&
                    attacked.col == attack.zkp.input[2],
                "ZKP invalid"
            );
            require(
                attack.zkp.input[3] >=
                    defaultStats[piece.pieceType].atkMinRange &&
                    attack.zkp.input[3] <=
                    defaultStats[piece.pieceType].atkMaxRange,
                "out of range"
            );
            require(attack.zkp.input[4] == NROWS, "ZKP invalid");
            require(attack.zkp.input[5] == NCOLS, "ZKP invalid");
            require(
                Verifier.verifyDist1Proof(
                    attack.zkp.a,
                    attack.zkp.b,
                    attack.zkp.c,
                    attack.zkp.input
                ),
                "Failed zk attack check"
            );
        } else {
            uint8 distance = taxiDist(
                piece.row,
                piece.col,
                attacked.row,
                attacked.col
            );
            require(
                distance >= defaultStats[piece.pieceType].atkMinRange &&
                    distance <= defaultStats[piece.pieceType].atkMaxRange,
                "out of range"
            );
        }
        return true;
    }

    function executeAttack(
        Attack memory attack,
        mapping(uint8 => Piece) storage pieces,
        uint8[][] storage boardPieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasAttacked
    ) public {
        Piece storage piece = pieces[attack.pieceId];
        Piece storage attacked = pieces[attack.attackedId];
        // update attacked piece
        uint8 dmg = defaultStats[piece.pieceType].atk;
        if (dmg >= attacked.hp) {
            attacked.hp = 0;
            attacked.alive = false;
            boardPieces[attacked.row][attacked.col] = 0;
        } else {
            attacked.hp -= dmg;
        }

        // update attacking piece
        uint8 selfDmg = 0;
        if (!defaultStats[piece.pieceType].isZk) {
            uint8 distance = taxiDist(
                piece.row,
                piece.col,
                attacked.row,
                attacked.col
            );
            if (
                distance >= defaultStats[attacked.pieceType].atkMinRange &&
                distance <= defaultStats[attacked.pieceType].atkMaxRange
            ) {
                selfDmg += defaultStats[piece.pieceType].atk;
            }
        }
        if (defaultStats[piece.pieceType].kamikaze) {
            selfDmg = piece.hp;
        }

        if (selfDmg >= piece.hp) {
            piece.hp = 0;
            piece.alive = false;
            if (!defaultStats[piece.pieceType].isZk) {
                boardPieces[piece.row][piece.col] = 0;
            }
        } else {
            piece.hp -= selfDmg;
        }

        hasAttacked[attack.turnNumber][piece.id] = true;
        piece.lastAttack = attack.turnNumber;
    }
}
