/**
 * Transaction builders for Mailbox contract
 *
 * Constructs transactions for dispatch and deliver operations.
 */

import { Message, DispatchParams, DeliverParams, WitnessProviders, TxResult } from './types.js';
import { createMessage, validateMessage, computeMessageId } from './message.js';

/**
 * Mailbox transaction builder
 *
 * Provides high-level API for interacting with Mailbox contract.
 */
export class MailboxTransactionBuilder {
  constructor(
    private witnesses: WitnessProviders,
    private contractAddress: string
  ) {}

  /**
   * Build dispatch transaction
   *
   * Creates a transaction to send a cross-chain message.
   *
   * @param params - Dispatch parameters
   * @returns Transaction data ready for signing and submission
   */
  async buildDispatch(params: DispatchParams): Promise<{
    message: Message;
    messageId: Uint8Array;
    txData: DispatchTxData;
  }> {
    // Get current nonce
    const nonce = await this.witnesses.getCurrentNonce();

    // Get sender address
    const sender = await this.witnesses.getSender();

    // Create message with padding
    const message = createMessage({
      version: 3,
      nonce,
      origin: params.localDomainId,
      sender,
      destination: params.destination,
      recipient: params.recipient,
      body: params.body,
    });

    // Validate message
    validateMessage(message);

    // Compute message ID
    const messageId = await this.witnesses.getMessageId(message);

    // Build transaction data
    const txData: DispatchTxData = {
      circuit: 'dispatch',
      args: {
        localDomainId: params.localDomainId,
        destination: params.destination,
        recipient: params.recipient,
        bodyLength: message.bodyLength,
        body: message.body,
      },
      witnesses: {
        getCurrentNonce: nonce,
        getSender: sender,
        getMessageId: messageId,
      },
    };

    return { message, messageId, txData };
  }

  /**
   * Build deliver transaction
   *
   * Creates a transaction to receive and validate a cross-chain message.
   *
   * @param params - Deliver parameters
   * @returns Transaction data ready for signing and submission
   */
  async buildDeliver(params: DeliverParams): Promise<{
    messageId: Uint8Array;
    txData: DeliverTxData;
  }> {
    const { localDomainId, message, metadata } = params;

    // Validate message
    validateMessage(message);

    // Compute message ID
    const messageId = await this.witnesses.getMessageId(message);

    // Check if already delivered
    const deliveredStatus = await this.witnesses.checkDelivered(messageId);
    if (deliveredStatus === 1) {
      throw new Error(`Message ${Buffer.from(messageId).toString('hex')} already delivered`);
    }

    // Validate with ISM (this will throw if invalid)
    await this.witnesses.validateWithISM(message, metadata);

    // Build transaction data
    const txData: DeliverTxData = {
      circuit: 'deliver',
      args: {
        localDomainId,
        message,
        metadata,
      },
      witnesses: {
        getMessageId: messageId,
        checkDelivered: deliveredStatus,
        // validateWithISM has no return value, just validates
      },
    };

    return { messageId, txData };
  }

  /**
   * Build delivered check transaction
   *
   * Checks if a message has been delivered.
   *
   * @param messageId - Message ID to check
   * @returns Transaction data
   */
  async buildDeliveredCheck(messageId: Uint8Array): Promise<{
    delivered: boolean;
    txData: DeliveredCheckTxData;
  }> {
    const deliveredStatus = await this.witnesses.checkDelivered(messageId);

    const txData: DeliveredCheckTxData = {
      circuit: 'delivered',
      args: {
        messageId,
      },
      witnesses: {
        checkDelivered: deliveredStatus,
      },
    };

    return {
      delivered: deliveredStatus === 1,
      txData,
    };
  }

  /**
   * Query latest dispatched message ID
   *
   * @returns Latest message ID
   */
  async getLatestDispatchedId(): Promise<Uint8Array> {
    return this.witnesses.getLatestMessageId();
  }

  /**
   * Build initialize transaction
   *
   * Initializes the Mailbox contract (call once during deployment).
   *
   * @returns Transaction data
   */
  async buildInitialize(): Promise<InitializeTxData> {
    const zeroBytes = await this.witnesses.getZeroBytes();

    return {
      circuit: 'initialize',
      args: {},
      witnesses: {
        getZeroBytes: zeroBytes,
      },
    };
  }
}

