# Midnight Hyperlane

Hyperlane cross-chain messaging on Midnight blockchain.

> **Note:** This repository currently contains a simple token mint contract as a foundation. Hyperlane cross-chain messaging implementation is planned for future development.

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
│   ├── deploy.ts        # Deploy contract command
│   ├── mint.ts          # Mint tokens command
│   └── send.ts          # Send tokens command
└── utils/
    └── index.ts         # Shared utilities, wallet management, config
contracts/
└── token/               # Token contract (compiled with compactc v0.25.0)
```

## TODO

### Preview Network Support

- [ ] Update `@midnight-ntwrk/midnight-js-*` libraries to 3.0.0 versions (significant API changes, requires refactoring `utils/index.ts` and contract metadata handling)
- [ ] Use `@midnight-ntwrk/compact-runtime` library 0.11.0 (not yet available in npm registry, latest is 0.9.0; required for `compactc` v0.26.108-rc.0-UT-L6)
- [ ] Recompile contract with `compactc` v0.26.108-rc.0-UT-L6 (already works but requires compact-runtime 0.11.0)
- [ ] Add preview network configuration alongside local and testnet

### Hyperlane Integration

- [ ] Write simple template contracts for initial Hyperlane connection
- [ ] Verify if proper Hyperlane signature verification is available within Midnight libraries
- [ ] Check indexer features for listening changes on contracts

## Future Work

This project aims to enable cross-chain messaging using Hyperlane on the Midnight blockchain network. Currently, only a simple token mint contract is implemented. Future development will include the full Hyperlane protocol integration.
