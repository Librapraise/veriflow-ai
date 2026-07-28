/**
 * Real Web3 & MetaMask Wallet Integration for Flare Coston2 Testnet
 */

import { ethers } from 'ethers';
import { FLARE_COSTON2_CONFIG } from '../config/contracts';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletConnectionState {
  address: string;
  chainId: number;
  isConnected: boolean;
  isCoston2Network: boolean;
}

/**
 * Prompts user to connect MetaMask and auto-switches to Flare Coston2 Testnet (Chain ID 114)
 */
export async function connectMetaMaskWallet(): Promise<WalletConnectionState> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask browser extension.');
  }

  // Request accounts access
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts selected in MetaMask.');
  }

  const address = accounts[0];

  // Check current network chain ID
  let currentChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
  let currentChainId = parseInt(currentChainIdHex, 16);

  // Switch network if not on Coston2
  if (currentChainId !== FLARE_COSTON2_CONFIG.chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FLARE_COSTON2_CONFIG.chainIdHex }]
      });
      currentChainId = FLARE_COSTON2_CONFIG.chainId;
    } catch (switchError: any) {
      // Unrecognized chain (4902) -> Add Flare Coston2 Network
      if (switchError.code === 4902 || switchError?.message?.includes('Unrecognized chain')) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: FLARE_COSTON2_CONFIG.chainIdHex,
              chainName: FLARE_COSTON2_CONFIG.chainName,
              nativeCurrency: FLARE_COSTON2_CONFIG.nativeCurrency,
              rpcUrls: FLARE_COSTON2_CONFIG.rpcUrls,
              blockExplorerUrls: FLARE_COSTON2_CONFIG.blockExplorerUrls
            }
          ]
        });
        currentChainId = FLARE_COSTON2_CONFIG.chainId;
      } else {
        console.warn('Network switch declined by user:', switchError);
      }
    }
  }

  return {
    address,
    chainId: currentChainId,
    isConnected: true,
    isCoston2Network: currentChainId === FLARE_COSTON2_CONFIG.chainId
  };
}

/**
 * Gets the current Web3 Provider / Signer
 */
export async function getWeb3Signer(): Promise<ethers.Signer | null> {
  if (!window.ethereum) return null;
  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.getSigner();
}
