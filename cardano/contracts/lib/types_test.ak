use aiken/crypto.{keccak_256}
use aiken/primitive/bytearray
use types.{HyperlaneAddress, Message, encode_message, int_to_bytes}

/// Helper to create a valid 32-byte hyperlane address
fn make_hyperlane_address(seed: ByteArray) -> HyperlaneAddress {
  // Hash the seed and take first 32 bytes (keccak_256 produces 32 bytes)
  keccak_256(seed)
}

/// Test that encode_message produces deterministic output
test encode_message_deterministic() {
  let message =
    Message {
      version: 3,
      nonce: 1,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"48656c6c6f",
    }

  let encoded1 = encode_message(message)
  let encoded2 = encode_message(message)

  encoded1 == encoded2
}

/// Test that different messages produce different encodings
test encode_message_different_messages() {
  let message1 =
    Message {
      version: 3,
      nonce: 1,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"48656c6c6f",
    }

  let message2 =
    Message {
      version: 3,
      nonce: 2,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"48656c6c6f",
    }

  encode_message(message1) != encode_message(message2)
}

/// Test that different nonces produce different encodings
test encode_message_nonce_affects_encoding() {
  let base_message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"",
    }

  let message_nonce_1 = Message { ..base_message, nonce: 1 }
  let message_nonce_2 = Message { ..base_message, nonce: 2 }

  encode_message(message_nonce_1) != encode_message(message_nonce_2)
}

/// Test that different origins produce different encodings
test encode_message_origin_affects_encoding() {
  let base_message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"",
    }

  let message_origin_1 = Message { ..base_message, origin: 1 }
  let message_origin_2 = Message { ..base_message, origin: 100 }

  encode_message(message_origin_1) != encode_message(message_origin_2)
}

/// Test that different destinations produce different encodings
test encode_message_destination_affects_encoding() {
  let base_message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"",
    }

  let message_dest_1 = Message { ..base_message, destination: 2 }
  let message_dest_2 = Message { ..base_message, destination: 3 }

  encode_message(message_dest_1) != encode_message(message_dest_2)
}

/// Test that different bodies produce different encodings
test encode_message_body_affects_encoding() {
  let base_message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"",
    }

  let message_body_1 = Message { ..base_message, body: #"01" }
  let message_body_2 = Message { ..base_message, body: #"02" }

  encode_message(message_body_1) != encode_message(message_body_2)
}

/// Test that different senders produce different encodings
test encode_message_sender_affects_encoding() {
  let base_message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender1"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"",
    }

  let message_sender_2 =
    Message { ..base_message, sender: make_hyperlane_address("sender2") }

  encode_message(base_message) != encode_message(message_sender_2)
}

/// Test that different recipients produce different encodings
test encode_message_recipient_affects_encoding() {
  let base_message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient1"),
      body: #"",
    }

  let message_recipient_2 =
    Message { ..base_message, recipient: make_hyperlane_address("recipient2") }

  encode_message(base_message) != encode_message(message_recipient_2)
}

/// Test encoding produces non-empty result
test encode_message_non_empty() {
  let message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"",
    }

  bytearray.length(encode_message(message)) > 0
}

/// Test that message ID (hash of encoded message) is 32 bytes
test message_id_is_32_bytes() {
  let message =
    Message {
      version: 3,
      nonce: 0,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"74657374626f6479",
    }

  let message_id = keccak_256(encode_message(message))
  bytearray.length(message_id) == 32
}

/// Test that same message always produces same message ID
test message_id_deterministic() {
  let message =
    Message {
      version: 3,
      nonce: 42,
      origin: 1,
      sender: make_hyperlane_address("sender"),
      destination: 2,
      recipient: make_hyperlane_address("recipient"),
      body: #"68656c6c6f776f726c64",
    }

  let id1 = keccak_256(encode_message(message))
  let id2 = keccak_256(encode_message(message))

  id1 == id2
}

/// Test that int_to_bytes produces big-endian encoding (Hyperlane standard)
/// This is critical for cross-chain compatibility
test int_to_bytes_is_big_endian() {
  // Test: 14 encoded as 4 bytes should be 0x0000000e (big endian)
  let encoded = types.int_to_bytes(14, 4)
  let expected = #"0000000e"
  encoded == expected
}

/// Test int_to_bytes with larger value
test int_to_bytes_larger_value() {
  // Test: 2003 (Cardano Preview domain) encoded as 4 bytes = 0x000007d3
  let encoded = types.int_to_bytes(2003, 4)
  let expected = #"000007d3"
  encoded == expected
}

/// Test int_to_bytes with destination domain
test int_to_bytes_destination() {
  // Test: 43113 (Fuji) encoded as 4 bytes = 0x0000a869
  let encoded = types.int_to_bytes(43113, 4)
  let expected = #"0000a869"
  encoded == expected
}

/// CRITICAL TEST: Verify message 14 from Cardano Preview produces correct message ID
/// This test uses the EXACT parameters from the on-chain dispatch transaction
/// Expected message ID: c8100c86d6f9862fb16a1e72a6a7e080b667d1c4099916a49a68f064d242e7de
test message_14_produces_correct_id() {
  let message =
    Message {
      version: 3,
      nonce: 14,
      origin: 2003,
      // Sender: warp route script 0x02000000 + 440b72ae299de206222e4ab8c5c68f3d4bb5c118dadd053949237081
      sender: #"02000000440b72ae299de206222e4ab8c5c68f3d4bb5c118dadd053949237081",
      destination: 43113,
      // Recipient: 0x00000000...78527becb77fd7cf2249a3e478a87167f01d3cfb
      recipient: #"00000000000000000000000078527becb77fd7cf2249a3e478a87167f01d3cfb",
      // Body from redeemer
      body: #"0000000000000000000000001f26bfc6f52cbfad5c3fa8dabb71007b28bf47490000000000000000000000000000000000000000000000000de0b6b3a7640000",
    }

  // Expected encoded message (from Python/Rust)
  let expected_encoded =
    #"030000000e000007d302000000440b72ae299de206222e4ab8c5c68f3d4bb5c118dadd0539492370810000a86900000000000000000000000078527becb77fd7cf2249a3e478a87167f01d3cfb0000000000000000000000001f26bfc6f52cbfad5c3fa8dabb71007b28bf47490000000000000000000000000000000000000000000000000de0b6b3a7640000"

  let encoded = encode_message(message)

  // First verify the encoding matches exactly
  expect encoded == expected_encoded

  // Then verify the message ID
  let message_id = keccak_256(encoded)
  let expected_id =
    #"c8100c86d6f9862fb16a1e72a6a7e080b667d1c4099916a49a68f064d242e7de"

  message_id == expected_id
}
