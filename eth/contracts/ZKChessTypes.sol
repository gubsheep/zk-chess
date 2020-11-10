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
    bool initialized;
}

struct Objective {
    uint8 id;
    uint8 value;
    uint8 row;
    uint8 col;
    address capturedBy;
}

struct SummonZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[5] input; // commitment, port row, port col, dist from port, boardsize
}

struct MoveZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[4] input; // commitment1, commitment2, dist, boardsize
}

struct AttackZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[5] input; // commitment, port x, port y, dist from port, boardsize
}

struct Summon {
    uint8 turnNumber;
    uint8 pieceId; // should be a fresh new ID
    PieceType pieceType;
    uint8 row; // for non-zk pieces
    uint8 col; // for non-zk pieces
    SummonZKP zkp;
}

struct Move {
    uint8 turnNumber;
    uint8 pieceId;
    uint8[] moveToRow;
    uint8[] moveToCol;
    MoveZKP zkp;
}

struct Attack {
    uint8 turnNumber;
    uint8 pieceId;
    uint8 attackRow;
    uint8 attackCol;
    AttackZKP zkp;
}
