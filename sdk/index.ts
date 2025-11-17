/**
 * Midnight Hyperlane SDK
 *
 * TypeScript SDK for interacting with Hyperlane Mailbox on Midnight blockchain.
 */

// Types
export * from './types.js';

// Message utilities
export {
  encodeMessage,
  computeMessageId,
  computeMessageIdKeccak256,
  createMessage,
  validateMessage,
  messageIdToHex,
  hexToMessageId,
  addressToBytes32,
  bytes32ToAddress,
} from './message.js';

// Witness providers
export {
  createWitnessProviders,
  createMockWitnessProviders,
  SimpleISMValidator,
  MockStateProvider,
} from './witnesses.js';

// Transaction builders
export {
  MailboxTransactionBuilder,
  MockTxExecutor,
  createISMMetadata,
  parseISMMetadata,
} from './transaction-builder.js';

// Configuration
export {
  MIDNIGHT_PREVIEW,
  MIDNIGHT_LOCAL,
  NETWORKS,
  HYPERLANE_DOMAINS,
  getNetworkConfig,
  getDomainName,
  ConfigBuilder,
  loadConfigFromEnv,
} from './config.js';

// Re-export types for convenience
export type {
  DispatchTxData,
  DeliverTxData,
  DeliveredCheckTxData,
  InitializeTxData,
} from './transaction-builder.js';
