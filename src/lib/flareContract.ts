/**
 * Flare Coston2 Smart Contract Anchoring Service
 * Submits signed verification reports directly to the VeriFlowRegistry smart contract on-chain.
 */

import { ethers } from 'ethers';
import {
  FLARE_COSTON2_CONFIG,
  VERIFLOW_REGISTRY_V2_ADDRESS,
  VERIFLOW_REGISTRY_V2_ABI,
} from '../config/contracts';
import type { VerificationReport } from '../types/veriflow';
import { getWeb3Signer } from './wallet';

export interface OnChainAnchorResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  blockNumber?: number;
  errorMessage?: string;
}

/**
 * Ensures the connected wallet is switched to Flare Coston2 Testnet (Chain ID 114).
 * Works for any MetaMask wallet — not tied to a specific private key.
 */
async function ensureCoston2Network(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    const currentChainIdHex: string = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(currentChainIdHex, 16);

    if (currentChainId === FLARE_COSTON2_CONFIG.chainId) return true; // Already on Coston2

    // Try switching first
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FLARE_COSTON2_CONFIG.chainIdHex }]
      });
      return true;
    } catch (switchErr: any) {
      // Chain not added yet (error 4902) — add it
      if (switchErr.code === 4902 || switchErr?.message?.includes('Unrecognized chain')) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: FLARE_COSTON2_CONFIG.chainIdHex,
            chainName: FLARE_COSTON2_CONFIG.chainName,
            nativeCurrency: FLARE_COSTON2_CONFIG.nativeCurrency,
            rpcUrls: FLARE_COSTON2_CONFIG.rpcUrls,
            blockExplorerUrls: FLARE_COSTON2_CONFIG.blockExplorerUrls
          }]
        });
        return true;
      }
      console.warn('User declined network switch to Coston2:', switchErr.message);
      return false;
    }
  } catch (e) {
    console.warn('Could not check/switch network:', e);
    return false;
  }
}

/**
 * Anchors a verification report on the Flare Coston2 blockchain.
 * Works with any connected MetaMask wallet — not tied to a specific private key.
 * The connected wallet must have C2FLR testnet tokens for gas.
 * Get free C2FLR at: https://faucet.flare.network/
 */
export async function anchorVerificationOnFlare(
  report: VerificationReport
): Promise<OnChainAnchorResult> {
  try {
    // Step 1: Check wallet is connected
    if (!window.ethereum) {
      return {
        success: false,
        errorMessage: 'No Web3 wallet detected. Open this app inside the MetaMask in-app browser on mobile.'
      };
    }

    const accounts: string[] = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      return {
        success: false,
        errorMessage: 'No wallet connected. Please connect your MetaMask wallet first.'
      };
    }

    // Step 2: Auto-switch to Flare Coston2 (works for ANY connected wallet)
    const onCoston2 = await ensureCoston2Network();
    if (!onCoston2) {
      return {
        success: false,
        errorMessage: 'Please switch your wallet to Flare Coston2 Testnet (Chain ID 114) to anchor on-chain.'
      };
    }

    // Step 3: Get signer (now guaranteed to be on Coston2)
    const signer = await getWeb3Signer();
    if (!signer) {
      return {
        success: false,
        errorMessage: 'Could not get wallet signer after network switch.'
      };
    }

    // The V2 registry authenticates the proof BEFORE recording it: it recovers
    // the signer from the attestation and requires it to equal the registered
    // TEE identity. The wallet only pays gas — it holds no authority (Flare's
    // relay model: gas payer != authority).
    if (!report.proof) {
      return {
        success: false,
        errorMessage: 'This report has no signed proof to anchor.',
      };
    }

    const contract = new ethers.Contract(
      VERIFLOW_REGISTRY_V2_ADDRESS,
      VERIFLOW_REGISTRY_V2_ABI,
      signer
    );

    // Step 5: Broadcast the real transaction — MetaMask pops up for approval.
    const attestation = report.proof.attestation;
    const tx = await contract.anchorVerification(
      [
        attestation.verificationId,
        attestation.subject,
        attestation.claimHash,
        attestation.result,
        attestation.issuedAt,
        attestation.expiresAt,
        attestation.codeMeasurement,
        attestation.attestationHash,
      ],
      report.proof.signature
    );

    const receipt = await tx.wait();
    const explorerUrl = `${FLARE_COSTON2_CONFIG.blockExplorerUrls[0]}/tx/${receipt.hash}`;

    return {
      success: true,
      txHash: receipt.hash,
      explorerUrl,
      blockNumber: receipt.blockNumber
    };
  } catch (err: any) {
    const msg = err?.reason || err?.shortMessage || err?.message || 'Unknown error';
    console.warn('Flare Coston2 on-chain anchoring skipped:', msg);
    return {
      success: false,
      errorMessage: msg
    };
  }
}
