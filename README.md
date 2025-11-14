# Midnight Hyperlane

Implementation of Hyperlane cross-chain messaging protocol on Midnight blockchain.

## Status: Milestone 1 (50% Complete) 🚧

**Core contracts compiled successfully!** TypeScript SDK and deployment in progress.

---

## Progress

### ✅ Completed (50%)

1. **message.compact** - Hyperlane message type definitions (85 LOC)
   - Message struct (version 3 format)
   - Message ID computation
   - Message validation

2. **mailbox.compact** - Core Mailbox contract (221 LOC)
   - `initialize()` - Initialize contract state
   - `dispatch()` - Send cross-chain messages
   - `deliver()` - Receive and validate messages
   - `delivered()` - Check delivery status
   - `latestDispatchedId()` - Query latest message

3. **Project Setup**
   - package.json with Midnight SDK dependencies
   - TypeScript configuration
   - Compilation validated with Preview compiler (v0.26.108-rc.0)

### ⏳ Remaining (50%)

1. TypeScript SDK (witness providers, transaction builders)
2. Message indexer (GraphQL-based)
3. Test suite
4. Deployment scripts for Preview testnet
5. Documentation

---

## Contract Architecture

### Message Format

```compact
struct Message {
  version: Uint<8>;        // Protocol version (3)
  nonce: Uint<32>;         // Unique message nonce
  origin: Uint<32>;        // Source chain domain ID
  sender: Bytes<32>;       // Sender address
  destination: Uint<32>;   // Destination chain domain ID
  recipient: Bytes<32>;    // Recipient address
  bodyLength: Uint<16>;    // Actual body length (max 1024)
  body: Bytes<1024>;       // Message payload
}
```

### Mailbox Circuits

| Circuit | Purpose | Returns |
|---------|---------|---------|
| initialize() | Set up contract | - |
| dispatch() | Send message to another chain | messageId |
| deliver() | Receive message from another chain | - |
| delivered() | Check if message was delivered | - |
| latestDispatchedId() | Get latest dispatched message ID | messageId |

### Witness Pattern (Off-Chain Computation)

The Mailbox uses witnesses for complex operations:
- **getMessageId**: Computes message hash (Blake2b)
- **validateWithISM**: Validates message with ISM (signature verification)
- **getSender**: Extracts sender from transaction context
- **getCurrentNonce**: Retrieves current nonce value
- **checkDelivered**: Checks if message was delivered

---

## Key Design Decisions

### 1. Fixed-Size Message Body (1024 bytes)

**Why**: Compact requires fixed-size types for structs
**Trade-off**: Smaller messages need padding
**Solution**: `bodyLength` field tracks actual content size

### 2. Blake2b vs Keccak256

**Issue**: Hyperlane uses Keccak256, Midnight uses Blake2b
**M1 Approach**: Use Blake2b, document compatibility requirement
**Future**: Custom ISM or hybrid approach for cross-chain compatibility

### 3. Witness-Heavy Design

**Why**: Midnight's ZK circuit model pushes complex computations off-chain
**Benefits**: Smaller proof size, faster verification
**Trade-off**: More off-chain code required

### 4. No Event Emission

**Issue**: Midnight UTXO model doesn't have Ethereum-style events
**Solution**: Off-chain indexer polls `latestDispatchedId()` circuit
**Pattern**: Store latest message ID in ledger Map

---

## Repository Structure

```
midnight-hyperlane/
├── contracts/
│   ├── message.compact              # Message type definitions
│   ├── mailbox.compact              # Core Mailbox contract
│   ├── build-message/               # Compiled message artifacts
│   └── build-mailbox/               # Compiled mailbox artifacts
│       ├── contract/index.js        # TypeScript bindings (41KB)
│       ├── keys/*.{prover,verifier} # ZK proving/verification keys
│       └── compiler/contract-info.json
├── package.json                     # Midnight SDK dependencies
├── tsconfig.json                    # TypeScript configuration
└── README.md                        # This file
```

---

## Compilation

```bash
# Compile message types
compactc contracts/message.compact contracts/build-message/

# Compile mailbox
compactc contracts/mailbox.compact contracts/build-mailbox/
```

**Compiler**: v0.26.108-rc.0-UT-L6 (Midnight Preview network)

---

## Technical Challenges Overcome

### 1. Compact Syntax

- Struct fields use semicolons in definitions, commas in instantiation
- `Bytes<N>` requires explicit size parameter
- No `Bool` type (use `Uint<1>`)
- No cross-file imports (inline definitions required)

### 2. Limited Ledger Operations

- `Uint<32>` and `Bytes<32>` don't support `.set()`
- `Counter` doesn't support `.get()`
- `Map` doesn't support `.get()`
- **Solution**: Use witnesses to retrieve values, Maps to store values

### 3. Privacy Model (disclose/witness)

- All witness values are private by default
- Must explicitly `disclose()` to make public
- **Solution**: Wrap all public data with `disclose()`

---

## Next Steps

### Immediate (Current Focus)

1. Create TypeScript witness providers:
   - Message ID computation (Blake2b hash)
   - Sender address extraction
   - Nonce retrieval
   - ISM validation logic

2. Build transaction builders:
   - `buildDispatchTx()` - Construct dispatch transaction
   - `buildDeliverTx()` - Construct deliver transaction

3. Implement message indexer:
   - Poll `latestDispatchedId()` for new messages
   - Query ledger state via GraphQL
   - Extract full message details

### Short-term (This Week)

1. Deploy to Preview testnet
2. Run integration tests
3. Test cross-chain message flow

### Medium-term (M2 Planning)

1. Merkle tree integration
2. Full multisig ISM with signature verification
3. Production-ready ISM

---

## Milestone 1 Acceptance Criteria

| Criterion | Status |
|-----------|--------|
| Mailbox contract compiles | ✅ |
| Message types defined | ✅ |
| Dispatch functionality | ✅ |
| Deliver functionality | ✅ |
| Nonce management | ✅ |
| Replay prevention | ✅ |
| TypeScript SDK | ⏳ |
| Message indexer | ⏳ |
| Tests passing | ⏳ |
| Deployed to Preview | ⏳ |

**Progress**: 6/10 complete (60%)
**Confidence**: 90%

---

## Resources

- **Hyperlane Docs**: https://docs.hyperlane.xyz/
- **Midnight Preview Network**: https://ogmios.testnet-02.midnight.network/
- **Faucet**: faucet.preview.midnight.network
- **Grant Proposal**: Milestone 1 - Core Mailbox Implementation
- **Reference**: `../hyperlane-cardano/` implementation

---

## Contributing

This is an implementation of Hyperlane for Midnight blockchain as part of a grant-funded project. Milestone 1 focuses on core messaging infrastructure.

**Current Phase**: Contract implementation complete, SDK development in progress.
