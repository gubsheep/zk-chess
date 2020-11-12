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
        return true;
    }

    function isValidMove(
        Piece memory piece,
        uint8[] memory toRow,
        uint8[] memory toCol,
        uint8[][] storage boardPieces,
        mapping(uint8 => Piece) storage pieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        uint256 BOARD_SIZE
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

    function gameShouldBeCompleted(
        uint8[] storage pieceIds,
        mapping(uint8 => Piece) storage pieces,
        address player1,
        address player2
    ) public view returns (bool) {
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

    function checkAttack(
        Attack memory attack,
        mapping(uint8 => Piece) storage pieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasAttacked,
        uint256 BOARD_SIZE
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
                attack.zkp.input[3] <= defaultStats[piece.pieceType].mvRange,
                "out of attack range"
            );
            require(attack.zkp.input[4] == BOARD_SIZE, "ZKP invalid");
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
            require(
                taxiDist(piece.row, piece.col, attacked.row, attacked.col) <=
                    defaultStats[piece.pieceType].atkRange,
                "not in attack range"
            );
        }
        return true;
    }

    function executeAttack(
        Attack memory attack,
        mapping(uint8 => Piece) storage pieces,
        uint8[][] storage boardPieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasAttacked,
        uint256 BOARD_SIZE
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
            if (
                taxiDist(piece.row, piece.col, attacked.row, attacked.col) <=
                defaultStats[attacked.pieceType].atkRange
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
    }
}
