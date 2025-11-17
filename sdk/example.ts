/**
 * Example usage of Midnight Hyperlane SDK
 *
 * Demonstrates:
 * - Creating witness providers
 * - Building dispatch transaction
 * - Building deliver transaction
 * - Message serialization and hashing
 */

import {
  createMockWitnessProviders,
  MailboxTransactionBuilder,
  MockTxExecutor,
  createISMMetadata,
  addressToBytes32,
  messageIdToHex,
  HYPERLANE_DOMAINS,
  MIDNIGHT_PREVIEW,
} from './index.js';

async function main() {
  console.log('=== Midnight Hyperlane SDK Example ===\n');

  // 1. Create witness providers (mock for testing)
  console.log('1. Creating witness providers...');
  const { witnesses, stateProvider, ismValidator } = createMockWitnessProviders();
  console.log('   ✓ Witness providers created\n');

  // 2. Create transaction builder
  console.log('2. Creating transaction builder...');
  const mailboxAddress = 'midnight-mailbox-contract-address';
  const builder = new MailboxTransactionBuilder(witnesses, mailboxAddress);
  console.log(`   ✓ Builder created for contract: ${mailboxAddress}\n`);

  // 3. Build dispatch transaction (send message to Ethereum Sepolia)
  console.log('3. Building dispatch transaction...');
  const recipient = addressToBytes32('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0');
  const messageBody = Buffer.from('Hello from Midnight!', 'utf-8');

  const { message, messageId, txData: dispatchTx } = await builder.buildDispatch({
    localDomainId: MIDNIGHT_PREVIEW.domainId,
    destination: HYPERLANE_DOMAINS.sepolia,
    recipient,
    body: messageBody,
  });

  console.log('   Dispatch Transaction:');
  console.log(`   - Message ID: ${messageIdToHex(messageId)}`);
  console.log(`   - Nonce: ${message.nonce}`);
  console.log(`   - Origin: ${message.origin} (Midnight)`);
  console.log(`   - Destination: ${message.destination} (Sepolia)`);
  console.log(`   - Body length: ${message.bodyLength} bytes`);
  console.log(`   - Circuit: ${dispatchTx.circuit}`);
  console.log('   ✓ Dispatch transaction built\n');

  // 4. Simulate dispatch execution
  console.log('4. Executing dispatch transaction...');
  const executor = new MockTxExecutor();
  const dispatchResult = await executor.execute(dispatchTx);
  console.log(`   - Transaction ID: ${dispatchResult.txId}`);
  console.log(`   - Success: ${dispatchResult.success}`);
  console.log(`   - Message ID: ${messageIdToHex(dispatchResult.messageId!)}`);

  // Update mock state
  stateProvider.incrementNonce();
  stateProvider.setLatestMessageId(messageId);
  console.log('   ✓ Dispatch executed\n');

  // 5. Query latest dispatched message
  console.log('5. Querying latest dispatched message...');
  const latestId = await builder.getLatestDispatchedId();
  console.log(`   - Latest message ID: ${messageIdToHex(latestId)}`);
  console.log(`   - Matches dispatched: ${messageIdToHex(latestId) === messageIdToHex(messageId)}`);
  console.log('   ✓ Query successful\n');

  // 6. Build deliver transaction (receive message)
  console.log('6. Building deliver transaction...');

  // Create mock ISM metadata (2 signatures)
  const mockSignatures = [
    new Uint8Array(64).fill(1),  // Signature 1
    new Uint8Array(64).fill(2),  // Signature 2
  ];
  const metadata = createISMMetadata(mockSignatures);

  const { messageId: deliverMessageId, txData: deliverTx } = await builder.buildDeliver({
    localDomainId: MIDNIGHT_PREVIEW.domainId,
    message,
    metadata,
  });

  console.log('   Deliver Transaction:');
  console.log(`   - Message ID: ${messageIdToHex(deliverMessageId)}`);
  console.log(`   - Circuit: ${deliverTx.circuit}`);
  console.log(`   - Metadata size: ${metadata.length} bytes`);
  console.log('   ✓ Deliver transaction built\n');

  // 7. Simulate deliver execution
  console.log('7. Executing deliver transaction...');
  const deliverResult = await executor.execute(deliverTx);
  console.log(`   - Transaction ID: ${deliverResult.txId}`);
  console.log(`   - Success: ${deliverResult.success}`);

  // Mark as delivered
  stateProvider.markDelivered(messageId);
  console.log('   ✓ Deliver executed\n');

  // 8. Check delivered status
  console.log('8. Checking delivered status...');
  const { delivered, txData: deliveredCheckTx } = await builder.buildDeliveredCheck(messageId);
  console.log(`   - Message delivered: ${delivered}`);
  console.log(`   - Circuit: ${deliveredCheckTx.circuit}`);
  console.log('   ✓ Status check successful\n');

  // 9. Try to deliver again (should fail)
  console.log('9. Testing replay prevention...');
  try {
    await builder.buildDeliver({
      localDomainId: MIDNIGHT_PREVIEW.domainId,
      message,
      metadata,
    });
    console.log('   ✗ ERROR: Replay prevention failed!');
  } catch (error) {
    console.log(`   ✓ Replay prevented: ${(error as Error).message}\n`);
  }

  // 10. Summary
  console.log('=== Summary ===');
  console.log(`✓ Dispatched message: ${messageIdToHex(messageId)}`);
  console.log(`✓ Delivered message: ${messageIdToHex(deliverMessageId)}`);
  console.log(`✓ Current nonce: ${await witnesses.getCurrentNonce()}`);
  console.log(`✓ Network: Midnight Preview (domain ${MIDNIGHT_PREVIEW.domainId})`);
  console.log(`✓ Target chain: Sepolia (domain ${HYPERLANE_DOMAINS.sepolia})`);
  console.log('\n=== Example Complete ===');
}

// Run example
main().catch((error) => {
  console.error('Example failed:', error);
  process.exit(1);
});
