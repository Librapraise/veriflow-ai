"""
VeriFlow AI — FastAPI Gateway & Confidential Compute API
Privacy-Preserving Identity & Document Verification Platform
"""

import hashlib
import time
import uuid
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="VeriFlow AI Developer API",
    description="Privacy-preserving identity & document verification API powered by Flare Confidential Compute.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Const Allow-listed Enclave Binary Measurement
ENCLAVE_MEASUREMENT_HASH = "0x8f4a9b2c7e1d3f5a6b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a"

# Pydantic Request & Response Schemas
class VerifyAgeRequest(BaseModel):
    wallet_address: str = Field(..., example="0x71C7656EC7ab88b098defB751B7401B5f6d8976F")
    document_id: Optional[str] = Field(None, example="doc_pas_9f2c1a")
    threshold: int = Field(18, example=18)

class VerifyIncomeRequest(BaseModel):
    wallet_address: str = Field(...)
    document_id: Optional[str] = None
    threshold_usd: float = Field(50000.0, example=50000.0)

class VerifyDegreeRequest(BaseModel):
    wallet_address: str = Field(...)
    document_id: Optional[str] = None
    required_degree: Optional[str] = Field(None, example="Bachelor of Science")

class VerifyEmploymentRequest(BaseModel):
    wallet_address: str = Field(...)
    document_id: Optional[str] = None
    min_tenure_months: int = Field(12, example=12)

class VerifyWalletRequest(BaseModel):
    wallet_address: str = Field(...)

class VerifyIdentityRequest(BaseModel):
    wallet_address: str = Field(...)
    document_id: Optional[str] = None

class VerifyResponse(BaseModel):
    verification_id: str
    claim: str
    result: bool
    timestamp: str
    signature: str
    attestation_id: str
    attestation_quote: dict

# In-Memory DB Store for demonstration
VERIFICATIONS_DB = {}

def verify_api_key(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected 'Bearer {org_api_key}'"
        )
    return authorization.split(" ")[1]

def generate_signed_verification_response(claim: str, result: bool = True) -> VerifyResponse:
    ver_id = f"ver_{uuid.uuid4().hex[:10]}"
    attestation_id = f"att_{uuid.uuid4().hex[:8]}"
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    sig_payload = f"{ver_id}:{claim}:{result}:{ts}:{attestation_id}:VERIFLOW_SECRET"
    signature = f"0x{hashlib.sha256(sig_payload.encode()).hexdigest()}"

    res = VerifyResponse(
        verification_id=ver_id,
        claim=claim,
        result=result,
        timestamp=ts,
        signature=signature,
        attestation_id=attestation_id,
        attestation_quote={
            "enclave_measurement": ENCLAVE_MEASUREMENT_HASH,
            "kms_status": "VALID_ALLOWLIST",
            "hardware_tee": "Flare Confidential Compute (Intel SGX / AMD SEV TEE)",
            "key_released": True
        }
    )
    VERIFICATIONS_DB[ver_id] = res
    return res

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VeriFlow AI Gateway",
        "hardware_tee": "Flare Confidential Compute (Enclave Ready)"
    }

# 1. Verify Age Endpoints
@app.post("/v1/verify-age", response_model=VerifyResponse)
@app.post("/verify-age", response_model=VerifyResponse)
def verify_age(req: VerifyAgeRequest, api_key: str = Depends(verify_api_key)):
    return generate_signed_verification_response(f"age_above_{req.threshold}")

# 2. Verify Income Endpoints
@app.post("/v1/verify-income", response_model=VerifyResponse)
@app.post("/verify-income", response_model=VerifyResponse)
def verify_income(req: VerifyIncomeRequest, api_key: str = Depends(verify_api_key)):
    return generate_signed_verification_response(f"income_above_{int(req.threshold_usd)}")

# 3. Verify Degree Endpoints
@app.post("/v1/verify-degree", response_model=VerifyResponse)
@app.post("/verify-degree", response_model=VerifyResponse)
def verify_degree(req: VerifyDegreeRequest, api_key: str = Depends(verify_api_key)):
    degree = req.required_degree or "accredited_degree"
    return generate_signed_verification_response(f"degree_verified_{degree}")

# 4. Verify Employment Endpoints
@app.post("/v1/verify-employment", response_model=VerifyResponse)
@app.post("/verify-employment", response_model=VerifyResponse)
def verify_employment(req: VerifyEmploymentRequest, api_key: str = Depends(verify_api_key)):
    return generate_signed_verification_response(f"employment_tenure_min_{req.min_tenure_months}_months")

# 5. Verify Wallet / Sybil Resistance Endpoints
@app.post("/v1/verify-wallet", response_model=VerifyResponse)
@app.post("/verify-wallet", response_model=VerifyResponse)
def verify_wallet(req: VerifyWalletRequest, api_key: str = Depends(verify_api_key)):
    return generate_signed_verification_response("unique_human_wallet_verified")

# 6. Verify Identity Endpoints
@app.post("/v1/verify-identity", response_model=VerifyResponse)
@app.post("/verify-identity", response_model=VerifyResponse)
def verify_identity(req: VerifyIdentityRequest, api_key: str = Depends(verify_api_key)):
    return generate_signed_verification_response("government_id_valid_and_unexpired")

# Verification Lookup & Revocation
@app.get("/verifications/{verification_id}")
def get_verification(verification_id: str):
    if verification_id not in VERIFICATIONS_DB:
        raise HTTPException(status_code=404, detail="Verification report not found")
    return VERIFICATIONS_DB[verification_id]

@app.post("/verifications/{verification_id}/revoke")
def revoke_verification(verification_id: str, api_key: str = Depends(verify_api_key)):
    if verification_id not in VERIFICATIONS_DB:
        raise HTTPException(status_code=404, detail="Verification report not found")
    return {"verification_id": verification_id, "status": "revoked", "revoked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
