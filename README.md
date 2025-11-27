# Midnight Hyperlane

Hyperlane cross-chain messaging on Midnight blockchain.

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

### 3. Start the Local Standalone Environment (for local development)

Start the Midnight node, indexer, and proof server:

```bash
docker-compose -f standalone.yml up -d
```

This will start:
- **Midnight Node** (v0.12.1) on port 9944
- **Indexer** (v2.1.4) on port 8088
- **Proof Server** (v4.0.0) on port 6300

> **Note:** The proof server and node images use recent stable versions. The indexer uses version 2.1.4 instead of the latest version, as the latest indexer image was failing at the time of setup.

### 4. Run Commands

The CLI supports two networks: `local` (standalone) and `testnet`.

**Check wallet state:**

```bash
# Local network
yarn start local state

# Testnet
yarn start testnet state
```

**Send tDUST tokens:**

```bash
# Local network
yarn start local send

# Testnet
yarn start testnet send
```

> **Note:** `yarn start testnet send` will fail because the genesis account (phil) is only available on the local standalone network. The procedure is the same, but you would need to use a funded testnet wallet.

### 5. Stop the Local Environment

When you're done with local development, stop and remove the containers:

```bash
docker-compose -f standalone.yml down
```

## Available Commands

| Command | Description |
|---------|-------------|
| `yarn install` | Install project dependencies |
| `yarn build` | Build the TypeScript project |
| `yarn start local state` | Check Alice wallet state on local network |
| `yarn start local send` | Send tDUST tokens on local network |
| `yarn start testnet state` | Check Alice wallet state on testnet |
| `yarn start testnet send` | Send tDUST tokens on testnet |
| `docker-compose -f standalone.yml up -d` | Start the local standalone environment |
| `docker-compose -f standalone.yml down` | Stop and remove all containers |

## Network Configuration

### Local (Standalone)
- Indexer: `http://127.0.0.1:8088/api/v1/graphql`
- Node: `http://127.0.0.1:9944`
- Proof Server: `http://localhost:6300`

### Testnet
- Indexer: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- Node: `https://rpc.testnet-02.midnight.network`
- Proof Server: `http://localhost:6300` (requires local proof server)

## Project Structure

This project enables cross-chain messaging using Hyperlane on the Midnight blockchain network.
