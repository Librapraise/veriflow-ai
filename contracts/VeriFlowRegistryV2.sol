// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VeriFlowRegistryV2
 * @notice On-chain registry that AUTHENTICATES confidential-compute verification
 *         results before recording them.
 *
 * @dev Supersedes VeriFlowRegistry (V1). V1 accepted any caller and never checked
 *      the signature it stored, so an anchored record proved nothing. V2 recovers
 *      the signer from the attestation and requires it to equal a registered TEE
 *      identity, mirroring Flare Confidential Compute's model: "smart contracts
 *      authenticate outputs signed by a registered TEE identity."
 *
 *      Design notes for reviewers:
 *      - anchorVerification is PERMISSIONLESS TO CALL but AUTHENTICATED BY SIGNATURE.
 *        Whoever pays gas is irrelevant; only the TEE identity's signature grants
 *        authority. This is deliberate and matches Flare's relay model.
 *      - Code identity is a `codeMeasurement` (the approved container image digest),
 *        not an SGX enclave measurement. Only allow-listed versions can anchor.
 *      - No imports: the deploy pipeline compiles a single source string through
 *        solc with no import callback, so EIP-712/OpenZeppelin helpers are inlined.
 *
 *      The digest layout below is mirrored byte-for-byte in:
 *        src/lib/tee/signing.ts, backend/tee/signing.py, scripts/verifyProof.mjs
 */
