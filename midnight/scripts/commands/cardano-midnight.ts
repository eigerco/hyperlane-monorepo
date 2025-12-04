/**
 * Cardano → Midnight Message Delivery
 *
 * Demonstrates ECDSA signature verification for Hyperlane validator signatures.
 * Uses 2/3 threshold multisig.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { logger } from '../utils/index.js';

// =============================================================================
// Types
// =============================================================================

interface ValidatorSignature {
  validator: Uint8Array;
  signature: Uint8Array;
}

interface CardanoMessage {
  messageId: Uint8Array;
  signatures: ValidatorSignature[];
}

interface ValidatorSet {
  validators: Uint8Array[];
  threshold: number;
}

// =============================================================================
// Helpers
// =============================================================================

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// Simulates data received from Cardano (indexer/validator network)
// =============================================================================

function getDataFromCardano(): { message: CardanoMessage; validatorSet: ValidatorSet } {
  // 3 validators
  const validator1 = secp256k1.keygen();
  const validator2 = secp256k1.keygen();
  const validator3 = secp256k1.keygen();

  const validatorSet: ValidatorSet = {
    validators: [validator1.publicKey, validator2.publicKey, validator3.publicKey],
    threshold: 2,
  };

  // Message
  const testMessage = new TextEncoder().encode('Hello from Cardano');
  const messageId = keccak_256(testMessage);

  // Validators 1 and 2 sign (validator 3 is offline)
  const sig1 = secp256k1.sign(messageId, validator1.secretKey, { prehash: false });
  const sig2 = secp256k1.sign(messageId, validator2.secretKey, { prehash: false });

  const message: CardanoMessage = {
    messageId,
    signatures: [
      { validator: validator1.publicKey, signature: sig1 },
      { validator: validator2.publicKey, signature: sig2 },
    ],
  };

  return { message, validatorSet };
}

// =============================================================================
// Relayer verifies signatures off-chain
// =============================================================================

function verifyData(message: CardanoMessage, validatorSet: ValidatorSet): boolean {
  let validCount = 0;

  for (const { validator, signature } of message.signatures) {
    const isKnownValidator = validatorSet.validators.some(v => toHex(v) === toHex(validator));
    if (!isKnownValidator) {
      logger.warn({ validator: toHex(validator) }, 'Unknown validator');
      continue;
    }

    const isValid = secp256k1.verify(signature, message.messageId, validator, { prehash: false });
    logger.info({ validator: toHex(validator).slice(0, 16) + '...', isValid }, 'Signature');

    if (isValid) validCount++;
  }

  const thresholdMet = validCount >= validatorSet.threshold;
  logger.info({ validCount, threshold: validatorSet.threshold, thresholdMet }, 'Result');

  return thresholdMet;
}

// =============================================================================
// Main
// =============================================================================

export async function cardanoToMidnight() {
  logger.info('Cardano → Midnight: ECDSA Verification (2/3 threshold)');

  const { message, validatorSet } = getDataFromCardano();
  const isValid = verifyData(message, validatorSet);

  logger.info({ isValid }, 'Verification complete');
}
