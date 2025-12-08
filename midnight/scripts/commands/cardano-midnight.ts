/**
 * Cardano → Midnight Message Delivery
 *
 * Demonstrates full Hyperlane flow:
 * 1. Simulate message + validator signatures from Cardano
 * 2. ISM.verify() - verify validator signatures via witness
 * 3. Mailbox.deliver() - deliver message to Midnight
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { configureMailboxProviders, configureISMProviders, getWallet, logger, waitForSync, type WalletName } from '../utils/index.js';
import { Mailbox, MailboxState, type Message } from '../utils/mailbox.js';
import { ISM, createISMMetadata } from '../utils/ism.js';

// =============================================================================
// Types
// =============================================================================

// Hyperlane message format
interface HyperlaneMessage {
  version: bigint;
  nonce: bigint;
  origin: bigint;
  sender: Uint8Array;
  destination: bigint;
  recipient: Uint8Array;
  body: Uint8Array;
}

interface ValidatorSignature {
  validator: Uint8Array;       // Compressed public key (33 bytes)
  signature: Uint8Array;       // Raw signature bytes (64 bytes: r || s)
}

// What relayer receives from Cardano
interface CardanoData {
  message: HyperlaneMessage;
  messageId: Uint8Array;           // keccak256(message) - canonical Hyperlane ID
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
// Constants
// =============================================================================

const CARDANO_DOMAIN = 1001n;
const MIDNIGHT_DOMAIN = 2001n;

// =============================================================================
// Simulates data received from Cardano (indexer/validator network)
// =============================================================================

function encodeHyperlaneMessage(message: HyperlaneMessage): Uint8Array {
  // Hyperlane message format (fixed size for simplicity)
  const buffer = new Uint8Array(1024);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // version (1 byte)
  buffer[offset] = Number(message.version);
  offset += 1;

  // nonce (4 bytes)
  view.setUint32(offset, Number(message.nonce), false);
  offset += 4;

  // origin (4 bytes)
  view.setUint32(offset, Number(message.origin), false);
  offset += 4;

  // sender (32 bytes)
  buffer.set(message.sender.slice(0, 32), offset);
  offset += 32;

  // destination (4 bytes)
  view.setUint32(offset, Number(message.destination), false);
  offset += 4;

  // recipient (32 bytes)
  buffer.set(message.recipient.slice(0, 32), offset);
  offset += 32;

  // body
  buffer.set(message.body, offset);

  return buffer;
}

function getDataFromCardano(): { data: CardanoData; validatorSet: ValidatorSet } {
  // 3 validators
  const validator1 = secp256k1.keygen();
  const validator2 = secp256k1.keygen();
  const validator3 = secp256k1.keygen();

  const validatorSet: ValidatorSet = {
    validators: [validator1.publicKey, validator2.publicKey, validator3.publicKey],
    threshold: 2,
  };

  // Hyperlane message
  const message: HyperlaneMessage = {
    version: 3n,
    nonce: 42n,
    origin: CARDANO_DOMAIN,
    sender: new Uint8Array(32).fill(0xAA),   // Test sender on Cardano
    destination: MIDNIGHT_DOMAIN,
    recipient: new Uint8Array(32).fill(0xBB), // Test recipient on Midnight
    body: new TextEncoder().encode('Hello from Cardano'),
  };

  // Canonical messageId = keccak256(encoded message)
  const encodedMessage = encodeHyperlaneMessage(message);
  const messageId = keccak_256(encodedMessage);

  // Validators sign the messageId (returns 64-byte compact signature: r || s)
  const sig1 = secp256k1.sign(messageId, validator1.secretKey, { prehash: false });
  const sig2 = secp256k1.sign(messageId, validator2.secretKey, { prehash: false });

  const data: CardanoData = {
    message,
    messageId,
    signatures: [
      { validator: validator1.publicKey, signature: sig1 },
      { validator: validator2.publicKey, signature: sig2 },
    ],
  };

  return { data, validatorSet };
}

// =============================================================================
// Relayer verifies signatures off-chain
// =============================================================================

function verifyData(data: CardanoData, validatorSet: ValidatorSet): boolean {
  let validCount = 0;

  for (const { validator, signature } of data.signatures) {
    const isKnownValidator = validatorSet.validators.some(v => toHex(v) === toHex(validator));
    if (!isKnownValidator) {
      logger.warn({ validator: toHex(validator) }, 'Unknown validator');
      continue;
    }

    const isValid = secp256k1.verify(signature, data.messageId, validator, { prehash: false });
    logger.info({ validator: toHex(validator).slice(0, 16) + '...', isValid }, 'Signature');

    if (isValid) validCount++;
  }

  const thresholdMet = validCount >= validatorSet.threshold;
  logger.info({ validCount, threshold: validatorSet.threshold, thresholdMet }, 'Result');

  return thresholdMet;
}

// =============================================================================
// ISM.verify()
// =============================================================================

async function ismVerify(walletName: WalletName, ismAddress: string, data: CardanoData): Promise<void> {
  // Connect wallet
  const wallet = await getWallet(walletName);
  await waitForSync(wallet, walletName);
  const providers = await configureISMProviders(wallet);

  // Connect to ISM
  const ism = new ISM(providers);
  await ism.findDeployedContract(ismAddress);
  logger.info({ ismAddress }, 'Connected to ISM');

  // Create ISM metadata from validator signatures (exactly 2 validators for POC)
  const [sig1, sig2] = data.signatures;
  const metadata = createISMMetadata(
    sig1.validator,
    sig1.signature,
    sig2.validator,
    sig2.signature
  );

  // Verify - this calls the witness which verifies secp256k1 signatures
  await ism.verify(data.messageId, metadata);
  logger.info({ messageId: toHex(data.messageId) }, 'Message verified by ISM');

  await wallet.close();
}

// =============================================================================
// Mailbox.deliver()
// =============================================================================

async function mailboxDeliver(walletName: WalletName, mailboxAddress: string, data: CardanoData): Promise<void> {
  // Connect wallet
  const wallet = await getWallet(walletName);
  await waitForSync(wallet, walletName);
  const providers = await configureMailboxProviders(wallet);

  // Connect to Mailbox
  const mailboxState = new MailboxState();
  const mailbox = new Mailbox(providers, mailboxState);
  await mailbox.findDeployedContract(mailboxAddress);
  logger.info({ mailboxAddress }, 'Connected to Mailbox');

  // Convert HyperlaneMessage to Mailbox Message format
  const body = new Uint8Array(1024);
  body.set(data.message.body);

  const message: Message = {
    version: data.message.version,
    nonce: data.message.nonce,
    origin: data.message.origin,
    sender: data.message.sender,
    destination: data.message.destination,
    recipient: data.message.recipient,
    bodyLength: BigInt(data.message.body.length),
    body,
  };

  // Metadata contains canonicalId (keccak256)
  const metadata = new Uint8Array(1024);
  metadata.set(data.messageId, 0); // First 32 bytes = canonicalId

  // Deliver
  await mailbox.deliver(MIDNIGHT_DOMAIN, message, metadata);
  logger.info('Message delivered to Mailbox');

  await wallet.close();
}

// =============================================================================
// Main
// =============================================================================

export async function cardanoToMidnight(walletName: WalletName, mailboxAddress: string, ismAddress: string) {
  logger.info('Cardano → Midnight: Message Delivery');

  // 1. Get data from Cardano (message + validator signatures)
  const { data, validatorSet } = getDataFromCardano();
  logger.info({
    messageId: toHex(data.messageId),
    origin: data.message.origin.toString(),
    destination: data.message.destination.toString(),
    nonce: data.message.nonce.toString(),
  }, 'Received from Cardano');

  // 2. Verify ECDSA signatures off-chain (pre-check before on-chain verification)
  const isValid = verifyData(data, validatorSet);
  if (!isValid) {
    throw new Error('Signature verification failed');
  }

  // 3. ISM.verify() - verify signatures on-chain via witness
  await ismVerify(walletName, ismAddress, data);

  // 4. Mailbox.deliver()
  await mailboxDeliver(walletName, mailboxAddress, data);

  logger.info('Delivery complete');
}
