# Midnight Hyperlane

Hyperlane cross-chain messaging on Midnight blockchain.

## Prerequisites

- Docker and Docker Compose
- Node.js and Yarn

## Getting Started

### 1. Start the Local Standalone Environment

Start the Midnight node, indexer, and proof server:

```bash
docker-compose -f standalone.yml up -d
```

This will start:
- **Midnight Node** (v0.12.1) on port 9944
- **Indexer** (v2.1.4) on port 8088
- **Proof Server** (v4.0.0) on port 6300

> **Note:** The proof server and node images use recent stable versions. The indexer uses version 2.1.4 instead of the latest version, as the latest indexer image was failing at the time of setup.

### 2. Install Dependencies

Install the required Node.js dependencies:

```bash
yarn install
```

### 3. Build the Project

Compile the TypeScript code:

```bash
yarn build
```

### 4. Create a Wallet

To get balance of the pre-funded wallet with seed `0000000000000000000000000000000000000000000000000000000000000001`, run following:

```bash
yarn wallet
```

After some time, it should display the following:

```
Waiting to receive tokens...
Waiting for funds. Backend lag: 0, wallet lag: 0, transactions=0
Waiting for funds. Backend lag: 0, wallet lag: 0, transactions=1
Your wallet balance is: 25000000000000000
Done in 12.80s.
```

### 5. Stop the Environment

When you're done, stop and remove the containers:

```bash
docker-compose -f standalone.yml down
```

## Available Commands

| Command | Description |
|---------|-------------|
| `docker-compose -f standalone.yml up -d` | Start the local standalone environment |
| `yarn install` | Install project dependencies |
| `yarn build` | Build the TypeScript project |
| `yarn wallet` | Run the wallet script |
| `docker-compose -f standalone.yml down` | Stop and remove all containers |

> **Note:** The `yarn transfer-tdust` command has not been adapted yet and is currently unavailable.

## Project Structure

This project enables cross-chain messaging using Hyperlane on the Midnight blockchain network.
