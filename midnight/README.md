# Midnight Hyperlane

Hyperlane cross-chain messaging implementation for Midnight blockchain.

## Hyperlane Implementation Status

### Completed

**Mailbox Contract** (`contracts/mailbox/mailbox.compact`)
- `dispatch()` - Send messages to other chains
- `deliver()` - Receive messages from other chains
- `delivered()` - Check if message was processed
- `latestDispatchedId()` - Get latest message ID for indexing
- Message replay protection via `deliveredMessages` ledger
- Nonce tracking for message ordering

**ISM Contract** (`contracts/ism/ism.compact`)
- Relayer attestation-based verification (Path B from Milestone 2)
- `verify(messageId, metadata)` - verifies BIP-340 relayer signature, stores receipt
- `isVerified(messageId)` - query verification receipt
- `addRelayer()` / `removeRelayer()` - manage authorized relayers
- `getThreshold()` / `getValidatorCount()` - query validator config
- Ledgers: `validators`, `authorizedRelayers`, `verificationReceipts`
- Witness: `verifyBIP340Signature` (uses Midnight native BIP-340)

**TypeScript Utilities** (`scripts/utils/mailbox.ts`)
- `MailboxState` class for stateful witness testing
- Blake2b message ID hashing
- Message encoding (1101 bytes format)
- Witness implementations for all mailbox functions

**Test Command** (`scripts/commands/test-mailbox.ts`)
- End-to-end mailbox testing
- Validates: dispatch, deliver, nonce increment, replay protection, wrong destination rejection

```bash
# Deploy and test mailbox
yarn start local deploy-mailbox phil
yarn start local test-mailbox phil <contractAddress>
```

### ISM Architecture Decision

**Challenge:** Hyperlane validators use ECDSA (secp256k1) signatures, but Midnight only supports BIP-340 (Schnorr) natively. Additionally, Midnight does not currently support cross-contract calls in Compact.

**Solution:** Two-transaction orchestration with the standard Hyperlane `verify(message, metadata)` interface:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TypeScript Relayer                                │
│                                                                         │
│  1. Fetch message from origin chain                                     │
│  2. Compute canonicalId = keccak256(message) off-chain                  │
│  3. Collect validator ECDSA signatures over canonicalId                 │
│  4. Verify ECDSA signatures OFF-CHAIN (M-of-N threshold check)          │
│  5. Create commitment and sign with relayer BIP-340 key                 │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ TRANSACTION 1: ISM.verify(message, metadata)                      │  │
│  │   • Verifies relayer BIP-340 attestation                          │  │
│  │   • Stores verification receipt in ISM ledger                     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Wait for confirmation                    │
│                              ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │ TRANSACTION 2: Mailbox.deliver(message, metadata)                 │  │
│  │   • Checks ISM verification receipt exists (via witness/indexer)  │  │
│  │   • Marks message as delivered                                    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                               │                              │
                    Transaction 1                  Transaction 2
                               ▼                              ▼
              ┌────────────────────────┐    ┌─────────────────────────┐
              │      ISM Contract      │    │    Mailbox Contract     │
              │                        │    │                         │
              │ verify(message, meta)  │    │ deliver(message, meta)  │
              │   → stores receipt     │    │   → checks ISM receipt  │
              │                        │    │   → marks delivered     │
              │ Ledger:                │    │                         │
              │ • validators[]         │    │ Ledger:                 │
              │ • threshold            │    │ • deliveredMessages     │
              │ • verificationReceipts │    │ • nonce                 │
              │ • authorizedRelayers   │    │ • ismAddress            │
              └────────────────────────┘    └─────────────────────────┘
