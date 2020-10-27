pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

library Hasher {
    // this library is never actually deployed. rather, it serves as a
    // placeholder or "abstract library" so that contracts who depend on
    // https://github.com/iden3/circomlib/blob/master/src/mimcsponge_gencontract.js
    // can compile. the above bytecode should be deployed and linked to dependant
    // think of this like a poor man's header file
    function MiMCSponge(
        uint256 in_xL,
        uint256 in_xR,
        uint256 k
    ) public pure returns (uint256 xL, uint256 xR) {
        revert("UNIMPLEMENTED"); // should deploy library as bytecode
    }
}
