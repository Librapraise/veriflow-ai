import fs from 'fs';
import { ethers } from 'ethers';
import { computeAttestationDigest, hashUtf8 } from './lib/attestation.mjs';

const wallet = ethers.Wallet.createRandom();

const now = Math.floor(Date.now() / 1000);
const attestation = {
  verificationId: hashUtf8('ver_test_123456'),
  subject: wallet.address,
  claimHash: hashUtf8('age_above_18'),
  result: true,
  issuedAt: now,
  expiresAt: now + 90 * 86400,
  codeMeasurement: '0xd84e5ababec001f7d94523e6c48f2a3de09060f032abc3744e5262a32fded72d',
  attestationHash: hashUtf8('att_test123'),
};

const digest = computeAttestationDigest(attestation);
const signature = await wallet.signMessage(ethers.getBytes(digest));

const proofObj = {
  attestation,
  signature,
  digest,
  signerAddress: wallet.address,
  teeMode: 'simulated',
  anchorable: false,
};

fs.writeFileSync('scripts/testProofFixture.json', JSON.stringify(proofObj, null, 2));
console.log('Test proof fixture written to scripts/testProofFixture.json');
