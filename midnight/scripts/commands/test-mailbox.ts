import { Mailbox, MailboxState, computeMessageId, toHex, type Message } from '../utils/mailbox.js';
import { configureMailboxProviders, getWallet, logger, waitForSync, type WalletName } from '../utils/index.js';

// Test domain IDs
const MIDNIGHT_DOMAIN = 1000n;  // Example domain ID for Midnight
const CARDANO_DOMAIN = 2000n;   // Example domain ID for Cardano

// Helper to create a test recipient address
function createTestAddress(name: string): Uint8Array {
  const addr = new Uint8Array(32);
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(name);
  addr.set(nameBytes.slice(0, 32));
  return addr;
}

// Helper to create a test message body
function createTestBody(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

export async function testMailbox(walletName: WalletName, contractAddress?: string) {
  try {
    const wallet = await getWallet(walletName);
    await waitForSync(wallet, walletName);

    const providers = await configureMailboxProviders(wallet);

    // Create shared state for testing
    const mailboxState = new MailboxState();
    const mailbox = new Mailbox(providers, mailboxState);

    // Step 1: Deploy or find existing contract
    if (contractAddress) {
      logger.info(`Finding existing mailbox at ${contractAddress}...`);
      await mailbox.findDeployedContract(contractAddress);
      logger.info('Found mailbox contract');
    } else {
      logger.info('Deploying new mailbox contract...');
      const deployed = await mailbox.deploy();
      contractAddress = deployed.deployTxData.public.contractAddress;
      logger.info(`Mailbox deployed at: ${contractAddress}`);

      logger.info('Initializing mailbox...');
      await mailbox.initialize();
      logger.info('Mailbox initialized');
    }

    // Debug initial state
    logger.info('Initial state:');
    mailbox.debugState();

    // Step 2: Test dispatch (send message from Midnight to Cardano)
    logger.info('\n--- TEST 1: Dispatch message ---');

    const senderAddr = createTestAddress('alice');
    const recipientAddr = createTestAddress('bob-on-cardano');
    const body1 = createTestBody('Hello from Midnight!');

    const dispatchResult = await mailbox.dispatch(
      MIDNIGHT_DOMAIN,
      CARDANO_DOMAIN,
      recipientAddr,
      body1,
      senderAddr
    );

    logger.info(`Dispatch result block: ${dispatchResult?.blockHeight}`);
    mailbox.debugState();

    // Step 3: Dispatch second message (verify nonce increments)
    logger.info('\n--- TEST 2: Dispatch second message ---');

    const body2 = createTestBody('Second message');
    await mailbox.dispatch(
      MIDNIGHT_DOMAIN,
      CARDANO_DOMAIN,
      recipientAddr,
      body2,
      senderAddr
    );

    mailbox.debugState();

    // Step 4: Test deliver (receive message from Cardano)
    logger.info('\n--- TEST 3: Deliver message from Cardano ---');

    // Create a message as if it came from Cardano
    const inboundBody = new Uint8Array(1024);
    const inboundText = createTestBody('Hello from Cardano!');
    inboundBody.set(inboundText);

    const inboundMessage: Message = {
      version: 3n,
      nonce: 0n,                           // First message from Cardano
      origin: CARDANO_DOMAIN,              // Came from Cardano
      sender: createTestAddress('charlie-on-cardano'),
      destination: MIDNIGHT_DOMAIN,        // Going to Midnight
      recipient: createTestAddress('alice'),
      bodyLength: BigInt(inboundText.length),
      body: inboundBody,
    };

    // Empty metadata for test mode (ISM accepts all)
    const metadata = new Uint8Array(0);

    await mailbox.deliver(MIDNIGHT_DOMAIN, inboundMessage, metadata);
    mailbox.debugState();

    // Step 5: Try to deliver same message again (should fail - replay protection)
    logger.info('\n--- TEST 4: Replay attack prevention ---');

    try {
      await mailbox.deliver(MIDNIGHT_DOMAIN, inboundMessage, metadata);
      logger.error('ERROR: Replay attack succeeded! This should not happen.');
    } catch (error) {
      logger.info('SUCCESS: Replay attack prevented (message already delivered)');
    }

    // Step 6: Check if message is delivered
    logger.info('\n--- TEST 5: Check delivery status ---');

    const messageId = computeMessageId(inboundMessage);
    const isDelivered = mailboxState.isDelivered(messageId);
    logger.info(`Message ${toHex(messageId).slice(0, 16)}... delivered: ${isDelivered}`);

    // Step 7: Deliver message with wrong destination (should fail)
    logger.info('\n--- TEST 6: Wrong destination ---');

    const wrongDestMessage: Message = {
      ...inboundMessage,
      nonce: 1n,
      destination: 9999n, // Wrong destination
    };

    try {
      await mailbox.deliver(MIDNIGHT_DOMAIN, wrongDestMessage, metadata);
      logger.error('ERROR: Wrong destination accepted! This should not happen.');
    } catch (error) {
      logger.info('SUCCESS: Message with wrong destination rejected');
    }

    // Final state
    logger.info('\n--- Final State ---');
    mailbox.debugState();

    logger.info('\n=== All tests completed! ===');
    logger.info(`Contract address: ${contractAddress}`);

    await wallet.close();
    return contractAddress;

  } catch (error) {
    logger.error({ error, stack: (error as Error).stack }, 'Error in mailbox test');
    process.exit(1);
  }
}
