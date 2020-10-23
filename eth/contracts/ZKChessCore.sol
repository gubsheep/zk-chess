pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "./Verifier.sol";
import "./ZKChessStorage.sol";

// .______       _______     ___       _______  .___  ___.  _______
// |   _  \     |   ____|   /   \     |       \ |   \/   | |   ____|
// |  |_)  |    |  |__     /  ^  \    |  .--.  ||  \  /  | |  |__
// |      /     |   __|   /  /_\  \   |  |  |  ||  |\/|  | |   __|
// |  |\  \----.|  |____ /  _____  \  |  '--'  ||  |  |  | |  |____
// | _| `._____||_______/__/     \__\ |_______/ |__|  |__| |_______|
//
// READ THIS FIRST BEFORE EDITING ANYTHING IN THIS FILE:
// https://docs.openzeppelin.com/learn/upgrading-smart-contracts#limitations-of-contract-upgrades
//
// DO NOT ADD ANY STORAGE VARIABLES IN THIS FILE
// IT SHOULD BELONG AT STORAGE CONTRACTS
// ADDING STORAGE VARIABLES HERE WI LL BLOCK ANY STORAGE CONTRACTS FROM EVER
// ADDING THEIR OWN VARIABLES EVER AGAIN.

contract ZKChessCore is Initializable, ZKChessStorage {
    function initialize(address _adminAddress, bool _disableZKCheck)
        public
        initializer
    {
        paused = false;
        DISABLE_ZK_CHECK = _disableZKCheck;
    }

    //////////////
    /// EVENTS ///
    //////////////

    event ProofVerified(uint256 pfsAccepted);

    //////////////////////
    /// ACCESS CONTROL ///
    //////////////////////

    modifier onlyAdmin() {
        require(msg.sender == adminAddress, "Sender is not a game master");
        _;
    }

    modifier notPaused() {
        require(!paused, "Game is paused");
        _;
    }

    /////////////
    /// Admin ///
    /////////////

    function pause() public onlyAdmin {
        require(!paused, "Game is already paused");
        paused = true;
    }

    function unpause() public onlyAdmin {
        require(paused, "Game is already unpaused");
        paused = false;
    }

    //////////////
    /// Helper ///
    //////////////

    //////////////////////
    /// Game Mechanics ///
    //////////////////////

    function checkProof(
        uint256[2] memory _a,
        uint256[2][2] memory _b,
        uint256[2] memory _c,
        uint256[1] memory _input
    ) public notPaused returns (bool) {
        if (!DISABLE_ZK_CHECK) {
            require(
                Verifier.verifyMoveProof(_a, _b, _c, _input),
                "Failed init proof check"
            );
        }
        pfsVerified += 1;
        emit ProofVerified(pfsVerified);
        return true;
    }
}
