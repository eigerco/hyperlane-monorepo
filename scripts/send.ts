import { mnemonicToEntropy } from "bip39";
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';
import { logger, waitForSync, waitForTxToArrive } from './utils.js';

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

type WalletName = keyof typeof WALLET_SEEDS;

const CONFIG = {
  indexer: 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
  indexerWS: 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
  proofServer: 'http://localhost:6300',
  node: 'https://rpc.testnet-02.midnight.network',
} as const;

export async function getWallet(name: WalletName): Promise<Wallet & Resource> {
  const wallet = await WalletBuilder.build(
    CONFIG.indexer,
    CONFIG.indexerWS,
    CONFIG.proofServer,
    CONFIG.node,
    WALLET_SEEDS[name],
    NetworkId.TestNet
  );
  wallet.start();
  return wallet;
}

export async function send() {
  try {
    const walletSender = await getWallet('phil');
    const walletReceiver = await getWallet('alice');

    let stateSender = await waitForSync(walletSender);
    let stateReceiver = await waitForSync(walletReceiver);
    let senderBalance = stateSender.balances[nativeToken()] ?? 0n;
    let receiverBalance = stateReceiver.balances[nativeToken()] ?? 0n;
    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance before transfer');

    const receiverAddress = stateReceiver.address;
    const transferRecipe = await walletSender.transferTransaction([{
      amount:1n,
      type:nativeToken(),
      receiverAddress: receiverAddress
    }]);
    const provenTransaction = await walletSender.proveTransaction(transferRecipe);
    logger.info({ transactionHash: provenTransaction.transactionHash() }, 'Transaction proved');
    const submittedTransaction = await walletSender.submitTransaction(provenTransaction);
    logger.info({ transactionIdentifier: submittedTransaction }, 'Transaction submitted');

    const txHash = provenTransaction.transactionHash();
    stateReceiver = await waitForTxToArrive(walletReceiver, txHash);
    logger.info({ transactionHash: txHash }, 'Transaction confirmed in receiver wallet');

    const receiverState = await waitForSync(walletReceiver);
    receiverBalance = receiverState.balances[nativeToken()] ?? 0n;
    const senderState = await waitForSync(walletSender);
    senderBalance = senderState.balances[nativeToken()] ?? 0n;
    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance after transfer');

    await walletSender.close();
    await walletReceiver.close();
  } catch (error) {
    logger.error({ error }, 'An error occurred');
  }
}
