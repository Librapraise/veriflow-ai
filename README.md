# VeriFlow AI

> **Verify the truth. Reveal nothing else.**

VeriFlow AI is a privacy-preserving document verification platform for fintechs, Web3 DAOs, HR teams, and other organizations that need verified facts without retaining raw documents.

Users submit passports, bank statements, payslips, employment records, and degree certificates. VeriFlow extracts only the fields required for a requested claim, evaluates the rule, sanitizes the result, and produces a signed proof that can be independently checked on Flare Coston2.

[![Live application](https://img.shields.io/badge/Live-veriflow--ai.vercel.app-2dd4bf?style=for-the-badge&logo=vercel)](https://veriflow-ai.vercel.app)
[![Flare Coston2](https://img.shields.io/badge/Flare-Coston2-f97316?style=for-the-badge)](https://coston2-explorer.flare.network/address/0x2d52308CcABaEC795369A0769861c2b2c75E500E)
[![TEE boundary](https://img.shields.io/badge/TEE-Simulated-38bdf8?style=for-the-badge)](#security-boundary)

## Why VeriFlow

Conventional verification workflows collect far more personal information than they need. An employer checking a degree should not need to retain an entire certificate. A lender evaluating a threshold should not need a permanent copy of a bank statement. A DAO checking age eligibility should not receive a passport scan.

VeriFlow turns documents into minimal claims such as:

```text
age_above_18 = true
income_above_threshold = true
degree_verified = true
currently_employed = false
```

Every evaluation has one of three explicit outcomes:

| Status | Meaning |
|---|---|
| `VERIFIED` | The required evidence was extracted and the rule passed. |
| `DENIED` | The required evidence was extracted and the rule failed. |
| `UNVERIFIABLE` | The document did not provide enough reliable evidence. |

Unknown claims and incomplete credentials fail closed as `UNVERIFIABLE`.

## Product surfaces

### Individuals

- Upload and encrypt documents in the browser.
- Review the confidential-compute execution pipeline.
- Approve on-chain settlement through MetaMask.
- Inspect verification history and reusable proofs.
- Respond to organization-issued verification requests.

### Organizations and developers

- Create verification requests with permitted document types and claims.
- Share candidate-facing consent URLs.
- Configure callback webhooks.
- Build requests interactively in the Developer Portal.
- Generate cURL, TypeScript, and Python examples.
- Inspect simulated webhook events before integrating a production receiver.

### Public proof recipients

- Open a proof by URL or verification ID.
- Recompute its canonical digest.
- Recover and validate the enclave signer.
- Inspect the code measurement and Flare registry state.
- Verify without receiving the source document.

## Application routes

| Route | Purpose |
|---|---|
| `/` | Public landing page and instant sandbox demo |
| `/verifier` | Public cryptographic proof verifier |
| `/verifier/:proofId` | Deep-linked proof inspection |
| `/app/dashboard` | Verification workspace overview |
| `/app/verify` | Document encryption and claim verification |
| `/app/history` | Previous verification results |
| `/app/requests` | B2B verification request builder |
| `/app/developer` | API builder, SDK examples, and webhook console |
| `/app/assistant` | VeriFlow conversational assistant |

The verification workspace also supports request links such as:

```text
/app/verify?request_id=req_example
```

These links preselect the claims and document types permitted by the organization request.

## Document extraction pipeline

VeriFlow uses a layered extraction strategy rather than relying on one parser:

1. PDF.js extracts text layers from digital PDFs.
2. Tesseract.js performs OCR for scanned PDFs, photographs, PNGs, and JPEGs.
3. ICAO TD3 MRZ parsing handles machine-readable passport data.
4. Schema and regex extractors normalize fields for claim evaluation.
5. UTF-8 decoding supports compatible text-based documents.

The pipeline supports practical document variations including:

- Passport dates such as `21 OCT / OCT 00`, normalized from document context rather than hardcoded values.
- Currency labels and symbols such as `CURRENCY: NGN`, `₦`, `$`, `£`, and `€`.
- PDF text operators, kerning arrays, and OCR-corrupted whitespace.
- Degree and institution extraction without assuming a particular university.
- Employment end dates, including `Present`, current dates, and historical end dates.

OCR quality still depends on image resolution, lighting, rotation, blur, and document layout. Uncertain extraction is surfaced as `UNVERIFIABLE` instead of being silently accepted.

## Cryptographic execution flow

```text
Raw document in browser
        |
        v
Client-side AES-256-GCM encryption
        |
        v
Confidential extraction and claim evaluation
        |
        v
Zero-knowledge data sanitization
        |
        v
Canonical EIP-191 signed attestation
        |
        v
Flare Coston2 registry settlement and public verification
```

The application visualizes four user-facing stages:

1. Client-side encryption.
2. Confidential compute processing.
3. proof and SGX-style attestation generation.
4. Flare smart-contract registry settlement.

Only the sanitized claim result and proof metadata are intended to leave the confidential execution boundary.

## Security boundary

VeriFlow distinguishes implemented cryptography from simulated infrastructure.

| Layer | Current implementation | Production target |
|---|---|---|
| Browser encryption | Real AES-256-GCM through WebCrypto | Same mechanism |
| Document extraction | Real PDF.js, Tesseract OCR, MRZ, schema extraction, and rule evaluation | Same pipeline inside protected memory |
| Attestation signature | Real secp256k1 ECDSA with EIP-191 over a canonical 165-byte payload | Same format with hardware-protected keys |
| Smart-contract verification | Real `ecrecover` verification on Flare Coston2 | Same contract design on the target Flare network |
| TEE and key custody | Simulated enclave; key custody depends on local/server execution mode | Hardware-backed AMD SEV-SNP or Intel SGX environment |
| Webhook console | Interactive simulator | Durable signed webhook delivery with retries |

The project does not claim that the current hackathon deployment provides a production hardware TEE. See [SECURITY.md](SECURITY.md) for the detailed trust model.

## Flare deployment

- **Network:** Flare Coston2
- **Chain ID:** `114`
- **Registry contract:** [`0x2d52308CcABaEC795369A0769861c2b2c75E500E`](https://coston2-explorer.flare.network/address/0x2d52308CcABaEC795369A0769861c2b2c75E500E)
- **Registered TEE identity:** `0x3FB763Adfc4190482a2e6758c7842c755B4aE1bE`
- **Code measurement:** `0xd84e5ababec001f7d94523e6c48f2a3de09060f032abc3744e5262a32fded72d`
- **Signature scheme:** `ECDSA-secp256k1-EIP191`

The canonical attestation is 165 bytes and binds the claim, outcome, document commitment, timestamp, code measurement, and signer-compatible proof fields into one deterministic digest.

## Technology stack

- React 19, TypeScript, Vite, and Tailwind CSS
- React Router and Framer Motion
- ethers.js and MetaMask/SIWE wallet flows
- PDF.js and Tesseract.js
- FastAPI backend
- Solidity registry contract on Flare Coston2

## Local development

### Requirements

- Node.js 20 or newer
- npm
- Python 3.10 or newer for the optional backend
- MetaMask for wallet and settlement flows

### Frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Create a local environment file from [.env.example](.env.example) and configure the required RPC, contract, and backend values for your environment.

### Production build

```bash
npm run build
npm run preview
```

### Backend

```bash
python -m pip install -r backend/requirements.txt
python backend/main.py
```

The local API documentation is available at `http://localhost:8000/docs`.

## Verification and quality checks

```bash
npm run lint
npm run build
node scripts/testSigningParity.mjs
node scripts/verifyProof.mjs scripts/testProofFixture.json
```

The signing parity suite checks consistency between the application, backend, and Solidity encoding assumptions. The standalone verifier checks a proof fixture against Flare Coston2.

## Developer API workflow

A typical B2B integration follows this sequence:

1. The organization creates a verification request specifying claims, permitted document types, expiry, and an optional callback URL.
2. VeriFlow returns a candidate-facing request URL.
3. The candidate opens the URL, consents, submits an allowed document, and approves verification.
4. The organization receives or retrieves only the sanitized result and cryptographic proof.
5. The proof can be independently inspected through `/verifier/:proofId`.

Example request shape:

```json
{
  "claims": ["degree_verified", "currently_employed"],
  "allowed_document_types": ["degree_certificate", "employment_record"],
  "callback_url": "https://example.com/webhooks/veriflow",
  "expires_in": 86400
}
```

Use the live Developer Portal at `/app/developer` for request construction and generated SDK examples. API persistence and webhook delivery in the current demo should not be treated as production-grade durable infrastructure.

## Conversational assistant

The assistant helps users navigate VeriFlow, understand claim outcomes, locate verification tools, and learn the privacy model. Chat history is persisted locally so refreshing the page does not immediately clear the conversation.

Its current responses are primarily product-aware and deterministic. A production roadmap would add a policy-constrained model, retrieval over organization documentation, explicit tool permissions, and auditable response provenance.

## Current limitations

- Hardware-backed enclave execution and remote quote verification remain production roadmap work.
- OCR can be slow and is sensitive to scan quality.
- Browser-side OCR currently defaults primarily to English.
- Demo storage and backend state are not a substitute for a durable production database.
- The webhook console simulates delivery; production callbacks require signed delivery, retries, idempotency, and audit logs.
- Smart-contract settlement requires the correct wallet network and enough Coston2 test tokens.

## Deployed resources

- **Live application:** https://veriflow-ai.vercel.app
- **Backend API:** https://veriflow-ai.onrender.com
- **Swagger:** https://veriflow-ai.onrender.com/docs
- **Demo video:** https://youtu.be/aEWvwmynR04
- **Security model:** [SECURITY.md](SECURITY.md)
- **Quickstart and demo flow:** [QUICKSTART.md](QUICKSTART.md)
- **Registry contract:** [contracts/VeriFlowRegistryV2.sol](contracts/VeriFlowRegistryV2.sol)

## License and responsible use

VeriFlow is a hackathon prototype. Do not use it as the sole basis for employment, lending, identity, immigration, or other high-impact decisions without production security review, applicable legal safeguards, human appeal processes, and independent verification of the complete deployment.
