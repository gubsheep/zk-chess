pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

contract ZKChessStorage {
    address public adminAddress;
    bool public paused;
    bool public DISABLE_ZK_CHECK;

    uint256 pfsVerified;
}
