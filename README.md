# VeriFlow AI — Privacy-Preserving Identity & Verification Platform

> **Verify Facts. Not Documents.**  
> Powered by **Flare Confidential Compute** (Trusted Execution Environments).

[![Live Demo](https://img.shields.io/badge/Live_Demo-veriflow--ai.vercel.app-10b981?style=for-the-badge&logo=vercel)](https://veriflow-ai.vercel.app)
[![Flare Network](https://img.shields.io/badge/Flare-Confidential_Compute-teal?style=for-the-badge&logo=ethereum)](https://flare.network)
[![Hackathon](https://img.shields.io/badge/Hackathon-Flare_Summer_Signal_2026-emerald?style=for-the-badge)](https://flare.network)
[![TEE Protection](https://img.shields.io/badge/TEE-Hardware_Attested-blue?style=for-the-badge)](https://flare.network)


---

## 1. Product Summary

**VeriFlow AI** enables users to upload sensitive credentials (passports, payslips, degree certificates, bank statements) once into a hardware-isolated Confidential Execution Environment. An AI pipeline extracts only the specific fact a third party needs (e.g. *"Is this person over 18?"*), checks it against a rule, and returns a **signed, independently verifiable result** — **never the underlying document or raw PII**.

Instead of a company storing full passport scans on central servers, it receives a cryptographically signed `age_above_18: true`.

---

## 2. Key Architecture & Security Guarantees

1. **Client-Side Encryption:** Plaintext documents are encrypted locally in the browser with AES-256-GCM (`crypto.subtle`) before upload. Plaintext never touches central storage.
2. **Attested Enclave Processing:** Decryption keys are released by the Key Management Service (KMS) **only** to hardware enclaves presenting a valid Remote Attestation Quote ($Q_{att}$) matching an allow-listed binary measurement ($M_{code}$).
3. **Fail-Closed Protection:** If remote attestation fails, key release is denied and processing terminates immediately with a hard error.
4. **Zero-Knowledge Memory Purge:** Plaintext files and extracted PII are erased from enclave RAM immediately after rule evaluation.
5. **Independently Verifiable:** Enclave signs verification claims with an enclave-held key ($SK_{enclave}$). Anyone can audit the proof against the published enclave public key ($PK_{enclave}$).

---

## 3. Supported Extraction Schemas & Verification Engine

| Document Type | Extracted Schema Fields (Enclave Internal) | Available Claim Checks |
|---|---|---|
| **Passport / National ID** | `full_name`, `date_of_birth`, `document_number`, `issuing_country`, `expiry_date` | Age 18+, Age 21+, Age 65+ |
| **Payslip** | `employer_name`, `role_title`, `pay_period`, `gross_income`, `net_income` | Income above threshold, Active employment |
| **Degree Certificate** | `full_name`, `institution`, `degree_title`, `field_of_study`, `graduation_date` | Degree verified, Accredited university |
| **Resume** | `full_name`, `roles[]`, `skills[]`, `education[]` | Tenure $\ge N$ months, Role matches |
| **Driver's License** | `full_name`, `date_of_birth`, `license_number`, `expiry_date`, `address_hash` | Government ID valid & unexpired |
| **Bank Statement** | `account_holder_name`, `statement_period`, `average_balance`, `income_total` | Liquid balance threshold |

---

## 4. Hardware Remote Attestation Lifecycle

```
+-------------------+      Client AES-256      +-------------------------+
| Browser Client    | -----------------------> | Encrypted Blob Storage  |
| (SIWE Authenticated|  (Ciphertext blob only)  | (Cloudflare R2 / S3)    |
+-------------------+                          +-------------------------+
          |                                                 |
          | Job Request                                     | Fetch Ciphertext
          v                                                 v
+-------------------+     Attestation Quote    +-------------------------+
| FastAPI Gateway   | -----------------------> | TEE Enclave             |
+-------------------+                          | (Flare Confidential)    |
                                               +-------------------------+
                                                            |
                                   1. Q_att Quote           | 2. Verified Attestation
                                   +------------------------+-----------------------+
                                   |                                                |
                                   v                                                v
                       +------------------------+                      +------------------------+
                       | Key Management (KMS)   |                      | Enclave RAM Only       |
                       | Validates Code Hash    |                      | - Decrypts with K_doc  |
                       | Releases Key K_doc     |                      | - AI OCR & Schema Ext. |
                       +------------------------+                      | - Evaluates Claim Rule |
                                                                       | - Wipes Plaintext RAM  |
                                                                       | - Signs Result with SK |
                                                                       +------------------------+
                                                                                    |
                                                                                    v
                                                                       +------------------------+
                                                                       | Signed Result Payload  |
                                                                       | + Attestation Quote    |
                                                                       +------------------------+
```

---

## 5. Quickstart & Local Setup

### 1. Install Dependencies & Launch Frontend

```bash
# Install node packages
npm install

# Launch Vite Web Application
npm run dev
```
Open **`http://localhost:5173`** in your browser.

> **Note:** The web application features an autonomous client/edge TEE simulator, enabling full live testing directly in the browser out of the box.

### 2. Launch FastAPI Python Backend

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

### Example Request (`POST /v1/verify-age`)
```json
{
  "wallet_address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "document_id": "doc_pas_9f2c1a",
  "threshold": 18
}
```

### Example Response (`200 OK`)
```json
{
  "verification_id": "ver_7ab1c9e4",
  "claim": "age_above_18",
  "result": true,
  "timestamp": "2026-07-27T18:10:02Z",
  "signature": "0x4e9a2b7c1d0f8e9a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a",
  "attestation_id": "att_22f09a1",
  "attestation_quote": {
    "enclave_measurement": "0x8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
    "kms_status": "VALID_ALLOWLIST",
    "hardware_tee": "Flare Confidential Compute (Intel SGX / AMD SEV TEE)",
    "key_released": true
  }
}
```

---

## 7. Project Documentation Index

- **[QUICKSTART.md](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/QUICKSTART.md):** Complete live testing sequence and hackathon demo script.
- **[DEPLOYMENT.md](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/DEPLOYMENT.md):** Production deployment guide for Vercel, Railway, Neon PostgreSQL, R2 Storage, and Flare Testnet Smart Contracts.
- **[contracts/VeriFlowRegistry.sol](file:///c:/Users/DELL/OneDrive/Documents/New%20folder/contracts/VeriFlowRegistry.sol):** On-chain verification hash commitment contract.
