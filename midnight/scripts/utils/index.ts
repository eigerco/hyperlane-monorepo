import pino from "pino";
import * as Rx from "rxjs";
import path from "node:path";
import { mnemonicToEntropy } from "bip39";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { type CoinInfo, Transaction, type TransactionId } from "@midnight-ntwrk/ledger";
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { type BalancedTransaction, createBalancedTx, type MidnightProvider, type UnbalancedTransaction, type WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { getLedgerNetworkId, getZswapNetworkId, NetworkId as JsNetworkId,setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { NetworkId, Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { TokenPrivateStateId } from './token.js';

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

const zswapToJsNetworkId: Record<NetworkId, JsNetworkId> = {
  [NetworkId.Undeployed]: JsNetworkId.Undeployed,
  [NetworkId.DevNet]: JsNetworkId.DevNet,
  [NetworkId.TestNet]: JsNetworkId.TestNet,
  [NetworkId.MainNet]: JsNetworkId.MainNet,
};

export function setNetwork(network: Network) {
  currentNetwork = network;
  setNetworkId(zswapToJsNetworkId[CONFIGS[network].networkId]);
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

export const waitForSync = (wallet: Wallet, walletName: string) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap(() => {
        logger.info(`Waiting for ${walletName}'s wallet to sync...`);
      }),
      Rx.filter((state) =>
        state.syncProgress?.synced === true &&
        state.syncProgress?.lag.applyGap === 0n &&
        state.syncProgress?.lag.sourceGap === 0n
      ),
    ),
  );

export const waitForTxToArrive = (wallet: Wallet, txHash: String, walletName: string) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap(() => {
        logger.info(`Waiting for transaction to appear in ${walletName}'s history...`);
      }),
      Rx.filter((state) =>
        state.transactionHistory.some((tx) => tx.transactionHash === txHash)
      ),
    ),
  );

export const createWalletAndMidnightProvider = async (
  wallet: Wallet,
): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(wallet.state());
  return {
    coinPublicKey: state.coinPublicKey,
    encryptionPublicKey: state.encryptionPublicKey,
    balanceTx(
      tx: UnbalancedTransaction,
      newCoins: CoinInfo[],
    ): Promise<BalancedTransaction> {
      return wallet
        .balanceTransaction(
          ZswapTransaction.deserialize(
            tx.serialize(getLedgerNetworkId()),
            getZswapNetworkId(),
          ),
          newCoins,
        )
        .then((tx) => wallet.proveTransaction(tx))
        .then((zswapTx) =>
          Transaction.deserialize(
            zswapTx.serialize(getZswapNetworkId()),
            getLedgerNetworkId(),
          ),
        )
        .then(createBalancedTx);
    },
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return wallet.submitTransaction(tx);
    },
  };
};

const currentDir = path.resolve(new URL(import.meta.url).pathname, ".");
export const contractConfig = {
  privateStateStoreName: "token-private-state",
  zkConfigPath: path.resolve(
    currentDir,
    "..",
    "..",
    "..",
    "contracts",
    "token",
    "build",
  ),
};

export const configureProviders = async (
  wallet: Wallet & Resource,
) => {
  const config = getConfig();
  const walletAndMidnightProvider =
    await createWalletAndMidnightProvider(wallet);
  return {
    privateStateProvider: levelPrivateStateProvider<typeof TokenPrivateStateId>(
      {
        privateStateStoreName: contractConfig.privateStateStoreName,
      },
    ),
    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS,
    ),
    zkConfigProvider: new NodeZkConfigProvider<"mint_to">(
      contractConfig.zkConfigPath,
    ),
    proofProvider: httpClientProofProvider(config.proofServer),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};