```

**Why Two Transactions?**
- Midnight does not currently support cross-contract calls
- ISM exposes standard Hyperlane `verify(message, metadata)` interface
- Verification receipt links ISM.verify() to Mailbox.deliver()
- **Future migration:** When cross-contract calls are available, `ISM.verify()` call moves from relayer into `Mailbox.deliver()` circuit - single transaction, same interface

**Message ID Strategy (per grant requirements):**
- `canonicalId` = keccak256(message) - computed off-chain, included in metadata, signed by validators
- `localHash` = Blake2b(message) - computed on-chain for deduplication and receipt lookup

**Why Off-Chain ECDSA Verification?**
- Midnight's ZK circuits only support BIP-340 (Schnorr) signatures natively
- ECDSA (secp256k1) verification would require expensive in-circuit computation
- Authorized relayers bridge the gap: verify ECDSA off-chain, attest with BIP-340 on-chain
- When native ECDSA/Ed25519 verification becomes available, ISM switches to native verification without changing the interface

**Why TypeScript Relayer?** Midnight's contract libraries (`@midnight-ntwrk/midnight-js-*`) are only available in TypeScript. Rust SDK doesn't exist for Midnight contract interaction.

### Remaining Work

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1 (Milestone 0)** | POC - `cardano-midnight` command with ECDSA verification + Mailbox delivery | Partial |
| **Phase 2 (Milestone 1)** | Mailbox Contract - ISM receipt check via witness | TODO |
| **Phase 3 (Milestone 3)** | ISM Contract - `verify()` with receipts, relayer authorization | TODO |
| **Phase 4** | Relayer Service - production origin watcher + delivery | Future |

**Migration path:** When cross-contract calls become available, move `ISM.verify()` from relayer into `Mailbox.deliver()` circuit for single-transaction atomic delivery.

#### Phase 1: POC (Milestone 0)

**Cardano → Midnight Test Flow** (`scripts/commands/cardano-midnight.ts`)

- [x] Create `cardano-midnight.ts` command
- [x] Simulate data from Cardano (`getDataFromCardano()`)
- [x] Full Hyperlane message format with keccak256 messageId
- [x] ECDSA (secp256k1) signature verification with 2/3 threshold multisig (`verifyData()`)
- [x] Integration with deployed Mailbox contract (`mailboxDeliver()`)
- [x] Add command to `main.ts`: `yarn start local cardano-midnight phil <mailboxAddress>`
- [ ] Update ISM contract for relayer attestation flow:
  - [x] Add `verificationReceipts` ledger (`Map<Bytes<32>, Uint<8>>`)
  - [x] Add `authorizedRelayers` ledger (`Map<Bytes<32>, Uint<8>>`)
  - [x] Add `ISMMetadata` struct: `{ commitment, relayerPubKey, relayerSignature }`
  - [x] Add `verifyBIP340Signature` witness (calls Midnight native BIP-340)
  - [x] Update `verify(messageId, metadata)` circuit
  - [x] Add `isVerified(messageId)` query circuit
  - [x] Add `addRelayer(pubKey)` / `removeRelayer(pubKey)` circuits
  - [ ] Recompile ISM contract
- [ ] Create `scripts/utils/ism.ts`:
  - [ ] Import compiled ISM contract
  - [ ] Implement `verifyBIP340Signature` witness using `@midnight-ntwrk/compact-runtime`
  - [ ] Create `ISM` class with `deploy()`, `verify()`, `addRelayer()`, `isVerified()`
- [ ] Update `cardano-midnight.ts` with relayer attestation:
  - [ ] Add `createRelayerAttestation()` - creates commitment + BIP-340 signature
  - [ ] Add `ismVerify()` - calls ISM.verify() with attestation
  - [ ] Update main flow: `verifyData()` → `createRelayerAttestation()` → `ismVerify()` → `mailboxDeliver()`
  - [ ] Add ISM address as command argument
- [ ] Investigate how `deliver()` events are tracked via indexer (for relayer confirmation)
- [ ] Test end-to-end flow on local network

#### Phase 2: Mailbox Contract Updates (Milestone 1)

**Mailbox Contract** (`contracts/mailbox/mailbox.compact`)

Update to check ISM verification receipt before delivery:

- [ ] Add `ismAddress` ledger (`Bytes<32>`) - reference to ISM contract (for documentation)
- [ ] Add `checkISMVerification(messageId)` witness - queries ISM receipt via indexer
- [ ] Update `deliver()` circuit:
  - Existing checks (destination, not delivered)
  - Call `checkISMVerification(messageId)` witness
  - Assert receipt exists before marking delivered
- [ ] Add comment marking future migration point for cross-contract call

#### Phase 3: ISM Contract Updates (Milestone 3)

**ISM Contract** (`contracts/ism/ism.compact`)

Update to support standard Hyperlane `verify(message, metadata)` interface with verification receipts:

- [ ] Add `verificationReceipts` ledger (`Map<Bytes<32>, Uint<8>>`) - stores receipt by messageId
- [ ] Add `authorizedRelayers` ledger (`Map<Bytes<32>, Uint<8>>`) - BIP-340 public keys
- [ ] Update `verify(message, metadata)` circuit:
  - Parse `ISMMetadata` from metadata bytes
  - Check relayer is authorized
  - Verify BIP-340 signature over commitment
  - Store verification receipt: `verificationReceipts.insert(messageId, 1)`
- [ ] Add `isVerified(messageId)` query circuit - returns 1 if receipt exists
- [ ] Add `addRelayer(pubKey)` / `removeRelayer(pubKey)` circuits
- [ ] Add `rotateValidators(...)` circuit for validator set updates
- [ ] Implement witnesses:
  - `parseMetadata(metadata: Bytes<1024>): ISMMetadata`
  - `verifyBIP340(pubKey, message, signature): Uint<8>`

**ISMMetadata Structure:**
```
struct ISMMetadata {
  canonicalId: Bytes<32>;       // keccak256(message) - computed off-chain
  commitment: Bytes<32>;        // hash(canonicalId || validatorSignatures)
  relayerPubKey: Bytes<32>;     // BIP-340 public key
  relayerSignature: Bytes<64>;  // BIP-340 signature over commitment
}
```

#### Phase 4: Relayer Service (Future)

**Relayer Service** (`scripts/relayer/`)

Production relayer that watches origin chain and delivers to Midnight:

```
scripts/relayer/
├── index.ts           # Entry point, orchestrates flow
├── config.ts          # Configuration (RPC endpoints, keys)
├── origin-watcher.ts  # Subscribe to origin chain dispatch events
├── ecdsa-verifier.ts  # Verify validator ECDSA signatures
├── attestation.ts     # Create commitment, sign with BIP-340
└── midnight-client.ts # ISM.verify() + Mailbox.deliver() calls
```

- [ ] Origin chain event subscription
- [ ] Validator signature collection from Hyperlane agents
- [ ] M-of-N threshold verification
- [ ] Two-transaction delivery with retry logic
- [ ] Metrics and logging

#### Future: Cross-Contract Call Migration

When Midnight adds cross-contract call support:

```compact
// mailbox.compact - FUTURE VERSION

