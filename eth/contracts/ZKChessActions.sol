// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./ZKChessTypes.sol";
import "./Verifier.sol";
import "hardhat/console.sol";

library ZKChessActions {
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

    function executeSummon(
        Summon memory summon,
        Player storage player1,
        Player storage player2,
        uint8[][] storage boardPieces,
        uint8[] storage pieceIds,
        mapping(uint8 => Piece) storage pieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasMoved,
        mapping(uint8 => mapping(uint8 => bool)) storage hasAttacked,
        uint8 turnNumber
    ) public {
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

        if (msg.sender == player1.addr) {
            player1.mana -= defaultStats[summon.pieceType].cost;
        } else if (msg.sender == player2.addr) {
            player2.mana -= defaultStats[summon.pieceType].cost;
        }
    }

    function gameShouldBeCompleted(mapping(uint8 => Piece) storage pieces)
        public
        view
        returns (bool)
    {
        // check if game is over: at least one player has no pieces left
        return !pieces[1].alive || !pieces[2].alive;
    }

    function checkCardPlay(
        CardPlay memory cardPlay,
        Player storage player1,
        Player storage player2,
        mapping(uint8 => Piece) storage pieces
    ) public view returns (bool) {
        uint8 availableMana = (msg.sender == player1.addr)
            ? player1.mana
            : player2.mana;
        uint256 oldHandCommit = (msg.sender == player1.addr)
            ? player1.handCommit
            : player2.handCommit;
        require(availableMana >= 3, "not enough mana");
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

    function executeCardPlay(
        CardPlay memory cardPlay,
        mapping(uint8 => Piece) storage pieces,
        uint8[][] storage boardPieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        Player storage player1,
        Player storage player2,
        CardPrototype[7] storage cards
    ) public {
        Piece storage piece = pieces[cardPlay.pieceId];
        CardPrototype storage card = cards[cardPlay.zkp.input[2]];
        piece.atk += card.atkBuff;
        piece.hp += card.heal;
        if (card.damage >= piece.hp) {
            piece.hp = 0;
            piece.alive = false;
            if (!defaultStats[piece.pieceType].isZk) {
                boardPieces[piece.row][piece.col] = 0;
            }
        } else {
            piece.hp -= card.damage;
        }
        if (msg.sender == player1.addr) {
            player1.mana -= 3;
        } else {
            player2.mana -= 3;
        }
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

    function executeMove(
        Move memory move,
        mapping(uint8 => Piece) storage pieces,
        uint8[][] storage boardPieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats,
        mapping(uint8 => mapping(uint8 => bool)) storage hasMoved
    ) public {
        Piece storage piece = pieces[move.pieceId];
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

    function executeEndTurn(
        Player storage player1,
        Player storage player2,
        Objective[] storage objectives,
        mapping(uint8 => Piece) storage pieces,
        uint8[][] storage boardPieces,
        uint8 turnNumber
    ) public {
        if (msg.sender == player1.addr) {
            // change to p2's turn
            player1.mana = 0;
            player2.mana = turnNumber;
            if (player2.mana > 8) {
                player2.mana = 8;
            }
            for (uint8 i = 0; i < objectives.length; i++) {
                uint8 row = objectives[i].row;
                uint8 col = objectives[i].col;
                Piece storage occupyingPiece = pieces[boardPieces[row][col]];
                if (
                    occupyingPiece.alive && occupyingPiece.owner == player2.addr
                ) {
                    player2.mana++;
                }
            }
        } else {
            // change to p1's turn
            player1.hasDrawn = false;
            player2.hasDrawn = false;
            player2.mana = 0;
            player1.mana = turnNumber;
            if (player1.mana > 8) {
                player1.mana = 8;
            }
            for (uint8 i = 0; i < objectives.length; i++) {
                uint8 row = objectives[i].row;
                uint8 col = objectives[i].col;
                Piece storage occupyingPiece = pieces[boardPieces[row][col]];
                if (
                    occupyingPiece.alive && occupyingPiece.owner == player1.addr
                ) {
                    player1.mana++;
                }
            }
        }
    }
}
