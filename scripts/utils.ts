import pino from "pino";
import * as Rx from "rxjs";
import { mnemonicToEntropy } from "bip39";
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { NetworkId } from '@midnight-ntwrk/zswap';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

export const WALLET_SEEDS = {
  alice: mnemonicToEntropy(
    "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim"
  ),
  bob: mnemonicToEntropy(
    "jaguar false movie since grief relief fatigue rose core squirrel music dawn envelope ritual imitate minor put eager label split industry original wave dune"
  ),
  // Pre-funded account, can be found on Midnight node when it is started from scratch
  // AKA Genesis account
  // Named Phil after Phil Collins from band Genesis
  phil: "0000000000000000000000000000000000000000000000000000000000000001",
} as const;

export type WalletName = keyof typeof WALLET_SEEDS;

export type Network = 'local' | 'testnet';

const CONFIGS = {
  local: {
    indexer: 'http://127.0.0.1:8088/api/v1/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v1/graphql/ws',
    proofServer: 'http://localhost:6300',
    node: 'http://127.0.0.1:9944',
    networkId: NetworkId.Undeployed,
  },
  testnet: {
    indexer: 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
    indexerWS: 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
    proofServer: 'http://localhost:6300',
    node: 'https://rpc.testnet-02.midnight.network',
    networkId: NetworkId.TestNet,
  },
} as const;

let currentNetwork: Network = 'local';

export function setNetwork(network: Network) {
  currentNetwork = network;
}

export function getConfig() {
  return CONFIGS[currentNetwork];
}

export async function getWallet(name: WalletName): Promise<Wallet & Resource> {
  const config = CONFIGS[currentNetwork];
  const wallet = await WalletBuilder.build(
    config.indexer,
    config.indexerWS,
    config.proofServer,
    config.node,
    WALLET_SEEDS[name],
    config.networkId
  );
  wallet.start();
  return wallet;
}

export const waitForSync = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap(() => {
        logger.info('Waiting for wallet to sync...');
      }),
      Rx.filter((state) =>
        state.syncProgress?.synced === true &&
        state.syncProgress?.lag.applyGap === 0n &&
        state.syncProgress?.lag.sourceGap === 0n
      ),
    ),
  );

export const waitForTxToArrive = (wallet: Wallet, txHash: String) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap(() => {
        logger.info('Waiting for transaction to appear in receiver history...');
      }),
      Rx.filter((state) =>
        state.transactionHistory.some((tx) => tx.transactionHash === txHash)
      ),
    ),
  );
