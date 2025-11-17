/**
 * TypeScript type definitions for Midnight Hyperlane SDK
 */

/**
 * Hyperlane Message (matches message.compact struct)
 */
export interface Message {
  version: number;           // uint8 - Protocol version (3)
  nonce: number;             // uint32 - Message nonce
  origin: number;            // uint32 - Source chain domain ID
  sender: Uint8Array;        // bytes32 - Sender address
  destination: number;       // uint32 - Destination chain domain ID
  recipient: Uint8Array;     // bytes32 - Recipient address
  bodyLength: number;        // uint16 - Actual body length
  body: Uint8Array;          // bytes1024 - Message payload
}

/**
 * Dispatch transaction parameters
 */
export interface DispatchParams {
  localDomainId: number;     // This chain's domain ID
  destination: number;        // Destination chain domain
  recipient: Uint8Array;      // Recipient address (32 bytes)
  body: Uint8Array;           // Message payload (will be padded to 1024)
}

/**
 * Deliver transaction parameters
 */
export interface DeliverParams {
  localDomainId: number;      // This chain's domain ID
  message: Message;           // The message to deliver
  metadata: Uint8Array;       // ISM validation data (signatures)
}

/**
 * ISM validation metadata
 */
export interface ISMMetadata {
  signatures: ValidatorSignature[];
  threshold: number;
}

/**
 * Validator signature
 */
export interface ValidatorSignature {
  validator: Uint8Array;      // Validator address (32 bytes)
  signature: Uint8Array;      // Signature bytes
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  rpcUrl: string;             // Ogmios RPC endpoint
  indexerUrl: string;         // GraphQL indexer endpoint
  provingServerUrl: string;   // ZK proving server
  faucetUrl?: string;         // Faucet for test tokens
  domainId: number;           // Hyperlane domain ID
}

/**
 * Mailbox contract state
 */
export interface MailboxState {
  nonce: number;
  latestDispatchedMessageId: Uint8Array;
  deliveredMessages: Map<string, boolean>; // messageId (hex) => delivered
}

/**
 * Transaction result
 */
export interface TxResult {
  txId: string;
  success: boolean;
  error?: string;
  messageId?: Uint8Array;     // For dispatch transactions
}

/**
 * Witness provider interface
 */
export interface WitnessProviders {
  getMessageId: (message: Message) => Promise<Uint8Array>;
  checkDelivered: (messageId: Uint8Array) => Promise<number>;
  validateWithISM: (message: Message, metadata: Uint8Array) => Promise<void>;
  getZeroBytes: () => Promise<Uint8Array>;
  getSender: () => Promise<Uint8Array>;
  getLatestMessageId: () => Promise<Uint8Array>;
  getCurrentNonce: () => Promise<number>;
}
