# Midnight Wallet SDK Migration Guide

## Problem

The `@midnight-ntwrk/wallet` (v5.0.0) and `@midnight-ntwrk/wallet-api` (v5.0.0) packages are **deprecated** and being replaced by a new modular wallet SDK architecture. This is likely causing connection timeouts when running `yarn start local balance phil` - the old wallet library is not compatible with the preview network.

## Current Dependencies (feat/midnight_update_preview_dependencies)

```json
"@midnight-ntwrk/wallet": "5.0.0",
"@midnight-ntwrk/wallet-api": "5.0.0",
"@midnight-ntwrk/zswap": "4.0.0",
"@midnight-ntwrk/ledger": "4.0.0",
"@midnight-ntwrk/ledger-v6": "^6.1.0-alpha.6"
```

## New Wallet SDK Architecture

The new wallet SDK is modular and consists of the following packages:

| Package | Latest Version | Description |
|---------|----------------|-------------|
| `@midnight-ntwrk/wallet-sdk-facade` | 1.0.0-beta.12 | High-level facade combining all wallet types |
| `@midnight-ntwrk/wallet-sdk-runtime` | 1.0.0-beta.8 | Runtime for wallet variants |
| `@midnight-ntwrk/wallet-sdk-hd` | 3.0.0-beta.7 | HD wallet derivation |
| `@midnight-ntwrk/wallet-sdk-shielded` | 1.0.0-beta.12 | Shielded (private) wallet |
| `@midnight-ntwrk/wallet-sdk-unshielded-wallet` | 1.0.0-beta.14 | Unshielded (public) wallet |
| `@midnight-ntwrk/wallet-sdk-dust-wallet` | 1.0.0-beta.11 | Dust wallet for fee management |
| `@midnight-ntwrk/wallet-sdk-abstractions` | 1.0.0-beta.9 | Core abstractions |
| `@midnight-ntwrk/wallet-sdk-address-format` | 3.0.0-beta.9 | Address formatting utilities |
| `@midnight-ntwrk/wallet-sdk-capabilities` | 3.0.0-beta.9 | Wallet capabilities |
| `@midnight-ntwrk/wallet-sdk-utilities` | 1.0.0-beta.7 | Common utilities |
| `@midnight-ntwrk/wallet-sdk-indexer-client` | 1.0.0-beta.8 | Indexer client |
| `@midnight-ntwrk/wallet-sdk-node-client` | 1.0.0-beta.8 | Node RPC client |
| `@midnight-ntwrk/wallet-sdk-prover-client` | 1.0.0-beta.8 | Prover client |

The new SDK uses `@midnight-ntwrk/ledger-v6` instead of the old `@midnight-ntwrk/ledger`.

## Required package.json Changes

Remove deprecated packages:
```json
"@midnight-ntwrk/wallet": "5.0.0",
"@midnight-ntwrk/wallet-api": "5.0.0",
"@midnight-ntwrk/ledger": "4.0.0"
```

Add new packages:
```json
"@midnight-ntwrk/wallet-sdk-facade": "1.0.0-beta.12",
"@midnight-ntwrk/wallet-sdk-runtime": "1.0.0-beta.8",
"@midnight-ntwrk/wallet-sdk-hd": "3.0.0-beta.7",
"@midnight-ntwrk/wallet-sdk-indexer-client": "1.0.0-beta.8",
"@midnight-ntwrk/wallet-sdk-node-client": "1.0.0-beta.8",
"@midnight-ntwrk/wallet-sdk-prover-client": "1.0.0-beta.8",
"@midnight-ntwrk/ledger-v6": "6.1.0-alpha.6"
```

## Code Migration

### Old API (scripts/utils/index.ts)

```typescript
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";

const wallet = await WalletBuilder.build(
  config.indexer,
  config.indexerWS,
  config.proofServer,
  config.node,
  WALLET_SEEDS[name],
  config.networkId
);
wallet.start();
```

### New API

```typescript
import { WalletFacade, FacadeState } from '@midnight-ntwrk/wallet-sdk-facade';
import * as ledger from '@midnight-ntwrk/ledger-v6';

// The new WalletFacade has a different initialization pattern
// and combines ShieldedWallet, UnshieldedWallet, and DustWallet
```

## Key Differences

1. **API Structure**: The new `WalletFacade` combines three wallet types:
   - `ShieldedWallet` - for private transactions
   - `UnshieldedWallet` - for public transactions
   - `DustWallet` - for fee management

2. **State Management**: The `state()` method returns a `FacadeState` object with:
   - `shielded: ShieldedWalletState`
   - `unshielded: UnshieldedWalletState`
   - `dust: DustWalletState`
   - `isSynced: boolean`

3. **Ledger Types**: Uses `@midnight-ntwrk/ledger-v6` types instead of `@midnight-ntwrk/ledger`

