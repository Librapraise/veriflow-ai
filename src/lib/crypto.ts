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

/*
 * REMOVED: generateEnclaveSignature() / verifyReportSignature()
 *
 * Those functions computed sha256(payload + "VERIFLOW_TEE_SIGNATURE_SECRET_V1")
 * and called the result an "enclave signature". Because the secret shipped in
 * client-side code, anyone could mint a valid signature for any claim — it
 * authenticated nothing.
 *
 * Replaced by real secp256k1 ECDSA signing over a canonical digest:
 *   - src/lib/tee/signing.ts  digest layout + recovery (single source of truth)
 *   - src/lib/tee/signer.ts   key custody (remote server key vs browser key)
 *   - contracts/VeriFlowRegistryV2.sol  on-chain ecrecover against the
 *                                       registered TEE identity
 *
 * Intentionally not kept as a fallback: a forgeable signing path that still
 * exists is still a vulnerability.
 */
