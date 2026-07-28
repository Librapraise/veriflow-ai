/**
 * Sign-In with Ethereum (SIWE) Authentication Module
 */

export interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

export function generateSIWENonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function createSIWEMessage(params: {
  domain: string;
  address: string;
  chainId: number;
  nonce: string;
  statement?: string;
}): string {
  const statement = params.statement || 'Sign in to VeriFlow AI to authenticate confidential document verification.';
  const uri = window.location.origin;
  const issuedAt = new Date().toISOString();
  
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    '',
    statement,
    '',
    `URI: ${uri}`,
    `Version: 1`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`
  ].join('\n');
}

export async function requestWalletConnection(): Promise<{ address: string; chainId: number }> {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16) || 14; // Default to Flare Coston2 (14) or Sepolia
      return { address: accounts[0], chainId };
    } catch (err) {
      console.warn('Wallet connection rejected or unavailable, generating session wallet for mobile/demo', err);
    }
  }
  
  // Generate dynamic random wallet address when no Web3 provider is available (e.g. mobile standard browsers without injected wallet)
  const randomBytes = crypto.getRandomValues(new Uint8Array(20));
  const dynamicAddress = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    address: dynamicAddress,
    chainId: 14 // Flare Testnet
  };
}

export async function signSIWEMessage(address: string, message: string): Promise<string> {
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [message, address]
      });
      return signature;
    } catch (err) {
      console.warn('Signature rejected or cancelled, using demo signature', err);
    }
  }
  
  // Demo Signature Fallback
  return '0x3a4b9c1d8e2f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c1b';
}
