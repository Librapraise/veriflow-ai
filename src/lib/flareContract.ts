/**
 * Flare Coston2 Smart Contract Anchoring Service
 * Submits signed verification reports directly to the VeriFlowRegistry smart contract on-chain.
 */

import { ethers } from 'ethers';
import { FLARE_COSTON2_CONFIG, VERIFLOW_REGISTRY_ADDRESS, VERIFLOW_REGISTRY_ABI } from '../config/contracts';
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
 * Anchors a verification report on the Flare Coston2 blockchain.
 */
export async function anchorVerificationOnFlare(
  report: VerificationReport
): Promise<OnChainAnchorResult> {
  try {
    const signer = await getWeb3Signer();
    if (!signer) {
      return {
        success: false,
        errorMessage: 'Wallet not connected — verification is cryptographically signed off-chain only.'
      };
    }

    // Convert string IDs to bytes32 format for EVM Solidity contract
    const verIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(report.id));
    const claimHashBytes32 = report.hash.startsWith('0x') ? report.hash : `0x${report.hash}`;
    const attestationHashBytes32 = ethers.keccak256(ethers.toUtf8Bytes(report.attestationId));
    const signatureBytes = report.signature.startsWith('0x') ? report.signature : `0x${report.signature}`;

    const contract = new ethers.Contract(
      VERIFLOW_REGISTRY_ADDRESS,
      VERIFLOW_REGISTRY_ABI,
      signer
    );

    // Broadcast real transaction to Flare Coston2 Testnet
    const tx = await contract.anchorVerification(
      verIdBytes32,
      claimHashBytes32,
      report.result,
      attestationHashBytes32,
      signatureBytes
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
    console.warn('Flare Coston2 on-chain anchoring skipped (contract not deployed or tx rejected):', err?.message);
    // Return no txHash — the verification is still cryptographically valid off-chain
    return {
      success: false,
      errorMessage: err?.message
    };
  }
}
