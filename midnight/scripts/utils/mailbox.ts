import { createHash } from "crypto";

import {
  deployContract,
  type DeployedContract,
  findDeployedContract,
  type FoundContract
} from "@midnight-ntwrk/midnight-js-contracts";
import { ImpureCircuitId, MidnightProviders } from "@midnight-ntwrk/midnight-js-types";

import { Contract, type Message, type Witnesses } from "../../contracts/mailbox/build/contract/index.cjs";
import { logger } from "./index.js";

export type MailboxCircuits = ImpureCircuitId<Contract<{}>>;
export type MailboxProviders = MidnightProviders<
  MailboxCircuits,
  typeof MailboxPrivateStateId,
  {}
>;
export type MailboxContract = Contract<{}>;
export type DeployedMailboxContract =
  | DeployedContract<MailboxContract>
  | FoundContract<MailboxContract>;

export const MailboxPrivateStateId = "mailboxPrivateState";

// Convert various byte-like types to Uint8Array
function toUint8Array(value: unknown, expectedLength: number): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array((value as ArrayBufferView).buffer, (value as ArrayBufferView).byteOffset, (value as ArrayBufferView).byteLength);
  }
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }
  // Return zeros if we can't convert
  logger.warn({ valueType: typeof value, value }, 'Could not convert value to Uint8Array');
  return new Uint8Array(expectedLength);
}

// Encode message to bytes for hashing (1101 bytes total)
function encodeMessage(message: Message): Uint8Array {
  logger.debug({
    version: message.version?.toString(),
    nonce: message.nonce?.toString(),
    origin: message.origin?.toString(),
    senderType: message.sender?.constructor?.name,
    senderLength: message.sender?.length,
    senderByteLength: (message.sender as Uint8Array)?.byteLength,
    senderByteOffset: (message.sender as Uint8Array)?.byteOffset,
    destination: message.destination?.toString(),
    recipientType: message.recipient?.constructor?.name,
    recipientLength: message.recipient?.length,
    bodyLength: message.bodyLength?.toString(),
    bodyType: message.body?.constructor?.name,
    bodyActualLength: message.body?.length,
  }, 'encodeMessage input');

  const buffer = new Uint8Array(1101);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // version: uint8 (1 byte)
  buffer[offset] = Number(message.version);
  offset += 1;

  // nonce: uint32 (4 bytes, big-endian)
  view.setUint32(offset, Number(message.nonce), false);
  offset += 4;

  // origin: uint32 (4 bytes, big-endian)
  view.setUint32(offset, Number(message.origin), false);
  offset += 4;

  // sender: bytes32 (32 bytes) - copy byte by byte to avoid issues with typed array views
  const sender = toUint8Array(message.sender, 32);
  for (let i = 0; i < 32 && i < sender.length; i++) {
    buffer[offset + i] = sender[i];
  }
  offset += 32;

  // destination: uint32 (4 bytes, big-endian)
  view.setUint32(offset, Number(message.destination), false);
  offset += 4;

  // recipient: bytes32 (32 bytes) - copy byte by byte
  const recipient = toUint8Array(message.recipient, 32);
  for (let i = 0; i < 32 && i < recipient.length; i++) {
    buffer[offset + i] = recipient[i];
  }
  offset += 32;

  // bodyLength: uint16 (2 bytes, big-endian)
  view.setUint16(offset, Number(message.bodyLength), false);
  offset += 2;

  // body: bytes1024 (1024 bytes) - copy byte by byte
  const body = toUint8Array(message.body, 1024);
  for (let i = 0; i < 1024 && i < body.length; i++) {
    buffer[offset + i] = body[i];
  }

  return buffer;
}

// Helper to convert Uint8Array to hex string for logging/storage
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * MailboxState - tracks witness state for testing
 *
 * In production, this would read from on-chain ledger state.
 * For testing, we maintain state locally to verify the flow works.
 */
export class MailboxState {
  private nonce: bigint = 0n;
  private deliveredMessages: Set<string> = new Set();
  private latestMessageId: Uint8Array = new Uint8Array(32);
  private senderAddress: Uint8Array = new Uint8Array(32);