contract VeriFlowRegistryV2 {
    struct Attestation {
        bytes32 verificationId;
        address subject;
        bytes32 claimHash;
        bool result;
        uint64 issuedAt;
        uint64 expiresAt;
        bytes32 codeMeasurement;
        bytes32 attestationHash;
    }

    struct VerificationRecord {
        bytes32 claimHash;
        address subject;
        bool result;
        bool isRevoked;
        uint64 issuedAt;
        uint64 expiresAt;
        uint256 anchoredAt;
        bytes32 codeMeasurement;
        bytes32 attestationHash;
        bytes signature;
    }

    /// @notice secp256k1 group order / 2 — signatures above this are malleable.
    uint256 private constant HALF_CURVE_ORDER =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    address public owner;

    /// @notice The registered TEE identity. Only its signatures may anchor.
    address public teeIdentity;

    /// @notice Allow-listed code versions (approved container image digests).
    mapping(bytes32 => bool) public approvedCodeMeasurement;

    mapping(bytes32 => VerificationRecord) public verifications;

    event TeeIdentityRegistered(address indexed previous, address indexed current, bytes32 codeMeasurement);
    event CodeMeasurementApproved(bytes32 indexed codeMeasurement, bool approved);
    event VerificationAnchored(
        bytes32 indexed verificationId,
        bytes32 indexed claimHash,
        address indexed subject,
        bool result,
        bytes32 codeMeasurement,
        bytes32 attestationHash,
        address caller,
        uint256 timestamp
    );
    event VerificationRevoked(bytes32 indexed verificationId, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "VeriFlowRegistryV2: not owner");
        _;
    }

    constructor(address _teeIdentity, bytes32 _codeMeasurement) {
        require(_teeIdentity != address(0), "VeriFlowRegistryV2: zero identity");
        owner = msg.sender;
        teeIdentity = _teeIdentity;
        approvedCodeMeasurement[_codeMeasurement] = true;
        emit TeeIdentityRegistered(address(0), _teeIdentity, _codeMeasurement);
        emit CodeMeasurementApproved(_codeMeasurement, true);
    }

    // ─── Identity & code-version governance ──────────────────────────────────

    /**
     * @notice Register (or rotate) the TEE identity and approve its code version.
     * @dev TODO(FCC): replace the owner gate with an FDC-validated attestation
     *      proof, so a machine can self-register by proving it runs an approved
     *      image. Today registration is an owner action.
     */
    function registerTeeIdentity(address _teeIdentity, bytes32 _codeMeasurement) external onlyOwner {
        require(_teeIdentity != address(0), "VeriFlowRegistryV2: zero identity");
        emit TeeIdentityRegistered(teeIdentity, _teeIdentity, _codeMeasurement);
        teeIdentity = _teeIdentity;
        if (!approvedCodeMeasurement[_codeMeasurement]) {
            approvedCodeMeasurement[_codeMeasurement] = true;
            emit CodeMeasurementApproved(_codeMeasurement, true);
        }
    }

    function approveCodeMeasurement(bytes32 _codeMeasurement, bool _approved) external onlyOwner {
        approvedCodeMeasurement[_codeMeasurement] = _approved;
        emit CodeMeasurementApproved(_codeMeasurement, _approved);
    }

    // ─── Digest construction (mirrors src/lib/tee/signing.ts) ─────────────────

    /// @notice The canonical attestation digest. Exposed so anyone can recompute it.
    function attestationDigest(Attestation calldata a) public pure returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                a.verificationId,
                a.subject,
                a.claimHash,
                a.result,
                a.issuedAt,
                a.expiresAt,
                a.codeMeasurement,
                a.attestationHash
            )
        );
    }

    /// @notice EIP-191 envelope over the 32-byte digest.
    function ethSignedDigest(Attestation calldata a) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", attestationDigest(a)));
    }

    /// @notice Recover the signer of an attestation. Reverts on malformed input.
    function recoverSigner(Attestation calldata a, bytes calldata signature) public pure returns (address) {
        require(signature.length == 65, "VeriFlowRegistryV2: bad sig length");

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) v += 27;
        require(v == 27 || v == 28, "VeriFlowRegistryV2: bad v");
        require(uint256(s) <= HALF_CURVE_ORDER, "VeriFlowRegistryV2: malleable s");

        address recovered = ecrecover(ethSignedDigest(a), v, r, s);
        require(recovered != address(0), "VeriFlowRegistryV2: bad signature");
        return recovered;
    }

    // ─── Anchoring ────────────────────────────────────────────────────────────

    /**
     * @notice Anchor a TEE-signed verification result.
     * @dev Permissionless to call, authenticated by signature. The caller pays gas
     *      but holds no authority: only a signature from the registered TEE
     *      identity, over an approved code version, is accepted.
     */
    function anchorVerification(Attestation calldata a, bytes calldata signature) external {
        require(verifications[a.verificationId].anchoredAt == 0, "VeriFlowRegistryV2: already anchored");
        require(approvedCodeMeasurement[a.codeMeasurement], "VeriFlowRegistryV2: unapproved code version");
        require(a.expiresAt > block.timestamp, "VeriFlowRegistryV2: attestation expired");
        require(a.issuedAt <= block.timestamp + 300, "VeriFlowRegistryV2: issued in the future");

        address recovered = recoverSigner(a, signature);
        require(recovered == teeIdentity, "VeriFlowRegistryV2: not signed by TEE identity");

        verifications[a.verificationId] = VerificationRecord({
            claimHash: a.claimHash,
            subject: a.subject,
            result: a.result,
            isRevoked: false,
            issuedAt: a.issuedAt,
            expiresAt: a.expiresAt,
            anchoredAt: block.timestamp,
            codeMeasurement: a.codeMeasurement,
            attestationHash: a.attestationHash,
            signature: signature
        });

        emit VerificationAnchored(
            a.verificationId,
            a.claimHash,
            a.subject,
            a.result,
            a.codeMeasurement,
            a.attestationHash,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Revocation is a governance action, hence owner-gated.
    function revokeVerification(bytes32 verificationId) external onlyOwner {
        VerificationRecord storage rec = verifications[verificationId];
        require(rec.anchoredAt > 0, "VeriFlowRegistryV2: unknown verification");
        require(!rec.isRevoked, "VeriFlowRegistryV2: already revoked");
        rec.isRevoked = true;
        emit VerificationRevoked(verificationId, block.timestamp);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /**
     * @notice Full status of an anchored verification.
     * @return exists    a record is present
     * @return isValid   present, not revoked, not expired
     * @return result    the attested truth value (may legitimately be false)
     * @return subject   who the claim is about
     * @return claimHash which claim was attested
     * @return anchoredAt block timestamp of anchoring
     * @return expiresAt attestation expiry
     * @return codeMeasurement the code version that produced it
     */
    function verifyRecord(bytes32 verificationId)
        external
        view
        returns (
            bool exists,
            bool isValid,
            bool result,
            address subject,
            bytes32 claimHash,
            uint256 anchoredAt,
            uint64 expiresAt,
            bytes32 codeMeasurement
        )
    {
        VerificationRecord memory rec = verifications[verificationId];
        if (rec.anchoredAt == 0) {
            return (false, false, false, address(0), bytes32(0), 0, 0, bytes32(0));
        }
        bool valid = !rec.isRevoked && rec.expiresAt > block.timestamp;
        return (
            true,
            valid,
            rec.result,
            rec.subject,
            rec.claimHash,
            rec.anchoredAt,
            rec.expiresAt,
            rec.codeMeasurement
        );
    }

    /// @notice Convenience: the stored signature for off-chain re-verification.
    function verificationSignature(bytes32 verificationId) external view returns (bytes memory) {
        return verifications[verificationId].signature;
    }
}
