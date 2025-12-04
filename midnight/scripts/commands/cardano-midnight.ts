/**
 * Cardano → Midnight Message Delivery
 *
 * Demonstrates ECDSA signature verification for Hyperlane validator signatures.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { logger } from '../utils/index.js';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function cardanoToMidnight() {
  logger.info('Cardano → Midnight: ECDSA Verification Test');

  // =========================================================================
  // HARDCODED TEST DATA (simulates validator setup)
  // =========================================================================

  const { secretKey: validatorPrivateKey, publicKey: validatorPublicKey } = secp256k1.keygen();

  const testMessage = new TextEncoder().encode('Hello from Cardano');
  const messageId = keccak_256(testMessage);

  const signature = secp256k1.sign(messageId, validatorPrivateKey, { prehash: false });

  // =========================================================================
  // RELAYER RECEIVES (from Cardano indexer/validator network)
  // =========================================================================

  const receivedFromCardano = {
    messageId: messageId,                 // keccak256 of message
    validatorPublicKey: validatorPublicKey,  // known validator
    signature: signature,                 // ECDSA signature
  };

  logger.info({
    messageId: toHex(receivedFromCardano.messageId),
    validatorPublicKey: toHex(receivedFromCardano.validatorPublicKey),
    signature: toHex(receivedFromCardano.signature),
  }, 'Relayer received from Cardano');

  // =========================================================================
  // RELAYER VERIFIES (off-chain ECDSA verification)
  // =========================================================================

  const isValid = secp256k1.verify(
    receivedFromCardano.signature,
    receivedFromCardano.messageId,
    receivedFromCardano.validatorPublicKey,
    { prehash: false }
  );

  logger.info({ isValid }, 'ECDSA verification result');
}
