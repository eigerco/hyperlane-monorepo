/**
 * Message encoding and hashing utilities
 */

import { Message } from './types.js';
import { createHash } from 'crypto';

/**
 * Encode a message to bytes for hashing
 *
 * Format matches Hyperlane abi.encodePacked:
 * version (1) + nonce (4) + origin (4) + sender (32) +
 * destination (4) + recipient (32) + body (1024)
 * Total: 1101 bytes
 *
 * @param message - The message to encode
 * @returns Encoded message bytes (1101 bytes)
 */
export function encodeMessage(message: Message): Uint8Array {
  const buffer = new Uint8Array(1101);
  let offset = 0;

  // version: uint8 (1 byte)
  buffer[offset] = message.version;
  offset += 1;

  // nonce: uint32 (4 bytes, big-endian)
  const nonceView = new DataView(buffer.buffer, offset, 4);
  nonceView.setUint32(0, message.nonce, false); // big-endian
  offset += 4;

  // origin: uint32 (4 bytes, big-endian)
  const originView = new DataView(buffer.buffer, offset, 4);
  originView.setUint32(0, message.origin, false);
  offset += 4;

  // sender: bytes32 (32 bytes)
  buffer.set(message.sender.slice(0, 32), offset);
  offset += 32;

  // destination: uint32 (4 bytes, big-endian)
  const destView = new DataView(buffer.buffer, offset, 4);
  destView.setUint32(0, message.destination, false);
  offset += 4;

  // recipient: bytes32 (32 bytes)
  buffer.set(message.recipient.slice(0, 32), offset);
  offset += 32;

  // body: bytes1024 (1024 bytes)
  buffer.set(message.body.slice(0, 1024), offset);

  return buffer;
}

/**
 * Compute message ID using Blake2b hash
 *
 * Note: Hyperlane uses Keccak256, but Midnight uses Blake2b.
 * This is a compatibility consideration for M1.
 *
 * @param message - The message to hash
 * @returns Message ID (32 bytes)
 */
export function computeMessageId(message: Message): Uint8Array {
  const encoded = encodeMessage(message);
  const hash = createHash('blake2b512').update(encoded).digest();
  // Return first 32 bytes
  return hash.slice(0, 32);
}

/**
 * Compute message ID using Keccak256 (for cross-chain compatibility)
 *
 * This matches the Hyperlane standard hash function.
 * Use this if interoperating with standard Hyperlane chains.
 *
 * @param message - The message to hash
 * @returns Message ID (32 bytes)
 */
export function computeMessageIdKeccak256(message: Message): Uint8Array {
  const { keccak256 } = require('@ethersproject/keccak256');
  const encoded = encodeMessage(message);
  const hash = keccak256(encoded);
  // Convert hex string to Uint8Array
  return new Uint8Array(Buffer.from(hash.slice(2), 'hex'));
}

/**
 * Create a message with proper padding
 *
 * @param params - Message parameters
 * @returns Properly formatted Message
 */
export function createMessage(params: {
  version: number;
  nonce: number;
  origin: number;
  sender: Uint8Array;
  destination: number;
  recipient: Uint8Array;
  body: Uint8Array;
}): Message {
  // Pad body to 1024 bytes
  const paddedBody = new Uint8Array(1024);
  const bodyLength = Math.min(params.body.length, 1024);
  paddedBody.set(params.body.slice(0, bodyLength));

  // Ensure sender and recipient are 32 bytes
  const sender = new Uint8Array(32);
  sender.set(params.sender.slice(0, 32));

  const recipient = new Uint8Array(32);
  recipient.set(params.recipient.slice(0, 32));

  return {
    version: params.version,
    nonce: params.nonce,
    origin: params.origin,
    sender,
    destination: params.destination,
    recipient,
    bodyLength,
    body: paddedBody,
  };
}

/**
 * Validate message structure
 *
 * @param message - The message to validate
 * @throws Error if message is invalid
 */
export function validateMessage(message: Message): void {
  if (message.version > 3) {
    throw new Error(`Unsupported message version: ${message.version}`);
  }

  if (message.bodyLength > 1024) {
    throw new Error(`Body length exceeds maximum: ${message.bodyLength}`);
  }

  if (message.sender.length !== 32) {
    throw new Error(`Sender must be 32 bytes, got ${message.sender.length}`);
  }

  if (message.recipient.length !== 32) {
    throw new Error(`Recipient must be 32 bytes, got ${message.recipient.length}`);
  }

  if (message.body.length !== 1024) {
    throw new Error(`Body must be 1024 bytes, got ${message.body.length}`);
  }
}

/**
 * Convert message ID to hex string
 *
 * @param messageId - Message ID bytes
 * @returns Hex string (with 0x prefix)
 */
export function messageIdToHex(messageId: Uint8Array): string {
  return '0x' + Buffer.from(messageId).toString('hex');
}

/**
 * Convert hex string to message ID bytes
 *
 * @param hex - Hex string (with or without 0x prefix)
 * @returns Message ID bytes (32 bytes)
 */
export function hexToMessageId(hex: string): Uint8Array {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(cleaned, 'hex'));
}

/**
 * Convert address string to 32-byte address
 *
 * For Midnight addresses (Bech32m format), this extracts the raw bytes.
 *
 * @param address - Address string
 * @returns 32-byte address
 */
export function addressToBytes32(address: string): Uint8Array {
  // TODO: Implement Bech32m decoding for Midnight addresses
  // For now, assume hex input
  const cleaned = address.startsWith('0x') ? address.slice(2) : address;
  const bytes = new Uint8Array(32);
  const addrBytes = Buffer.from(cleaned, 'hex');
  bytes.set(addrBytes.slice(0, 32));
  return bytes;
}

/**
 * Convert 32-byte address to hex string
 *
 * @param bytes - 32-byte address
 * @returns Hex string (with 0x prefix)
 */
export function bytes32ToAddress(bytes: Uint8Array): string {
  return '0x' + Buffer.from(bytes).toString('hex');
}
