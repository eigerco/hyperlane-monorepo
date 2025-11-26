import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';
import { logger, waitForFunds } from './utils.js';

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
  indexer: 'http://127.0.0.1:8088/api/v1/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v1/graphql/ws',
  proofServer: 'http://localhost:6300',
  node: 'http://127.0.0.1:9944',
} as const;

export async function getWallet(name: WalletName): Promise<Wallet & Resource> {
  const wallet = await WalletBuilder.build(
    CONFIG.indexer,
    CONFIG.indexerWS,
    CONFIG.proofServer,
    CONFIG.node,
    WALLET_SEEDS[name],
    NetworkId.Undeployed
  );
  wallet.start();
  return wallet;
}

export async function send() {
  try {
    const walletSender = await getWallet('phil');
    const walletReceiver = await getWallet('alice');
    await waitForFunds(walletSender);

    let stateSender = await Rx.firstValueFrom(walletSender.state());
    let senderBalance = stateSender.balances[nativeToken()] ?? 0n;

    let stateReceiver = await Rx.firstValueFrom(walletReceiver.state());
    let receiverBalance = stateReceiver.balances[nativeToken()] ?? 0n;

    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance before transfer');

    const receiverAddress = stateReceiver.address;
    const transferRecipe = await walletSender.transferTransaction([{
      amount:1n,
      type:nativeToken(),
      receiverAddress: receiverAddress
    }]);
    const provenTransaction = await walletSender.proveTransaction(transferRecipe);
    logger.info({ provenTransaction: provenTransaction.transactionHash() }, 'Transaction proved');
    const submittedTransaction = await walletSender.submitTransaction(provenTransaction);
    logger.info({ transaction: submittedTransaction }, 'Transaction submitted');

    receiverBalance = await waitForFunds(walletReceiver);
    const senderState = await Rx.firstValueFrom(walletSender.state());
    senderBalance = senderState.balances[nativeToken()] ?? 0n;

    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance after transfer');

    const txHash = provenTransaction.transactionHash();
    stateReceiver = await Rx.firstValueFrom(
      walletReceiver.state().pipe(
        Rx.throttleTime(10_000),
        Rx.tap(() => {
          logger.info('Waiting for transaction to appear in receiver history...');
        }),
        Rx.filter((state) =>
          state.transactionHistory.some((tx) => tx.transactionHash === txHash)
        ),
      ),
    );
    logger.info({ transactionHash: txHash }, 'Transaction confirmed in receiver wallet');
    await walletSender.close();
    await walletReceiver.close();
  } catch (error) {
    logger.error({ error }, 'An error occurred');
  }
}