  // Set the sender address (call before dispatch)
  setSender(address: Uint8Array) {
    this.senderAddress = address;
  }

  // Get current nonce
  getNonce(): bigint {
    return this.nonce;
  }

  // Increment nonce (call after successful dispatch)
  incrementNonce() {
    this.nonce++;
  }

  // Check if message was delivered
  isDelivered(messageId: Uint8Array): boolean {
    return this.deliveredMessages.has(toHex(messageId));
  }

  // Mark message as delivered
  markDelivered(messageId: Uint8Array) {
    this.deliveredMessages.add(toHex(messageId));
  }

  // Set latest message ID
  setLatestMessageId(messageId: Uint8Array) {
    this.latestMessageId = messageId;
  }

  // Get latest message ID
  getLatestMessageId(): Uint8Array {
    return this.latestMessageId;
  }

  // Get sender address
  getSender(): Uint8Array {
    return this.senderAddress;
  }

  // Reset state (for testing)
  reset() {
    this.nonce = 0n;
    this.deliveredMessages.clear();
    this.latestMessageId = new Uint8Array(32);
    this.senderAddress = new Uint8Array(32);
  }

  // Debug: print current state
  debug() {
    logger.info({
      nonce: this.nonce.toString(),
      deliveredCount: this.deliveredMessages.size,
      latestMessageId: toHex(this.latestMessageId),
      sender: toHex(this.senderAddress),
    }, 'MailboxState');
  }
}

/**
 * Create witnesses that use the provided MailboxState
 */
function createWitnesses(state: MailboxState): Witnesses<{}> {
  return {
    // Compute message ID using Blake2b hash
    getMessageId(context, message) {
      const encoded = encodeMessage(message);
      const hash = createHash('blake2b512').update(encoded).digest();
      const messageId = new Uint8Array(hash.slice(0, 32));
      logger.debug(`[witness] getMessageId: ${toHex(messageId)}`);
      return [context.privateState, messageId];
    },

    // Check if message is delivered
    checkDelivered(context, messageId) {
      const isDelivered = state.isDelivered(messageId);
      logger.debug(`[witness] checkDelivered(${toHex(messageId)}): ${isDelivered ? 1n : 0n}`);
      return [context.privateState, isDelivered ? 1n : 0n];
    },

    // Validate with ISM - accepts all for testing
    validateWithISM(context, message, metadata) {
      // For testing: accept all messages
      // In production: verify validator signatures
      logger.debug(`[witness] validateWithISM: accepting message (test mode)`);
      return [context.privateState, []];
    },

    // Return 32 zero bytes
    getZeroBytes(context) {
      return [context.privateState, new Uint8Array(32)];
    },

    // Get sender address
    getSender(context) {
      const sender = state.getSender();
      logger.debug(`[witness] getSender: ${toHex(sender)}`);
      return [context.privateState, sender];
    },

    // Get latest message ID
    getLatestMessageId(context) {
      const messageId = state.getLatestMessageId();
      logger.debug(`[witness] getLatestMessageId: ${toHex(messageId)}`);
      return [context.privateState, messageId];
    },

    // Get current nonce
    getCurrentNonce(context) {
      const nonce = state.getNonce();
      logger.debug(`[witness] getCurrentNonce: ${nonce}`);
      return [context.privateState, nonce];
    },
  };
}

export class Mailbox {
  provider: MailboxProviders;
  state: MailboxState;
  contractInstance: MailboxContract;
  deployedContract?: DeployedMailboxContract;

  constructor(provider: MailboxProviders, state?: MailboxState) {
    this.provider = provider;
    // Use provided state or create new one
    this.state = state ?? new MailboxState();
    // Create contract with stateful witnesses
    this.contractInstance = new Contract(createWitnesses(this.state));
  }

  async deploy(): Promise<DeployedContract<MailboxContract>> {
    const deployedContract = await deployContract(this.provider, {
      contract: this.contractInstance,
      privateStateId: MailboxPrivateStateId,
      initialPrivateState: {},
    });
    this.deployedContract = deployedContract;
    return deployedContract;
  }

  async findDeployedContract(contractAddress: string) {
    this.deployedContract = await findDeployedContract(this.provider, {
      contractAddress,
      contract: this.contractInstance,
      privateStateId: MailboxPrivateStateId,
      initialPrivateState: {},
    });
  }

