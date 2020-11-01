// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.7;

import "./Hasher.sol";

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
}
