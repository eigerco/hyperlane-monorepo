import { createHash } from "crypto";

import {
  deployContract,
  type DeployedContract,
  findDeployedContract,
  type FoundContract
} from "@midnight-ntwrk/midnight-js-contracts";
import { ImpureCircuitId, MidnightProviders } from "@midnight-ntwrk/midnight-js-types";

import { Contract, type Message, type Witnesses } from "../../contracts/mailbox/build/contract/index.cjs";

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

// Encode message to bytes for hashing (1101 bytes total)
function encodeMessage(message: Message): Uint8Array {
  const buffer = new Uint8Array(1101);
  let offset = 0;

  // version: uint8 (1 byte)
  buffer[offset] = Number(message.version);
  offset += 1;

  // nonce: uint32 (4 bytes, big-endian)
  const nonceView = new DataView(buffer.buffer, offset, 4);
  nonceView.setUint32(0, Number(message.nonce), false);
  offset += 4;

  // origin: uint32 (4 bytes, big-endian)
  const originView = new DataView(buffer.buffer, offset, 4);
  originView.setUint32(0, Number(message.origin), false);
  offset += 4;

  // sender: bytes32 (32 bytes)
  buffer.set(message.sender.slice(0, 32), offset);
  offset += 32;

  // destination: uint32 (4 bytes, big-endian)
  const destView = new DataView(buffer.buffer, offset, 4);
  destView.setUint32(0, Number(message.destination), false);
  offset += 4;

  // recipient: bytes32 (32 bytes)
  buffer.set(message.recipient.slice(0, 32), offset);
  offset += 32;

  // bodyLength: uint16 (2 bytes, big-endian)
  const bodyLengthView = new DataView(buffer.buffer, offset, 2);
  bodyLengthView.setUint16(0, Number(message.bodyLength), false);
  offset += 2;

  // body: bytes1024 (1024 bytes)
  buffer.set(message.body.slice(0, 1024), offset);

  return buffer;
}

// Witness implementations
const witnesses: Witnesses<{}> = {
  // Compute message ID using Blake2b hash
  getMessageId(context, message) {
    const encoded = encodeMessage(message);
    const hash = createHash('blake2b512').update(encoded).digest();
    const messageId = new Uint8Array(hash.slice(0, 32));
    return [context.privateState, messageId];
  },

  // Check if message is delivered (returns 0 for now - not delivered)
  checkDelivered(context, messageId) {
    // TODO: Check against ledger state
    return [context.privateState, 0n];
  },

  // Validate with ISM - mock for now
  validateWithISM(context, message, metadata) {
    // TODO: Integrate with MultisigISM contract
    return [context.privateState, []];
  },

  // Return 32 zero bytes
  getZeroBytes(context) {
    return [context.privateState, new Uint8Array(32)];
  },

  // Get sender address - placeholder
  getSender(context) {
    // TODO: Get actual sender from transaction context
    return [context.privateState, new Uint8Array(32)];
  },

  // Get latest message ID from ledger
  getLatestMessageId(context) {
    return [context.privateState, new Uint8Array(32)];
  },

  // Get current nonce
  getCurrentNonce(context) {
    return [context.privateState, 0n];
  },
};

export class Mailbox {
  provider: MailboxProviders;
  contractInstance: MailboxContract = new Contract(witnesses);
  deployedContract?: DeployedMailboxContract;

  constructor(provider: MailboxProviders) {
    this.provider = provider;
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

  async dispatch(
    localDomainId: bigint,
    destination: bigint,
    recipient: Uint8Array,
    body: Uint8Array
  ) {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }

    // Pad body to 1024 bytes
    const paddedBody = new Uint8Array(1024);
    paddedBody.set(body.slice(0, 1024));

    const txData = await this.deployedContract.callTx.dispatch(
      localDomainId,
      destination,
      recipient,
      BigInt(body.length),
      paddedBody
    );

    return txData.public;
  }

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

    const txData = await this.deployedContract.callTx.deliver(
      localDomainId,
      message,
      paddedMetadata
    );
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
}

// Re-export Message type for convenience
export type { Message };