  async initialize() {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }
    const txData = await this.deployedContract.callTx.initialize();
    return txData.public;
  }

  /**
   * Dispatch a message to another chain
   *
   * @param localDomainId - This chain's Hyperlane domain ID
   * @param destination - Destination chain domain ID
   * @param recipient - Recipient address (32 bytes)
   * @param body - Message body (will be padded to 1024 bytes)
   * @param sender - Optional sender address (32 bytes). If not provided, uses zeros.
   */
  async dispatch(
    localDomainId: bigint,
    destination: bigint,
    recipient: Uint8Array,
    body: Uint8Array,
    sender?: Uint8Array
  ) {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }

    // Set sender in state before dispatch (witness will read it)
    if (sender) {
      this.state.setSender(sender);
    }

    // Pad body to 1024 bytes
    const paddedBody = new Uint8Array(1024);
    paddedBody.set(body.slice(0, 1024));

    logger.info({
      origin: localDomainId.toString(),
      destination: destination.toString(),
      recipient: toHex(recipient),
      bodyLength: body.length,
      nonceBefore: this.state.getNonce().toString(),
    }, 'Dispatching message');

    const txData = await this.deployedContract.callTx.dispatch(
      localDomainId,
      destination,
      recipient,
      BigInt(body.length),
      paddedBody
    );

    // After successful dispatch, update local state
    // (mirrors what the contract does on-chain)
    this.state.incrementNonce();
    // The messageId is returned from the circuit
    if (txData.public) {
      // txData.public should contain the return value (messageId)
      // For now, compute it ourselves to update state
      const messageId = computeMessageId({
        version: 3n,
        nonce: this.state.getNonce() - 1n, // nonce used was before increment
        origin: localDomainId,
        sender: sender ?? new Uint8Array(32),
        destination,
        recipient,
        bodyLength: BigInt(body.length),
        body: paddedBody,
      });
      this.state.setLatestMessageId(messageId);
      logger.info({ messageId: toHex(messageId) }, 'Message ID computed');
    }

    logger.info({ nonceAfter: this.state.getNonce().toString() }, 'Dispatch complete');

    return txData.public;
  }

  /**
   * Deliver a message from another chain
   *
   * @param localDomainId - This chain's Hyperlane domain ID
   * @param message - The message to deliver
   * @param metadata - ISM metadata (signatures, proofs). Empty for test mode.
   */
  async deliver(
    localDomainId: bigint,
    message: Message,
    metadata: Uint8Array
  ) {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }

    // Pad metadata to 1024 bytes
    const paddedMetadata = new Uint8Array(1024);
    paddedMetadata.set(metadata.slice(0, 1024));

    const messageId = computeMessageId(message);

    logger.info({
      messageId: toHex(messageId),
      origin: message.origin.toString(),
      destination: message.destination.toString(),
      localDomainId: localDomainId.toString(),
      nonce: message.nonce.toString(),
      alreadyDelivered: this.state.isDelivered(messageId),
    }, 'Delivering message');

    const txData = await this.deployedContract.callTx.deliver(
      localDomainId,
      message,
      paddedMetadata
    );

    // After successful delivery, mark as delivered in local state
    this.state.markDelivered(messageId);

    logger.info('Delivery complete');

    return txData.public;
  }

  async isDelivered(messageId: Uint8Array): Promise<boolean> {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }

    try {
      await this.deployedContract.callTx.delivered(messageId);
      return true;
    } catch {
      return false;
    }
  }

  async getLatestDispatchedId() {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }
    const txData = await this.deployedContract.callTx.latestDispatchedId();
    return txData.public;
  }

  // Debug helper
  debugState() {
    this.state.debug();
  }
}

/**
 * Compute message ID (Blake2b hash) - exported for testing
 */
export function computeMessageId(message: Message): Uint8Array {
  const encoded = encodeMessage(message);
  const hash = createHash('blake2b512').update(encoded).digest();
  return new Uint8Array(hash.slice(0, 32));
}

// Re-export Message type and toHex for convenience
export type { Message };
export { toHex };
