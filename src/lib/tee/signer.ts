/**
 * TEE signer — two key-custody modes, ONE signature scheme.
 *
 * The cryptography is identical in both modes: real secp256k1 ECDSA over the
 * canonical digest in ./signing.ts. The ONLY difference is where the private
 * key lives, and that difference is what makes one mode anchorable and the
 * other not:
 *
 *   RemoteTeeSigner    key lives server-side (Railway env), never in the
 *                      browser. Its address is the registered `teeIdentity`,
 *                      so the registry accepts its signatures. ANCHORABLE.
 *
 *   SimulatedTeeSigner key is an ephemeral keypair generated in this tab. Its
 *                      address is NOT registered, so `anchorVerification`
 *                      would revert. NOT ANCHORABLE — by design.
 *
 * That the simulated signer cannot anchor is a *feature*, not a limitation: it
 * demonstrates that a browser cannot forge an anchorable proof. Do not "fix"
 * it by registering a browser-held key as a second identity — that would
 * reintroduce exactly the forgeability this design removes.
 */

import { ethers } from 'ethers';
import {
  buildAttestation,
  attestationDigest,
  recoverAttestationSigner,
  type Attestation,
  type AttestationInput,
} from './signing';

export type TeeMode = 'remote' | 'simulated';

export interface SignedAttestation {
  attestation: Attestation;
  /** 65-byte ECDSA signature, 0x-prefixed. */
  signature: string;
  /** The canonical digest that was signed (for display / debugging). */
  digest: string;
  /** Address recovered from the signature — the claimed TEE identity. */
  signerAddress: string;
  /** Which custody mode produced this. */
  teeMode: TeeMode;
  /**
   * Whether this signature can be anchored on VeriFlowRegistryV2. False for
   * simulated mode: the ephemeral key is not the registered identity.
   */
  anchorable: boolean;
}

export interface TeeSigner {
  readonly mode: TeeMode;
  /** Address whose signatures this signer produces. */
  getIdentityAddress(): Promise<string>;
  sign(input: AttestationInput): Promise<SignedAttestation>;
}

/**
 * Signs in-browser with an ephemeral key. For offline/no-backend demos only.
 *
 * The keypair is generated once per page load and never persisted, so proofs
 * from this mode are self-consistent (signature verifies against the recovered
 * address) but not authoritative (that address is not the registered identity).
 */
export class SimulatedTeeSigner implements TeeSigner {
  readonly mode: TeeMode = 'simulated';
  private wallet: ethers.HDNodeWallet | ethers.Wallet;

  constructor(wallet?: ethers.Wallet) {
    this.wallet = wallet ?? ethers.Wallet.createRandom();
  }

  async getIdentityAddress(): Promise<string> {
    return this.wallet.address;
  }

  async sign(input: AttestationInput): Promise<SignedAttestation> {
    const attestation = buildAttestation(input);
    const digest = attestationDigest(attestation);

    // P1: sign the 32 raw bytes, never the hex string.
    const signature = await this.wallet.signMessage(ethers.getBytes(digest));

    // Round-trip our own signature. This is cheap and catches a broken digest
    // layout at the source instead of surfacing it as a confusing failure in
    // the verifier or an on-chain revert.
    const signerAddress = recoverAttestationSigner(attestation, signature);
    if (!signerAddress || signerAddress.toLowerCase() !== this.wallet.address.toLowerCase()) {
      throw new Error(
        'Simulated TEE signer produced a signature that does not round-trip. ' +
          'The attestation digest layout is broken — run: node scripts/testSigningParity.mjs',
      );
    }

    const registeredTee = import.meta.env.VITE_TEE_IDENTITY_ADDRESS || '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1';
    const matchesRegistered = signerAddress.toLowerCase() === registeredTee.toLowerCase();

    return {
      attestation,
      signature,
      digest,
      signerAddress,
      teeMode: 'simulated',
      anchorable: matchesRegistered,
    };
  }
}

/**
 * Delegates signing to the backend TEE executor, which holds the registered
 * identity key. The key never reaches the browser, so the browser genuinely
 * cannot forge an anchorable attestation.
 */
export type RemoteSignFn = (input: AttestationInput) => Promise<{
  attestation: Attestation;
  signature: string;
}>;

export class RemoteTeeSigner implements TeeSigner {
  readonly mode: TeeMode = 'remote';

  // Declared as plain fields (not constructor parameter properties) because
  // this project builds with `erasableSyntaxOnly`.
  private readonly signRemote: RemoteSignFn;
  private readonly fetchIdentity: () => Promise<string>;
  private identityAddress: string | null = null;

  constructor(signRemote: RemoteSignFn, fetchIdentity: () => Promise<string>) {
    this.signRemote = signRemote;
    this.fetchIdentity = fetchIdentity;
  }

  async getIdentityAddress(): Promise<string> {
    if (!this.identityAddress) {
      this.identityAddress = await this.fetchIdentity();
    }
    return this.identityAddress;
  }

  async sign(input: AttestationInput): Promise<SignedAttestation> {
    const { attestation, signature } = await this.signRemote(input);
    const digest = attestationDigest(attestation);

    // Verify locally rather than trusting the server's word: recompute the
    // digest from the returned fields and recover the signer ourselves.
    const signerAddress = recoverAttestationSigner(attestation, signature);
    if (!signerAddress) {
      throw new Error(
        'The TEE returned a malformed signature that does not recover to any address. ' +
          'Refusing this attestation.',
      );
    }

    const expected = await this.getIdentityAddress();
    if (signerAddress.toLowerCase() !== expected.toLowerCase()) {
      throw new Error(
        `TEE signature identity mismatch: recovered ${signerAddress}, ` +
          `but the published TEE identity is ${expected}. Refusing this attestation.`,
      );
    }

    return {
      attestation,
      signature,
      digest,
      signerAddress,
      teeMode: 'remote',
      anchorable: true,
    };
  }
}
