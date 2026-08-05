# VeriFlow AI — Privacy-Preserving Identity & Verification Platform

> **Verify Facts. Not Documents.**  
> Powered by **Flare Confidential Compute** principles & **On-Chain EVM Signature Verification**.

[![Live Demo](https://img.shields.io/badge/Live_Demo-veriflow--ai.vercel.app-10b981?style=for-the-badge&logo=vercel)](https://veriflow-ai.vercel.app)
[![Flare Network](https://img.shields.io/badge/Flare-Coston2_Testnet-teal?style=for-the-badge&logo=ethereum)](https://coston2-explorer.flare.network/address/0x2d52308CcABaEC795369A0769861c2b2c75E500E)
[![Hackathon](https://img.shields.io/badge/Hackathon-Flare_Summer_Signal_2026-emerald?style=for-the-badge)](https://flare.network)
[![TEE Protection](https://img.shields.io/badge/TEE-Simulated_+_Signed-blue?style=for-the-badge)](https://flare.network)

---

## 1. Product Summary

**VeriFlow AI** enables users to upload sensitive credentials (passports, payslips, degree certificates, bank statements) once into a hardware-isolated Confidential Execution Environment. An AI/MRZ pipeline extracts only the specific fact a third party needs (e.g., *"Is this person over 18?"*), checks it against a rule, and returns a **signed, independently verifiable result** — **never the underlying document or raw PII**.

Instead of a company storing full passport scans on central servers, it receives a cryptographically signed `age_above_18: true`.

---

## 2. Real vs. Simulated System Architecture

We believe in **100% cryptographic transparency**. Rather than hiding behind vague hardware claims, here is the exact production boundary:

| Feature / Layer | Implementation in VeriFlow AI Submission | Production Hardware Equivalent |
|---|---|---|
| **EVM Smart Contract Verification** | **100% Real Solidity Contract** (`VeriFlowRegistryV2.sol` on Flare Coston2 `0x2d52308CcABaEC795369A0769861c2b2c75E500E`). Executes `ecrecover` on-chain. | Identical on-chain Solidity contract (`VeriFlowRegistryV2.sol`). |
| **Attestation Signature Scheme** | **100% Real Cryptography**. 165-byte canonical `abi.encodePacked` digest signed with `ECDSA-secp256k1-EIP191`. | Identical secp256k1 ECDSA signature scheme. |
| **Document Extraction & Rules** | **100% Real ICAO 9303 TD3 MRZ Parser** with 7-3-1 check digit validation, composite check digits, and threshold age comparison. | Identical enclave RAM extraction pipeline. |
| **Zero-Trust Public Verifier** | **100% Real Browser & CLI Tooling** (`PublicVerifier.tsx` and `scripts/verifyProof.mjs`). Decodes `#<base64url>` proofs with 0 server dependency over Coston2 RPC. | Identical public verifier. |
| **Key Custody & Hardware TEE** | **Simulated Enclave Identity**. Private key stored in server environment variable (`ENCLAVE_SECRET_KEY`) instead of AMD SEV / Intel SGX VM memory. | Private key held inside hardware TEE VM memory (AMD SEV-SNP / Intel SGX). |

---

## 3. Supported Extraction Schemas & Verification Engine

| Document Type | Extracted Schema Fields (Enclave Internal) | Available Claim Checks |
|---|---|---|
| **Passport / National ID** | `full_name`, `date_of_birth`, `document_number`, `issuing_country`, `expiry_date` | Age 18+, Age 21+, Age 65+ |
| **Payslip** | `employer_name`, `role_title`, `pay_period`, `gross_income`, `net_income` | Income above threshold, Active employment |
| **Degree Certificate** | `full_name`, `institution`, `degree_title`, `field_of_study`, `graduation_date` | Degree verified, Accredited university |
| **Driver's License** | `full_name`, `date_of_birth`, `license_number`, `expiry_date`, `address_hash` | Government ID valid & unexpired |
| **Bank Statement** | `account_holder_name`, `statement_period`, `average_balance`, `income_total` | Liquid balance threshold |

---

## 4. Hardware Remote Attestation Lifecycle

```
+-------------------+      Client AES-256      +-------------------------+
| Browser Client    | -----------------------> | Encrypted Blob Storage  |
| (SIWE Authenticated|  (Ciphertext blob only)  | (Local / Supabase S3)   |
+-------------------+                          +-------------------------+
          |                                                 |
          | Job Request                                     | Fetch Ciphertext
          v                                                 v
+-------------------+     Attestation Quote    +-------------------------+
| FastAPI Gateway   | -----------------------> | TEE Enclave             |
+-------------------+                          | (Flare Confidential)    |
                                               +-------------------------+
                                                            |
                                   1. Q_att Quote           | 2. EIP-191 Signed Attestation
                                   +------------------------+-----------------------+
                                   |                                                |
                                   v                                                v
                       +------------------------+                      +------------------------+
                       | Key Management (KMS)   |                      | Enclave RAM Only       |
                       | Validates Code Hash    |                      | - Decrypts Ciphertext  |
                       | Releases Key           |                      | - MRZ & Schema Ext.    |
                       +------------------------+                      | - Evaluates Rule       |
                                                                        | - Wipes Plaintext RAM  |
                                                                        | - Signs with secp256k1 |
                                                                        +------------------------+
                                                                                     |
                                                                                     v
                                                                        +------------------------+
                                                                        | VeriFlowRegistryV2.sol |
                                                                        | On-Chain ecrecover Check|
                                                                        +------------------------+
```

---

## 5. Quickstart & Local Testing

### 1. Run Cryptographic Parity Suite
```bash
# Verify TypeScript <-> Solidity <-> Python digest parity (6/6 tests)
node scripts/testSigningParity.mjs
```

### 2. Run Standalone Proof Verifier over Coston2 RPC
```bash
# Verify proof fixture directly against Flare Coston2 testnet
node scripts/verifyProof.mjs scripts/testProofFixture.json
```

### 3. Launch Frontend dApp
```bash
# Install dependencies
npm install

# Launch Vite Web Application
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 4. Launch FastAPI Python Backend
```bash
# Install python requirements
python3 -m pip install -r backend/requirements.txt

# Run FastAPI Gateway
python3 backend/main.py
```
Open **`http://localhost:8000/docs`** for interactive Swagger API documentation.

---

## 6. Developer REST API Overview

Authorization header required: `Authorization: Bearer {org_api_key}`

### Example Request (`POST /v1/tee/execute`)
```json
{
  "wallet_address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "claim_type": "age_above_18",
  "document_id": "doc_pas_9f2c1a"
}
```

### Example Response (`200 OK`)
```json
{
  "verification_id": "ver_7ab1c9e4",
  "claim": "age_above_18",
  "result": true,
  "timestamp": "2026-08-05T04:15:02Z",
  "signature": "0x98f2a1b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f61b",
  "attestation_id": "att_22f09a1",
  "attestation_quote": {
    "enclave_measurement": "0xd84e5ababec001f7d94523e6c48f2a3de09060f032abc3744e5262a32fded72d",
    "kms_status": "VALID_ALLOWLIST",
    "hardware_tee": "Simulated TEE (server-held identity key)",
    "signature_scheme": "ECDSA-secp256k1-EIP191",
    "tee_identity": "0x3FB763Adfc4190482a2e6758c7842c755B4aE1bE",
    "key_released": true
  }
}
```

---

## 7. Verification Tools & Contract Details

- **Smart Contract Address**: [`0x2d52308CcABaEC795369A0769861c2b2c75E500E`](https://coston2-explorer.flare.network/address/0x2d52308CcABaEC795369A0769861c2b2c75E500E) on Flare Coston2 Testnet.
- **Registered TEE Identity Address**: `0x3FB763Adfc4190482a2e6758c7842c755B4aE1bE`
- **Code Measurement**: `0xd84e5ababec001f7d94523e6c48f2a3de09060f032abc3744e5262a32fded72d`

---

## 8. Project Documentation Index

- **[SUBMISSION.md](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/SUBMISSION.md):** Full Hackathon Submission Document.
- **[SECURITY.md](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/SECURITY.md):** Security Audit & Disclosure.
- **[QUICKSTART.md](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/QUICKSTART.md):** Complete live testing sequence and hackathon demo script.
- **[contracts/VeriFlowRegistryV2.sol](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/contracts/VeriFlowRegistryV2.sol):** On-chain signature verification smart contract deployed to Flare Coston2 Testnet.
