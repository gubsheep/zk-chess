// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;

enum GameState {WAITING_FOR_PLAYERS, P1_TO_MOVE, P2_TO_MOVE, COMPLETE}

// whenyou change this you have to change the client enum
// and also the hardcoded # in ZKChessGame.getDefaults
enum PieceType {
    MOTHERSHIP_00,
    CRUISER_01,
    FRIGATE_02,
    CORVETTE_03,
    SUBMARINE_04,
    WARSHIP_05
}

struct GameMetadata {
    uint256 gameId;
    uint8 NROWS;
    uint8 NCOLS;
    address player1;
    address player2;
    uint256 player1SeedCommit;
    uint256 player2SeedCommit;
}

struct GameInfo {
    uint8 turnNumber;
    uint16 sequenceNumber;
    GameState gameState;
    uint8 player1Mana;
    uint8 player2Mana;
    bool player1HasDrawn;
    bool player2HasDrawn;
    uint256 player1HandCommit;
    uint256 player2HandCommit;
    uint256 lastTurnTimestamp;
}

struct PieceDefaultStats {
    PieceType pieceType;
    uint8 mvRange;
    uint8 atkMinRange;
    uint8 atkMaxRange;
    uint8 hp;
    uint8 atk;
    uint8 cost;
    bool isZk;
    bool kamikaze;
}

struct CardPrototype {
    uint8 id;
    uint8 atkBuff;
    uint8 damage;
    uint8 heal;
}

struct Piece {
    uint8 id;
    PieceType pieceType;
    address owner;
    uint8 row;
    uint8 col;
    bool alive; // only for non-ghosts
    bool initialized;
    uint8 hp;
    uint8 atk;
    uint256 commitment; // only for ghosts
    uint8 lastMove;
    uint8 lastAttack;
}

struct Objective {
    uint8 row;
    uint8 col;
}

struct CardDrawZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[4] input; // seedcommit, new handcommit, old handcommit, lastTurnTimestamp
}

struct SummonZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[6] input; // commitment, port row, port col, dist from port, nrows, ncols
}

struct MoveZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[5] input; // commitment1, commitment2, dist, nrows, ncols
}

struct AttackZKP {
    uint256[2] a;
    uint256[2][2] b;
    uint256[2] c;
    uint256[6] input; // commitment, attacking x, attacking y, dist, nrows, ncols
}

struct CardDraw {
    uint8 turnNumber;
    uint16 sequenceNumber;
    CardDrawZKP zkp;
}

struct Summon {
    uint8 turnNumber;
    uint16 sequenceNumber;
    uint8 pieceId; // should be a fresh new ID
    PieceType pieceType;
    uint8 row; // for non-zk pieces
    uint8 col; // for non-zk pieces
    SummonZKP zkp;
}

struct Move {
    uint8 turnNumber;
    uint16 sequenceNumber;
    uint8 pieceId;
    uint8[] moveToRow;
    uint8[] moveToCol;
    MoveZKP zkp;
}

struct Attack {
    uint8 turnNumber;
    uint16 sequenceNumber;
    uint8 pieceId;
    uint8 attackedId;
    AttackZKP zkp;
}
