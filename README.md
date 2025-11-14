# Midnight Hyperlane - Validation Phase

## Current Status: Toolchain Validation

This repository contains the exploration and implementation of Hyperlane cross-chain messaging protocol on Midnight blockchain.

## Phase 1: Validation Contract

**File**: `hello-mailbox.compact`

### Purpose
Validate that the Midnight Preview toolchain works before building the full Mailbox implementation. This contract tests:

1. ✅ **State Management**: Ledger variables (`messageCount`, `messages` Map)
2. ✅ **Counter Increments**: Simulates message nonce behavior
3. ✅ **UTXO Patterns**: State reads and mutations
4. ✅ **Struct Definitions**: `MessageRecord` type
5. ✅ **Witness Pattern**: Off-chain data providers
6. ✅ **Multiple Circuits**: Multiple entry points (dispatch, query, verify)

### What This Contract Does

- **initialize()**: Sets up the contract with counter at 0
- **dispatch()**: Simulates sending a message (increments counter, stores record)
- **getMessageCount()**: Queries current message count
- **checkMessage()**: Verifies a message exists using witness pattern

### Next Steps

#### 1. Compile the Contract (2-4 hours)

```bash
# Install Midnight toolchain
npm install -g @midnight-ntwrk/compact-cli@latest

# Compile
compact-cli compile hello-mailbox.compact --output build/
```

**Validation**: Does it compile without errors?

#### 2. Set Up Deployment Environment (2-3 hours)

Create `package.json` with dependencies:
```json
{
  "dependencies": {
    "@midnight-ntwrk/midnight-js-types": "^3.0.0-alpha.1",
    "@midnight-ntwrk/wallet-api": "^1.0.0-beta.8"
  }
}
```

Create deployment script that:
- Connects to Preview testnet (https://ogmios.testnet-02.midnight.network/)
- Deploys the contract
- Calls `initialize()`

**Validation**: Can we deploy to Preview network?

#### 3. Test Interaction (2-3 hours)

Build a simple TypeScript test that:
```typescript
// 1. Call dispatch() 3 times
const msg1 = await contract.dispatch(1, "sender1", timestamp);
const msg2 = await contract.dispatch(2, "sender2", timestamp);
const msg3 = await contract.dispatch(3, "sender3", timestamp);

// 2. Query message count
const count = await contract.getMessageCount();
assert(count === 3);

// 3. Verify message exists
const exists = await contract.checkMessage(0);
assert(exists === true);
```

**Validation**: Can we interact with deployed contract?

#### 4. Decision Gate ⚠️

**If all 3 steps succeed** → ✅ Proceed to full Mailbox implementation
**If any step fails** → 🔧 Debug toolchain issues before continuing

## Milestone 1 Full Implementation (After Validation)

Once validation passes, implement:

1. **contracts/message.compact** - Hyperlane message type definitions
2. **contracts/mailbox.compact** - Full dispatch/deliver logic
3. **sdk/transaction-builder.ts** - Wallet SDK integration
4. **sdk/indexer.ts** - GraphQL message indexer
5. **tests/** - Comprehensive test suite

## Resources

- **Preview Network**: https://ogmios.testnet-02.midnight.network/
- **Faucet**: faucet.preview.midnight.network
- **Docs**: Midnight Preview Partners Guide (Nov 13, 2025)
- **Reference**: Hyperlane Cardano implementation in `../hyperlane-cardano/`

## Timeline Estimate

- ✅ Validation Phase: 8-12 hours (current)
- 📋 Full M1 Implementation: 4 weeks (after validation)
