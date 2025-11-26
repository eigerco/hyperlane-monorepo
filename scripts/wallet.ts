import path from "node:path";
import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { nativeToken } from "@midnight-ntwrk/ledger";
import { type Resource, WalletBuilder } from "@midnight-ntwrk/wallet";
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { getZswapNetworkId, NetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { logger, waitForFunds } from './utils.js';

const currentDir = path.resolve(new URL(import.meta.url).pathname, "..");
const testnetWalletSeeds = {
  alice:
    "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim",
  bob: "jaguar false movie since grief relief fatigue rose core squirrel music dawn envelope ritual imitate minor put eager label split industry original wave dune",
};

export interface Config {
  readonly logDir: string;
  readonly indexer: string;
  readonly indexerWS: string;
  readonly node: string;
  readonly proofServer: string;
}

export class TestnetLocalConfig implements Config {
  logDir = path.resolve(
    currentDir,
    "..",
    "logs",
    "standalone",
    `${new Date().toISOString()}.log`,
  );
  indexer = "http://127.0.0.1:8088/api/v1/graphql";
  indexerWS = "ws://127.0.0.1:8088/api/v1/graphql/ws";
  node = "http://127.0.0.1:9944";
  proofServer = "http://127.0.0.1:6300";
  constructor() {
    setNetworkId(NetworkId.Undeployed);
  }
}

const createWallet = async (
  wallet: string,
): Promise<Wallet & Resource> => {
  let config = new TestnetLocalConfig();
  switch (wallet) {
    case "alice":
      return await buildWalletAndWaitForFunds(
        config,
        "0000000000000000000000000000000000000000000000000000000000000001",
      );
    case "bob":
      return await buildWalletAndWaitForFunds(
        config,
        mnemonicToEntropy(testnetWalletSeeds.bob),
      );
    default:
      throw new Error("Wallet seed is required for testnet");
  }
};

const buildWalletAndWaitForFunds = async (
  { indexer, indexerWS, node, proofServer }: Config,
  seed: string,
): Promise<Wallet & Resource> => {
  let wallet: Wallet & Resource;
  wallet = await WalletBuilder.build(
    indexer,
    indexerWS,
    proofServer,
    node,
    seed,
    getZswapNetworkId(),
    "info",
  );
  wallet.start();

  const state = await Rx.firstValueFrom(wallet.state());
  logger.info({ seed }, 'Wallet seed');
  logger.info({ address: state.address, coinPublicKeyLegacy: state.coinPublicKeyLegacy }, 'Wallet address');
  let balance = state.balances[nativeToken()];
  if (balance === undefined || balance === 0n) {
    logger.info({ balance: 0 }, 'Wallet balance');
    logger.info('Waiting to receive tokens...');
    balance = await waitForFunds(wallet);
  }
  logger.info({ balance: balance.toString() }, 'Wallet balance');
  return wallet;
};

const wallet = await createWallet('alice');
await wallet.close();
