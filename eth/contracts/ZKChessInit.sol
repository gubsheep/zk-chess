// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./Hasher.sol";
import "./ZKChessTypes.sol";
import "./Verifier.sol";
import "hardhat/console.sol";

library ZKChessInit {
    function initializeDefaults(
        mapping(PieceType => PieceDefaultStats) storage defaultStats
    ) public {
        defaultStats[PieceType.MOTHERSHIP_00] = PieceDefaultStats({
            pieceType: PieceType.MOTHERSHIP_00,
            mvRange: 0,
            atkMinRange: 0,
            atkMaxRange: 2,
            hp: 20,
            atk: 2,
            isZk: false,
            cost: 100,
            kamikaze: false
        });
        defaultStats[PieceType.CRUISER_01] = PieceDefaultStats({
            pieceType: PieceType.CRUISER_01,
            mvRange: 2,
            atkMinRange: 1,
            atkMaxRange: 1,
            hp: 3,
            atk: 2,
            isZk: false,
            cost: 1,
            kamikaze: false
        });
        defaultStats[PieceType.FRIGATE_02] = PieceDefaultStats({
            pieceType: PieceType.FRIGATE_02,
            mvRange: 2,
            atkMinRange: 2,
            atkMaxRange: 2,
            hp: 3,
            atk: 2,
            isZk: false,
            cost: 2,
            kamikaze: false
        });
        defaultStats[PieceType.CORVETTE_03] = PieceDefaultStats({
            pieceType: PieceType.CORVETTE_03,
            mvRange: 4,
            atkMinRange: 1,
            atkMaxRange: 1,
            hp: 3,
            atk: 2,
            isZk: false,
            cost: 3,
            kamikaze: false
        });
        defaultStats[PieceType.SUBMARINE_04] = PieceDefaultStats({
            pieceType: PieceType.SUBMARINE_04,
            mvRange: 1,
            atkMinRange: 0,
            atkMaxRange: 0,
            hp: 1,
            atk: 3,
            isZk: true,
            cost: 4,
            kamikaze: true
        });
        defaultStats[PieceType.WARSHIP_05] = PieceDefaultStats({
            pieceType: PieceType.WARSHIP_05,
            mvRange: 1,
            atkMinRange: 2,
            atkMaxRange: 3,
            hp: 2,
            atk: 3,
            isZk: false,
            cost: 5,
            kamikaze: false
        });
    }

    function initializeObjectives(Objective[] storage objectives) public {
        objectives.push(Objective({row: 0, col: 3}));
        objectives.push(Objective({row: 2, col: 4}));
        objectives.push(Objective({row: 4, col: 3}));
    }

    function initializeCards(CardPrototype[7] storage cards) public {
        cards[0] = CardPrototype({id: 0, atkBuff: 0, damage: 0, heal: 0});
        cards[1] = CardPrototype({id: 1, atkBuff: 1, damage: 0, heal: 0});
        cards[2] = CardPrototype({id: 2, atkBuff: 2, damage: 0, heal: 0});
        cards[3] = CardPrototype({id: 3, atkBuff: 0, damage: 1, heal: 0});
        cards[4] = CardPrototype({id: 4, atkBuff: 0, damage: 2, heal: 0});
        cards[5] = CardPrototype({id: 5, atkBuff: 0, damage: 0, heal: 1});
        cards[6] = CardPrototype({id: 6, atkBuff: 0, damage: 0, heal: 2});
    }

    function initializeMotherships(
        address player1,
        address player2,
        mapping(uint8 => Piece) storage pieces,
        uint8[] storage pieceIds,
        uint8[][] storage boardPieces,
        mapping(PieceType => PieceDefaultStats) storage defaultStats
    ) public {
        pieces[1] = Piece({
            id: 1,
            pieceType: PieceType.MOTHERSHIP_00,
            owner: player1,
            row: 2,
            col: 0,
            alive: true,
            commitment: 0,
            initialized: true,
            hp: defaultStats[PieceType.MOTHERSHIP_00].hp,
            atk: defaultStats[PieceType.MOTHERSHIP_00].atk,
            lastMove: 0,
            lastAttack: 0
        });
        pieceIds.push(1);
        boardPieces[2][0] = 1;
        pieces[2] = Piece({
            id: 2,
            pieceType: PieceType.MOTHERSHIP_00,
            owner: player2,
            row: 2,
            col: 6,
            alive: true,
            commitment: 0,
            initialized: true,
            hp: defaultStats[PieceType.MOTHERSHIP_00].hp,
            atk: defaultStats[PieceType.MOTHERSHIP_00].atk,
            lastMove: 0,
            lastAttack: 0
        });
        pieceIds.push(2);
        boardPieces[2][6] = 2;
        return;
    }
}
