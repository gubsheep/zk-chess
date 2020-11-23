// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./ZKChessTypes.sol";
import "./Verifier.sol";
import "hardhat/console.sol";

library ZKChessChecks {
    // this function is in both ZKCActions and ZKCChecks bc if we try to
    // call it from another library, we'll get stack too deep error >:(
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
        Player storage player1,
        Player storage player2,
        GameState gameState
    ) public view returns (bool) {
        require(
            msg.sender == player1.addr || msg.sender == player2.addr,
            "Not registered for this game"
        );
        require(gameState != GameState.COMPLETE, "Game is ended");
        if (msg.sender == player1.addr) {
            require(gameState == GameState.P1_TO_MOVE, "Not p1's turn");
        }
        if (msg.sender == player2.addr) {
            require(gameState == GameState.P2_TO_MOVE, "Not p2's turn");
        }
        require(claimedTurnNumber == turnNumber, "Wrong turn number");

        require(
            claimedSequenceNumber == sequenceNumber,
            "Wrong sequence number"
        );
        return true;
    }

    function checkCardDraw(
        CardDraw memory cardDraw,
        Player storage player1,
        Player storage player2,
        uint256 lastTurnTimestamp
    ) public view returns (bool) {
        if (msg.sender == player1.addr) {
            require(!player1.hasDrawn, "already drew a card!");
        } else {
            require(!player2.hasDrawn, "already drew a card!");
        }
        uint256 seedCommit = (msg.sender == player1.addr)
            ? player1.seedCommit
            : player2.seedCommit;
        uint256 oldHandCommit = (msg.sender == player1.addr)
            ? player1.handCommit
            : player2.handCommit;
        require(cardDraw.zkp.input[0] == seedCommit, "wrong seed commit");
        require(cardDraw.zkp.input[1] == oldHandCommit, "wrong hand commit");
        require(cardDraw.zkp.input[3] == lastTurnTimestamp, "wrong timestamp");
        require(
            Verifier.verifyCardDrawProof(
                cardDraw.zkp.a,
                cardDraw.zkp.b,
                cardDraw.zkp.c,
                cardDraw.zkp.input
            ),
            "bad ZKP"
        );
        return true;
    }

    function checkCardPlay(
        CardPlay memory cardPlay,
        Player storage player1,
        Player storage player2,
        mapping(uint8 => Piece) storage pieces,
        uint8 cardPlayCost
    ) public view returns (bool) {
        uint8 availableMana = (msg.sender == player1.addr)
            ? player1.mana
            : player2.mana;
        uint256 oldHandCommit = (msg.sender == player1.addr)
            ? player1.handCommit
            : player2.handCommit;
        require(availableMana >= cardPlayCost, "not enough mana");
        require(pieces[cardPlay.pieceId].alive, "piece dead");
        require(cardPlay.zkp.input[0] == oldHandCommit, "wrong hand commit");
        /*
        require(
            Verifier.verifyCardPlayProof(
                cardDraw.zkp.a,
                cardDraw.zkp.b,
                cardDraw.zkp.c,
                cardDraw.zkp.input
            ),
            "bad ZKP"
        );
        */
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
        require(!pieces[summon.pieceId].initialized, "piece ID already in use");
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
                "bad port coords"
            );
            require(summon.zkp.input[3] == 1, "not adjacent to port");
            require(summon.zkp.input[4] == NROWS, "wrong nrows");
            require(summon.zkp.input[5] == NCOLS, "wrong ncols");
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
}
