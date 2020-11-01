pragma solidity ^0.6.7;

import "./ZKChessGame.sol";
import "./CloneFactory.sol";

contract ZKChessGameFactory is CloneFactory {
    address public implementationContract;
    address public cloneAddress;

    constructor(address _implementationContract) public {
        implementationContract = _implementationContract;
    }

    function createGame() public returns (address) {
        address proxy = createClone(implementationContract);
        ZKChessGame(proxy).initialize(false);
        cloneAddress = proxy;
        return proxy;
    }
}