4. **Transaction Methods**:
   - `submitTransaction(tx: ledger.FinalizedTransaction)`
   - `balanceTransaction(zswapSecretKeys, dustSecretKeys, tx, ttl)`
   - `finalizeTransaction(recipe)`
   - `transferTransaction(zswapSecretKeys, dustSecretKey, outputs, ttl)`

## Preview Network Genesis Accounts

**IMPORTANT**: The preview network (node 0.18.0-rc.8) uses different genesis accounts than the testnet. The "phil" seed (`0x...001`) that works on testnet **does NOT have funds** on the preview network.

### Phil Seed (Testnet - NO FUNDS on Preview)
- Seed: `0000000000000000000000000000000000000000000000000000000000000001`
- Address: `mn_addr_undeployed1zvhnn2vvxxa2mkax2f046sljj4z8yztl59fxtaz3xzlaku89rhhsn7dj0r`
- Status: **NO FUNDS** on preview network

### Genesis Accounts with Funds (Seeds UNKNOWN)

The following 4 addresses have genesis funds on the preview network. The seeds that generated these addresses are **not publicly documented**.

| # | Address | Public Key (hex) | Funds |
|---|---------|------------------|-------|
| 1 | `mn_addr_undeployed1h3ssm5ru2t6eqy4g3she78zlxn96e36ms6pq996aduvmateh9p9sk96u7s` | `bc610dd07c52f59012a88c2f9f1c5f34cbacc75b868202975d6f19beaf37284b` | 2,500T tDUST |
| 2 | `mn_addr_undeployed1gkasr3z3vwyscy2jpp53nzr37v7n4r3lsfgj6v5g584dakjzt0xqun4d4r` | `45bb01c45163890c11520869198871f33d3a8e3f82512d3288a1eadeda425bcc` | 2,500T tDUST |
| 3 | `mn_addr_undeployed1g9nr3mvjcey7ca8shcs5d4yjndcnmczf90rhv4nju7qqqlfg4ygs0t4ngm` | `416638ed92c649ec74f0be2146d4929b713de0492bc7765672e780007d28a911` | 2,500T tDUST |
| 4 | `mn_addr_undeployed12vv6yst6exn50pkjjq54tkmtjpyggmr2p07jwpk6pxd088resqzqszfgak` | `5319a2417ac9a74786d2902955db6b9048846c6a0bfd2706da099af39c798004` | 2,500T tDUST |

**Total genesis funds**: 10,000 trillion tDUST (20 UTXOs x 500T each)

### How to Query Genesis UTXOs

**Prerequisites**: Start the docker containers first:
```bash
docker-compose up -d
```

**Query via curl**:
```bash
curl -s "http://127.0.0.1:8088/api/v3/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ block(offset: {height: 0}) { hash height transactions { hash unshieldedCreatedOutputs { owner tokenType value } } } }"}'
```

**GraphQL Query** (for GraphQL playground at http://127.0.0.1:8088/api/v3/graphql):
```graphql
{
  block(offset: { height: 0 }) {
    height
    hash
    transactions {
      hash
      unshieldedCreatedOutputs {
        owner
        tokenType
        value
      }
    }
  }
}
```

**Expected Result**: 25 transactions in genesis block, 20 of which have `unshieldedCreatedOutputs`:
- 5 UTXOs to address `mn_addr_undeployed1h3ssm5...` (500,000,000,000,000 each)
- 5 UTXOs to address `mn_addr_undeployed1gkasr3...` (500,000,000,000,000 each)
- 5 UTXOs to address `mn_addr_undeployed1g9nr3m...` (500,000,000,000,000 each)
- 5 UTXOs to address `mn_addr_undeployed12vv6ys...` (500,000,000,000,000 each)

**Note**: The indexer API v1 redirects to v3 (HTTP 308). Always use `/api/v3/graphql`.

### Seeds That Were Tested (No Match)

The following seed patterns were tested and **do not match** any genesis address:
- Sequential: `0x00...00` through `0x00...64` (0-100)
- Substrate well-known: `//Alice`, `//Bob`, `//Charlie`, `//Dave`, `//Eve`, `//Ferdie`
- Common patterns: `aaaa...`, `ffff...`, `deadbeef...`, `cafebabe...`
- Word-based (as hex): `midnight`, `genesis`, `test`, `dev`, `undeployed`
- The public keys themselves used as seeds

### Solution Options

1. **Contact Midnight team** for preview network genesis seeds
2. **Use testnet** with old docker images (node 0.12.1, indexer 2.1.4) where phil seed works
3. **Wait for updated genesis configuration** that includes known test accounts

## References

- NPM packages: https://www.npmjs.com/search?q=%40midnight-ntwrk%2Fwallet-sdk
- All packages are pre-release (beta) versions as of December 2025
