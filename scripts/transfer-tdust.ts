import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';
import { logger, waitForFunds } from './utils.js';

async function main() {
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
    let balance = state.balances[nativeToken()];
    if (balance === undefined || balance === 0n) {
      balance = await waitForFunds(wallet);
    }
    logger.info({ balance: balance.toString() }, 'Wallet balance');

    const aliceSeed = "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim";
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
    logger.info({ address: stateReceiver.address }, 'Receiver address');
    const receiverAddress = stateReceiver.address;
    const transferRecipe = await wallet.transferTransaction([{
      amount:1n,
      type:nativeToken(),
      receiverAddress: receiverAddress
    }]);
    const provenTransaction = await wallet.proveTransaction(transferRecipe);
    const submittedTransaction = await wallet.submitTransaction(provenTransaction);
    logger.info({ transaction: submittedTransaction }, 'Transaction submitted');

    stateReceiver = await Rx.firstValueFrom(walletReceiver.state());
    let balanceReceiver = stateReceiver.balances[nativeToken()];
    if (balanceReceiver === undefined || balanceReceiver === 0n) {
      balanceReceiver = await waitForFunds(walletReceiver);
    }
    logger.info({ balance: balanceReceiver.toString() }, 'Wallet Receiver balance');

    await wallet.close();
    await walletReceiver.close();
  } catch (error) {
    logger.error({ error }, 'An error occurred');
  }
}

await main();