/**
 * Transaction data types
 */

export interface DispatchTxData {
  circuit: 'dispatch';
  args: {
    localDomainId: number;
    destination: number;
    recipient: Uint8Array;
    bodyLength: number;
    body: Uint8Array;
  };
  witnesses: {
    getCurrentNonce: number;
    getSender: Uint8Array;
    getMessageId: Uint8Array;
  };
}

export interface DeliverTxData {
  circuit: 'deliver';
  args: {
    localDomainId: number;
    message: Message;
    metadata: Uint8Array;
  };
  witnesses: {
    getMessageId: Uint8Array;
    checkDelivered: number;
  };
}

export interface DeliveredCheckTxData {
  circuit: 'delivered';
  args: {
    messageId: Uint8Array;
  };
  witnesses: {
    checkDelivered: number;
  };
}

export interface InitializeTxData {
  circuit: 'initialize';
  args: Record<string, never>;
  witnesses: {
    getZeroBytes: Uint8Array;
  };
}

/**
 * Helper: Create metadata for ISM validation
 *
 * Packs validator signatures into metadata bytes.
 * Format: [signature_count (1 byte)][signature1 (64 bytes)][signature2 (64 bytes)]...
 *
 * @param signatures - Array of signatures
 * @returns Packed metadata (padded to 1024 bytes)
 */
export function createISMMetadata(signatures: Uint8Array[]): Uint8Array {
  const metadata = new Uint8Array(1024);
  let offset = 0;

  // Write signature count
  metadata[offset] = signatures.length;
  offset += 1;

  // Write signatures (assume 64 bytes each for Ed25519)
  for (const sig of signatures) {
    const sigBytes = sig.slice(0, 64);
    metadata.set(sigBytes, offset);
    offset += 64;
  }

  return metadata;
}

/**
 * Helper: Parse ISM metadata
 *
 * Extracts signatures from metadata bytes.
 *
 * @param metadata - Packed metadata
 * @returns Array of signatures
 */
export function parseISMMetadata(metadata: Uint8Array): Uint8Array[] {
  if (metadata.length < 1) {
    return [];
  }

  const signatureCount = metadata[0];
  const signatures: Uint8Array[] = [];
  let offset = 1;

  for (let i = 0; i < signatureCount && offset + 64 <= metadata.length; i++) {
    const sig = metadata.slice(offset, offset + 64);
    signatures.push(sig);
    offset += 64;
  }

  return signatures;
}

/**
 * Mock transaction executor for testing
 *
 * Simulates transaction execution without actual blockchain interaction.
 */
export class MockTxExecutor {
  private txCount = 0;

  async execute(txData: DispatchTxData | DeliverTxData | DeliveredCheckTxData | InitializeTxData): Promise<TxResult> {
    this.txCount++;

    const txId = `mock-tx-${this.txCount}-${Date.now()}`;

    console.log(`[MockTx] Executing ${txData.circuit} transaction: ${txId}`);
    console.log(`[MockTx] Witnesses:`, Object.keys(txData.witnesses));

    // Simulate success
    const result: TxResult = {
      txId,
      success: true,
    };

    // Add message ID for dispatch
    if (txData.circuit === 'dispatch') {
      result.messageId = txData.witnesses.getMessageId;
    }

    return result;
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * import { createMockWitnessProviders } from './witnesses.js';
 * import { MailboxTransactionBuilder } from './transaction-builder.js';
 *
 * // Create witness providers
 * const { witnesses } = createMockWitnessProviders();
 *
 * // Create transaction builder
 * const builder = new MailboxTransactionBuilder(witnesses, 'mailbox-contract-address');
 *
 * // Build dispatch transaction
 * const { message, messageId, txData } = await builder.buildDispatch({
 *   localDomainId: 99999,
 *   destination: 1,
 *   recipient: recipientBytes,
 *   body: Buffer.from('Hello, Ethereum!'),
 * });
 *
 * console.log('Message ID:', Buffer.from(messageId).toString('hex'));
 *
 * // Execute transaction (with real wallet/provider)
 * // const result = await provider.submitTx(txData);
 * ```
 */
