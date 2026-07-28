/**
 * Client-Side Encryption & Cryptographic Utilities for VeriFlow AI
 * Ensures plaintext documents NEVER leave the browser unencrypted.
 */

export interface EncryptionResult {
  ciphertextBase64: string;
  ivHex: string;
  wrappedKeyHex: string;
  dataHashHex: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
}

export async function arrayBufferToHex(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

export async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer as ArrayBuffer;
  } else {
    buffer = data;
  }
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return arrayBufferToHex(hashBuffer);
}

/**
 * Encrypts a raw document file locally in the browser using AES-256-GCM.
 */
export async function encryptDocumentClientSide(file: File): Promise<EncryptionResult> {
  const fileArrayBuffer = await file.arrayBuffer();
  
  // 1. Calculate raw file hash for verification
  const dataHashHex = await sha256Hex(fileArrayBuffer);
  
  // 2. Generate random AES-256-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // 3. Export raw key bytes and convert to hex for KMS wrapping mock
  const exportedRawKey = await crypto.subtle.exportKey('raw', aesKey);
  const wrappedKeyHex = await arrayBufferToHex(exportedRawKey);
  
  // 4. Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivHex = await arrayBufferToHex(iv.buffer as ArrayBuffer);
  
  // 5. Encrypt plaintext ArrayBuffer
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileArrayBuffer
  );
  
  // 6. Convert ciphertext to Base64 for safe transfer/storage
  const ciphertextBytes = new Uint8Array(ciphertextBuffer);
  let binaryString = '';
  for (let i = 0; i < ciphertextBytes.length; i++) {
    binaryString += String.fromCharCode(ciphertextBytes[i]);
  }
  const ciphertextBase64 = btoa(binaryString);
  
  return {
    ciphertextBase64,
    ivHex,
    wrappedKeyHex,
    dataHashHex,
    originalFileName: file.name,
    mimeType: file.type || 'application/pdf',
    fileSize: file.size,
  };
}

/**
 * Simulates in-memory decryption inside the TEE Enclave (RAM only).
 */
export async function decryptInsideEnclaveMemory(
  ciphertextBase64: string,
  ivHex: string,
  keyHex: string
): Promise<ArrayBuffer> {
  const binaryString = atob(ciphertextBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const rawKeyBuffer = hexToArrayBuffer(keyHex);
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawKeyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  const ivBuffer = hexToArrayBuffer(ivHex);
  return await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    aesKey,
    bytes.buffer
  );
}

/**
 * Derives a deterministic cryptographic signature for verification results
 * simulating the enclave's hardware signing key (SK_enclave).
 */
export async function generateEnclaveSignature(
  verificationId: string,
  claim: string,
  result: boolean,
  timestamp: string,
  attestationId: string
): Promise<{ signatureHex: string; enclavePubKeyHex: string }> {
  const payloadString = `${verificationId}:${claim}:${result}:${timestamp}:${attestationId}:VERIFLOW_TEE_SIGNATURE_SECRET_V1`;
  const signatureHex = await sha256Hex(payloadString);
  
  // Enclave Public Key constant / derived representation
  const enclavePubKeyHex = '0x04f7c29e1d883011a09b43e887f91c90538a2e1d09ff451000b21aef4200c92138a4f9119';
  
  return {
    signatureHex: `0x${signatureHex}`,
    enclavePubKeyHex,
  };
}

/**
 * Validates a verification report signature on the client / verifier side.
 */
export async function verifyReportSignature(
  verificationId: string,
  claim: string,
  result: boolean,
  timestamp: string,
  attestationId: string,
  signatureHex: string
): Promise<boolean> {
  const expected = await generateEnclaveSignature(
    verificationId,
    claim,
    result,
    timestamp,
    attestationId
  );
  return expected.signatureHex.toLowerCase() === signatureHex.toLowerCase();
}
