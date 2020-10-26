pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./Verifier.sol";

contract ZKChessCore {
    address public adminAddress;
    bool public paused;
    bool public DISABLE_ZK_CHECK;

    uint256 pfsVerified;

    constructor(address _adminAddress, bool _disableZKCheck) public {
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
