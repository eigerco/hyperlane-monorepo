import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';
import { logger, waitForFunds } from './utils.js';

const testnetWalletSeeds = {
  alice:
    "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim",
  bob: "jaguar false movie since grief relief fatigue rose core squirrel music dawn envelope ritual imitate minor put eager label split industry original wave dune",
};

export async function send() {
  try {
    const wallet = await WalletBuilder.build(
      'http://127.0.0.1:8088/api/v1/graphql',
      'ws://127.0.0.1:8088/api/v1/graphql/ws',
      'http://localhost:6300',
      'http://127.0.0.1:9944',
      '0000000000000000000000000000000000000000000000000000000000000001',
      NetworkId.Undeployed
    );
    wallet.start();
    const state = await Rx.firstValueFrom(wallet.state());
    let senderBalance = state.balances[nativeToken()];
    if (senderBalance === undefined || senderBalance === 0n) {
      senderBalance = await waitForFunds(wallet);
    }

    const aliceSeed = testnetWalletSeeds.alice;
    const walletReceiver = await WalletBuilder.build(
      'http://127.0.0.1:8088/api/v1/graphql',
      'ws://127.0.0.1:8088/api/v1/graphql/ws',
      'http://localhost:6300',
      'http://127.0.0.1:9944',
      mnemonicToEntropy(aliceSeed),
      NetworkId.Undeployed
    );
    walletReceiver.start();
    let stateReceiver = await Rx.firstValueFrom(walletReceiver.state());
    let receiverBalance = stateReceiver.balances[nativeToken()] ?? 0n;

    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance before transfer');

    const receiverAddress = stateReceiver.address;
    const transferRecipe = await wallet.transferTransaction([{
      amount:1n,
      type:nativeToken(),
      receiverAddress: receiverAddress
    }]);
    const provenTransaction = await wallet.proveTransaction(transferRecipe);
    const submittedTransaction = await wallet.submitTransaction(provenTransaction);
    logger.info({ transaction: submittedTransaction }, 'Transaction submitted');

    receiverBalance = await waitForFunds(walletReceiver);
    const senderState = await Rx.firstValueFrom(wallet.state());
    senderBalance = senderState.balances[nativeToken()] ?? 0n;

    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance after transfer');

    await wallet.close();
    await walletReceiver.close();
  } catch (error) {
    logger.error({ error }, 'An error occurred');
  }
}
