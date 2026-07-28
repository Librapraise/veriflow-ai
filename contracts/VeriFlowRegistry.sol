// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VeriFlowRegistry
 * @dev On-chain anchor for VeriFlow AI Confidential Compute Verifications on Flare Network.
 * Stores verification hashes, attestation quote hashes, and published enclave public key.
 */
contract VeriFlowRegistry {
    address public owner;
    bytes public enclavePublicKey;

    struct VerificationRecord {
        bytes32 verificationId;
        bytes32 claimHash;
        bool result;
        uint256 timestamp;
        bytes32 attestationHash;
        bytes signature;
        bool isRevoked;
    }

    // Mapping from verificationId to record
    mapping(bytes32 => VerificationRecord) public verifications;

    event EnclavePublicKeyUpdated(bytes oldKey, bytes newKey);
    event VerificationAnchored(
        bytes32 indexed verificationId,
        bytes32 indexed claimHash,
        bool result,
        bytes32 attestationHash,
        address indexed caller,
        uint256 timestamp
    );
    event VerificationRevoked(bytes32 indexed verificationId, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "VeriFlowRegistry: caller is not the owner");
        _;
    }

    constructor(bytes memory _enclavePublicKey) {
        owner = msg.sender;
        enclavePublicKey = _enclavePublicKey;
    }

    function setEnclavePublicKey(bytes memory _newKey) external onlyOwner {
        emit EnclavePublicKeyUpdated(enclavePublicKey, _newKey);
        enclavePublicKey = _newKey;
    }

    function anchorVerification(
        bytes32 verificationId,
        bytes32 claimHash,
        bool result,
        bytes32 attestationHash,
        bytes memory signature
    ) external {
        require(verifications[verificationId].timestamp == 0, "VeriFlowRegistry: verification already anchored");

        verifications[verificationId] = VerificationRecord({
            verificationId: verificationId,
            claimHash: claimHash,
            result: result,
            timestamp: block.timestamp,
            attestationHash: attestationHash,
            signature: signature,
            isRevoked: false
        });

        emit VerificationAnchored(verificationId, claimHash, result, attestationHash, msg.sender, block.timestamp);
    }

    function revokeVerification(bytes32 verificationId) external onlyOwner {
        require(verifications[verificationId].timestamp > 0, "VeriFlowRegistry: verification does not exist");
        require(!verifications[verificationId].isRevoked, "VeriFlowRegistry: already revoked");

        verifications[verificationId].isRevoked = true;
        emit VerificationRevoked(verificationId, block.timestamp);
    }

    function verifyRecord(bytes32 verificationId) external view returns (
        bool exists,
        bool isValid,
        bool result,
        uint256 timestamp,
        bytes32 attestationHash
    ) {
        VerificationRecord memory rec = verifications[verificationId];
        if (rec.timestamp == 0) {
            return (false, false, false, 0, bytes32(0));
        }
        return (true, !rec.isRevoked, rec.result, rec.timestamp, rec.attestationHash);
    }
}
