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
    bool alive; // only for non-ghosts
    uint256 commitment; // only for ghosts
}

struct Objective {
    uint8 id;
    uint8 value;
    uint8 row;
    uint8 col;
    address capturedBy;
}

struct MoveZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[2] input; // start, end
}

struct AttackZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[4] input; // start, endRow, endCol, dist
}

struct Action {
    uint8 turnNumber;
    uint8 pieceId;
    bool doesMove;
    uint8[] moveToRow;
    uint8[] moveToCol;
    bool doesAttack;
    uint8 attackRow;
    uint8 attackCol;
    MoveZKP moveZkp;
    AttackZKP attackZkp;
}
