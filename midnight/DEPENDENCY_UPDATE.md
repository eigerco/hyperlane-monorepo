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

## References

- NPM packages: https://www.npmjs.com/search?q=%40midnight-ntwrk%2Fwallet-sdk
- All packages are pre-release (beta) versions as of December 2025
