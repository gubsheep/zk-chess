// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;

enum GameState {WAITING_FOR_PLAYERS, P1_TO_MOVE, P2_TO_MOVE, COMPLETE}
enum PieceType {KING, KNIGHT, GHOST}

struct Piece {
    uint8 id;
    PieceType pieceType;
    address owner;
    uint8 row;
    uint8 col;
    bool dead; // only for non-ghosts
    uint256 commitment; // only for ghosts
}

struct Objective {
    uint8 id;
    uint8 value;
    uint8 row;
    uint8 col;
    address capturedBy;
}
