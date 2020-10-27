pragma solidity ^0.6.7;
pragma experimental ABIEncoderV2;

import "./Verifier.sol";
import "./Hasher.sol";

contract ZKChessCore {
    uint256
        public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

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

    function hashTriple(
        uint256 val1,
        uint256 val2,
        uint256 val3
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
