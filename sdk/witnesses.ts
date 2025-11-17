/**
 * Witness provider implementations for Mailbox contract
 *
 * Witnesses are off-chain computations that provide data to ZK circuits.
 * Each witness corresponds to a witness declaration in mailbox.compact.
 */

import { Message, WitnessProviders, ISMMetadata } from './types.js';
import { computeMessageId, validateMessage } from './message.js';

/**
 * Mailbox state interface for witness providers
 */
interface MailboxStateProvider {
  getNonce: () => Promise<number>;
  getLatestMessageId: () => Promise<Uint8Array>;
  isDelivered: (messageId: Uint8Array) => Promise<boolean>;
  getSenderAddress: () => Promise<Uint8Array>;
}

/**
 * ISM validator interface
 */
interface ISMValidator {
  validateSignatures: (message: Message, metadata: Uint8Array) => Promise<boolean>;
}

/**
 * Create witness providers for Mailbox contract
 *
 * @param stateProvider - Provider for accessing ledger state
 * @param ismValidator - ISM validation logic
 * @returns Witness providers implementation
 */
export function createWitnessProviders(
  stateProvider: MailboxStateProvider,
  ismValidator: ISMValidator
): WitnessProviders {
  return {
    /**
     * Witness: getMessageId
     *
     * Computes Blake2b hash of the encoded message.
     * This is the primary identifier for messages.
     *
     * @param message - The message to hash
     * @returns Message ID (32 bytes)
     */
    async getMessageId(message: Message): Promise<Uint8Array> {
      validateMessage(message);
      return computeMessageId(message);
    },

    /**
     * Witness: checkDelivered
     *
     * Checks if a message has been delivered.
     * Returns 1 if delivered, 0 if not.
     *
     * @param messageId - Message ID to check
     * @returns 1 if delivered, 0 otherwise
     */
    async checkDelivered(messageId: Uint8Array): Promise<number> {
      const delivered = await stateProvider.isDelivered(messageId);
      return delivered ? 1 : 0;
    },

    /**
     * Witness: validateWithISM
     *
     * Validates message using Interchain Security Module.
     * For M1: Validates validator signatures against threshold.
     *
     * @param message - Message to validate
     * @param metadata - ISM metadata (signatures)
     * @throws Error if validation fails
     */
    async validateWithISM(message: Message, metadata: Uint8Array): Promise<void> {
      const isValid = await ismValidator.validateSignatures(message, metadata);
      if (!isValid) {
        throw new Error('ISM validation failed: insufficient valid signatures');
      }
    },

    /**
     * Witness: getZeroBytes
     *
     * Returns 32 zero bytes.
     * Used for initialization.
     *
     * @returns 32 zero bytes
     */
    async getZeroBytes(): Promise<Uint8Array> {
      return new Uint8Array(32);
    },

    /**
     * Witness: getSender
     *
     * Gets sender address from transaction context.
     * This should extract the sender from the current transaction.
     *
     * @returns Sender address (32 bytes)
     */
    async getSender(): Promise<Uint8Array> {
      return stateProvider.getSenderAddress();
    },

    /**
     * Witness: getLatestMessageId
     *
     * Retrieves the latest dispatched message ID from ledger.
     *
     * @returns Latest message ID (32 bytes)
     */
    async getLatestMessageId(): Promise<Uint8Array> {
      return stateProvider.getLatestMessageId();
    },

    /**
     * Witness: getCurrentNonce
     *
     * Retrieves current nonce value from Counter ledger variable.
     *
     * @returns Current nonce
     */
    async getCurrentNonce(): Promise<number> {
      return stateProvider.getNonce();
    },
  };
}

/**
 * Simple ISM validator (for M1 testing)
 *
 * Implements basic threshold validation:
 * - Checks that enough validators signed
 * - Verifies signatures match message hash
 *
 * For production, this should use proper signature verification.
 */
