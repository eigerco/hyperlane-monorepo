import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { type CoinInfo, Transaction, type TransactionId } from "@midnight-ntwrk/ledger";
import { type Resource } from "@midnight-ntwrk/wallet";
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { type BalancedTransaction, createBalancedTx, type MidnightProvider, type UnbalancedTransaction, type WalletProvider } from "@midnight-ntwrk/midnight-js-types";
import { getLedgerNetworkId, getZswapNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import path from "node:path";
import * as Rx from "rxjs";
import { Token, TokenPrivateStateId } from './token.js';
import { getConfig, getWallet, logger, waitForSync } from './utils.js';

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

export async function deploy() {
  try {
    const wallet = await getWallet('phil');
    await waitForSync(wallet);

    const providers = await configureProviders(wallet);

    const token = new Token(providers);
    logger.info("Deploying token contract...");
    const deployedContract = await token.deploy();

    const contractAddress =
      deployedContract.deployTxData.public.contractAddress;
    logger.info(
      `Token contract deployed successfully! block:${deployedContract.deployTxData.public.blockHeight}`,
    );
    logger.info(`Contract address: ${contractAddress}`);

    await wallet.close();
  } catch (error) {
    console.error(`Error creating wallet or deploying contract: ${error}`);
    process.exit(1);
  }
}
