import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { type Resource, WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';
import { logger, waitForFunds } from './utils.js';

const WALLET_SEEDS = {
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

async function getBalance(wallet: Wallet): Promise<bigint> {
  const state = await Rx.firstValueFrom(wallet.state());
  let balance = state.balances[nativeToken()];
  if (balance === undefined || balance === 0n) {
    balance = await waitForFunds(wallet);
  }
  return balance;
}

async function getAddress(wallet: Wallet): Promise<string> {
  const state = await Rx.firstValueFrom(wallet.state());
  return state.address;
}

async function transfer(from: Wallet, toAddress: string, amount: bigint): Promise<string> {
  const transferRecipe = await from.transferTransaction([{
    amount,
    type: nativeToken(),
    receiverAddress: toAddress,
  }]);
  const provenTransaction = await from.proveTransaction(transferRecipe);
  return await from.submitTransaction(provenTransaction);
}

export async function send() {
  try {
    const senderWallet = await getWallet('phil');
    const receiverWallet = await getWallet('alice');
    const amount = 1n;

    const senderBalanceBefore = await getBalance(senderWallet);
    // const receiverBalanceBefore = await getBalance(receiverWallet);
    const receiverBalanceBefore = 0;

    logger.info({
      sender: senderBalanceBefore.toString(),
      receiver: receiverBalanceBefore.toString(),
    }, 'Balance before transfer');

    const receiverAddress = await getAddress(receiverWallet);
    const txHash = await transfer(senderWallet, receiverAddress, amount);
    logger.info({ transaction: txHash }, 'Transaction submitted');

    const receiverBalanceAfter = await getBalance(receiverWallet);
    const senderBalanceAfter = await getBalance(senderWallet);

    logger.info({
      sender: senderBalanceAfter.toString(),
      receiver: receiverBalanceAfter.toString(),
    }, 'Balance after transfer');

    await senderWallet.close();
    await receiverWallet.close();
  } catch (error) {
    logger.error({ error }, 'An error occurred');
  }
}
