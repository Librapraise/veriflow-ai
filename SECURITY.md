# Security Notes

## Reporting

For security issues in VeriFlow AI, open a GitHub issue or contact the maintainers directly.

## Disclosed: placeholder private key in early git history

An early commit in this repository contained a hardcoded Ethereum private key as a
*fallback* value in `hardhat.config.cjs` / `hardhat.config.js`:

```
0x4e9a2b7c1d0f8e9a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a
```

**Status: remediated in `HEAD`, and it never controlled any funds or any deployed contract.**

Details, for transparency:

- It was a hand-written placeholder, not a generated key, and was only used if
  `ENCLAVE_SECRET_KEY` was unset.
- The contract deployment script (`scripts/deployDirect.js`) requires
  `DEPLOYER_PRIVATE_KEY` and **exits** if it is missing — it never falls back to
  this value. The deployed registry is owned by a different address.
- The value is still reachable in git history. It is treated as **public and
  permanently burned**: it must never be funded or reused.

Remediation applied:

- Removed the fallback from `hardhat.config.cjs` (now `accounts: []` when
  `ENCLAVE_SECRET_KEY` is unset, so a misconfigured deploy fails loudly rather
  than silently signing with a known key).
- Deleted the duplicate `hardhat.config.js`.
- Replaced the value in `backend/.env.example` with a non-secret placeholder.

Git history was intentionally **not** rewritten: force-pushing a rewritten history
would break commit links referenced from the hackathon submission, and the key
holds nothing. Rewriting would provide no security benefit here.

## Key handling

- The TEE identity signing key is generated fresh via `scripts/generateTeeIdentity.js`
  and provided only through the deployment environment. It is never committed and
  never shipped to the browser.
- `.env` and `backend/.env` are gitignored. Only `.env.example` files are tracked,
  and they contain placeholders only.
- Never reuse a key that has appeared in any git history, log, chat transcript, or
  screenshot.

## Known limitations of this build

This is a hackathon submission. The confidential-compute layer is **simulated**:
signing keys are held by a normal server process, not by attested TEE hardware.
The cryptography (secp256k1 ECDSA, on-chain signature verification) is real; the
hardware isolation is not. See the "What's Real vs. Simulated" section of the
README for the precise boundary.
