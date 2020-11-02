pragma solidity ^0.6.7;

import "./ZKChessGame.sol";
import "./CloneFactory.sol";

contract ZKChessGameFactory is CloneFactory {
    address public implementationContract;

    mapping(uint256 => address) public gameIdToAddr;
    uint256[] gameIds;

    event CreatedGame(uint256 gameId);

    constructor(address _implementationContract) public {
        implementationContract = _implementationContract;
    }

    function createGame(uint256 gameId) public returns (address) {
        require(
            gameIdToAddr[gameId] == address(0),
            "game with that ID already exists"
        );
        address proxy = createClone(implementationContract);
        ZKChessGame(proxy).initialize(gameId, false);
        gameIds.push(gameId);
        gameIdToAddr[gameId] = proxy;
        emit CreatedGame(gameId);
        return proxy;
    }
}