export circuit deliver(message, metadata) {
  // ... existing checks ...

  // BEFORE (witness + two transactions):
  // const ismVerified = checkISMVerification(messageId);

  // AFTER (cross-contract call + single transaction):
  ISM.verify(message, metadata);  // Atomic, no receipt needed

  deliveredMessages.insert(messageId, 1);
}
```

Relayer simplifies to single transaction:
```typescript
// Single transaction - ISM.verify() called internally by Mailbox
await mailbox.deliver(message, metadata);
```

## Token Contract

The project includes a simple token minting contract written in Compact (Midnight's smart contract language).

### Contract Details

- **Token Name:** `tNIGHT`
- **Mint Amount:** 1000 tokens per mint call
- **Location:** `contracts/token/token.compact`

### Contract State

| Ledger Variable | Type | Description |
|-----------------|------|-------------|
| `counter` | Counter | Tracks the number of mint operations |
| `nonce` | Bytes<32> | Evolving nonce for token uniqueness |
| `tvl` | Uint<64> | Total value locked (sum of all minted tokens) |
| `coin_name` | Bytes<32> | The token name ("tNIGHT"), sealed on deployment |

### Circuit

- **`mint_to(addr)`** - Mints 1000 tNIGHT tokens to the specified wallet address. Each call increments the counter, evolves the nonce, and updates the TVL.

## Prerequisites

- Docker and Docker Compose
- Node.js and Yarn

## Getting Started

### 1. Install Dependencies

Install the required Node.js dependencies:

```bash
yarn install
```

### 2. Build the Project

Compile the TypeScript code:

```bash
yarn build
```

### 3. Start the Environment

> **⚠️ IMPORTANT:** Only one environment can run at a time. The proof server uses the same port (6300) in both configurations. Stop one before starting the other.

#### For Local Development

Start the Midnight node, indexer, and proof server:

```bash
docker-compose -f local-development.yml up -d
```

This will start:
- **Midnight Node** (v0.12.1) on port 9944
- **Indexer** (v2.1.4) on port 8088
- **Proof Server** (v4.0.0) on port 6300

> **Note:** The indexer uses version 2.1.4 instead of the latest version, as the latest indexer image was failing at the time of setup.

#### For Testnet

Start only the proof server (node and indexer are provided by the testnet):

```bash
docker-compose -f testnet-proof-server.yml up -d
```

This will start:
- **Proof Server** (v4.0.0) on port 6300

### 4. Run Commands

The CLI supports two networks: `local` and `testnet`.

> **⚠️ CAUTION - Testnet:** Be careful when working with `testnet` as you are interacting with a real network. Transactions are irreversible and may consume real tDUST tokens. Always test on `local` first. The `phil` genesis account is **not available** on testnet.

> **⚠️ CAUTION - Local:** When restarting `local-development.yml`, all data is reset - accounts, balances, and deployed contracts are lost. Only the `phil` genesis account is pre-funded at startup. You need to send tDUST from `phil` to other wallets (`alice`, `bob`) before they can perform transactions.

#### Check wallet balance

```bash
# Local network
yarn start local balance alice

# Testnet
yarn start testnet balance alice
```

#### Check wallet state

```bash
# Local network
yarn start local state alice

# Testnet
yarn start testnet state alice
```

#### Send tDUST tokens

```bash
# Local network - send 100000 tDUST from phil to alice
yarn start local send phil alice 100000