export class SimpleISMValidator implements ISMValidator {
  constructor(
    private validatorSet: Uint8Array[],  // Validator addresses
    private threshold: number             // Required signature count
  ) {
    if (threshold > validatorSet.length) {
      throw new Error('Threshold exceeds validator set size');
    }
  }

  /**
   * Validate signatures against message
   *
   * M1 Implementation: Simplified validation
   * - Decodes metadata to extract signatures
   * - Checks threshold is met
   *
   * TODO: Implement proper Ed25519/ECDSA signature verification
   *
   * @param message - Message to validate
   * @param metadata - Packed signatures
   * @returns true if valid
   */
  async validateSignatures(message: Message, metadata: Uint8Array): Promise<boolean> {
    try {
      const messageId = computeMessageId(message);

      // Parse metadata (format: signature_count | signatures)
      // For M1: Assume metadata format is:
      // [signature_count (1 byte)][signature1 (64 bytes)][signature2 (64 bytes)]...

      if (metadata.length < 1) {
        return false;
      }

      const signatureCount = metadata[0];

      if (signatureCount < this.threshold) {
        console.warn(`Insufficient signatures: ${signatureCount} < ${this.threshold}`);
        return false;
      }

      // For M1: We accept if threshold is met
      // TODO: Actually verify signatures with crypto library
      console.log(`ISM validation: ${signatureCount}/${this.validatorSet.length} signatures (threshold: ${this.threshold})`);

      return signatureCount >= this.threshold;
    } catch (error) {
      console.error('ISM validation error:', error);
      return false;
    }
  }
}

/**
 * Mock state provider for testing
 *
 * Provides in-memory state for development/testing.
 */
export class MockStateProvider implements MailboxStateProvider {
  private nonce: number = 0;
  private latestMessageId: Uint8Array = new Uint8Array(32);
  private deliveredMessages: Set<string> = new Set();
  private senderAddress: Uint8Array;

  constructor(senderAddress?: Uint8Array) {
    this.senderAddress = senderAddress || new Uint8Array(32);
    // Default sender: 0x0000...0001
    if (!senderAddress) {
      this.senderAddress[31] = 1;
    }
  }

  async getNonce(): Promise<number> {
    return this.nonce;
  }

  async getLatestMessageId(): Promise<Uint8Array> {
    return this.latestMessageId;
  }

  async isDelivered(messageId: Uint8Array): Promise<boolean> {
    const key = Buffer.from(messageId).toString('hex');
    return this.deliveredMessages.has(key);
  }

  async getSenderAddress(): Promise<Uint8Array> {
    return this.senderAddress;
  }

  // Helper methods for testing
  incrementNonce(): void {
    this.nonce++;
  }

  setLatestMessageId(messageId: Uint8Array): void {
    this.latestMessageId = messageId;
  }

  markDelivered(messageId: Uint8Array): void {
    const key = Buffer.from(messageId).toString('hex');
    this.deliveredMessages.add(key);
  }

  setSender(address: Uint8Array): void {
    this.senderAddress = address;
  }
}

/**
 * Create default witness providers for testing
 *
 * Uses mock state and simple ISM validator.
 *
 * @returns Mock witness providers
 */
export function createMockWitnessProviders(): {
  witnesses: WitnessProviders;
  stateProvider: MockStateProvider;
  ismValidator: SimpleISMValidator;
} {
  const stateProvider = new MockStateProvider();

  // Default validator set (3 validators, threshold 2)
  const validatorSet = [
    new Uint8Array(32), // validator 1
    new Uint8Array(32), // validator 2
    new Uint8Array(32), // validator 3
  ];
  validatorSet[0][31] = 1;
  validatorSet[1][31] = 2;
  validatorSet[2][31] = 3;

  const ismValidator = new SimpleISMValidator(validatorSet, 2);

  const witnesses = createWitnessProviders(stateProvider, ismValidator);

  return { witnesses, stateProvider, ismValidator };
}