# Testnet - send 100000 tDUST from alice to bob
yarn start testnet send alice bob 100000
```

#### Deploy a token contract

```bash
# Local network
yarn start local deploy phil

# Testnet
yarn start testnet deploy alice
```

#### Mint tokens

Mints 1000 tNIGHT tokens to the specified wallet from a deployed contract:

```bash
# Local network
yarn start local mint alice <contractAddress>

# Testnet
yarn start testnet mint alice <contractAddress>
```

### 5. Stop the Environment

When you're done, stop and remove the containers:

```bash
# Stop local development environment
docker-compose -f local-development.yml down

# Stop testnet proof server
docker-compose -f testnet-proof-server.yml down
```

## Available Commands

| Command | Description |
|---------|-------------|
| `yarn install` | Install project dependencies |
| `yarn build` | Build the TypeScript project |
| `yarn start <network> balance <wallet>` | Show wallet balance (native and custom tokens) |
| `yarn start <network> state <wallet>` | Show full wallet state |
| `yarn start <network> send <from> <to> <amount>` | Send tDUST tokens |
| `yarn start <network> deploy <wallet>` | Deploy a token contract |
| `yarn start <network> mint <wallet> <contractAddress>` | Mint tokens from a deployed contract |
| `yarn start <network> deploy-mailbox <wallet>` | Deploy Hyperlane mailbox contract |
| `yarn start <network> test-mailbox <wallet> [contractAddress]` | Test mailbox dispatch/deliver |
| `yarn start <network> cardano-midnight <wallet> <mailboxAddress>` | Test Cardano → Midnight message delivery |
| `docker-compose -f local-development.yml up -d` | Start local development environment |
| `docker-compose -f local-development.yml down` | Stop local development environment |
| `docker-compose -f testnet-proof-server.yml up -d` | Start testnet proof server |
| `docker-compose -f testnet-proof-server.yml down` | Stop testnet proof server |

**Networks:** `local` or `testnet`

**Wallets:** `alice`, `bob`, `phil` (phil only available on local)

## Network Configuration

### Local (Standalone)
- Indexer: `http://127.0.0.1:8088/api/v1/graphql`
- Node: `http://127.0.0.1:9944`
- Proof Server: `http://localhost:6300`

### Testnet
- Indexer: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- Node: `https://rpc.testnet-02.midnight.network`
- Proof Server: `http://localhost:6300` (requires local proof server running)

## Project Structure

```
scripts/
├── main.ts              # CLI entry point
├── commands/
│   ├── balance.ts       # Balance command
│   ├── deploy.ts        # Deploy token contract command
│   ├── deploy-mailbox.ts # Deploy mailbox contract command
│   ├── deploy-ism.ts    # Deploy ISM contract command (TODO)
│   ├── mint.ts          # Mint tokens command
│   ├── send.ts          # Send tokens command
│   ├── test-mailbox.ts  # Mailbox end-to-end test
│   └── cardano-midnight.ts # Cardano → Midnight POC (ECDSA + Mailbox)
├── utils/
│   ├── index.ts         # Shared utilities, wallet management, config
│   ├── mailbox.ts       # Mailbox contract utilities & witnesses
│   ├── ism.ts           # ISM contract utilities & witnesses (TODO)
│   ├── crypto.ts        # BIP-340, keccak256, ECDSA utilities (TODO)
│   ├── metadata.ts      # ISM metadata encoding/decoding (TODO)
│   └── token.ts         # Token contract utilities
└── relayer/             # Production relayer service (TODO)
    ├── index.ts
    ├── config.ts
    ├── origin-watcher.ts
    ├── ecdsa-verifier.ts
    ├── attestation.ts
    └── midnight-client.ts
contracts/
├── mailbox/             # Hyperlane mailbox contract
│   ├── mailbox.compact
│   └── build/           # Compiled contract
├── ism/                 # Interchain Security Module
│   ├── ism.compact
│   └── build/           # Compiled contract (TODO)
└── token/               # Token contract (compiled with compactc v0.25.0)
    ├── token.compact
    └── build/           # Compiled contract
```

## TODO

### Preview Network Support

- [ ] Update `@midnight-ntwrk/midnight-js-*` libraries to 3.0.0 versions (significant API changes, requires refactoring `utils/index.ts` and contract metadata handling)
- [ ] Use `@midnight-ntwrk/compact-runtime` library 0.11.0 (not yet available in npm registry, latest is 0.9.0; required for `compactc` v0.26.108-rc.0-UT-L6)
- [ ] Recompile contract with `compactc` v0.26.108-rc.0-UT-L6 (already works but requires compact-runtime 0.11.0)
- [ ] Add preview network configuration alongside local and testnet

