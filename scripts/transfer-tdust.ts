import { mnemonicToEntropy } from "bip39";
import * as Rx from "rxjs";
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { type Wallet } from "@midnight-ntwrk/wallet-api";
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';

export const waitForFunds = (wallet: Wallet) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.tap((state) => {
        const applyGap = state.syncProgress?.lag.applyGap ?? 0n;
        const sourceGap = state.syncProgress?.lag.sourceGap ?? 0n;
        console.log(
          `Waiting for funds. Backend lag: ${sourceGap}, wallet lag: ${applyGap}, transactions=${state.transactionHistory.length}`,
        );
      }),
      Rx.filter((state) => {
        return state.syncProgress?.synced === true;
      }),
      Rx.map((s) => s.balances[nativeToken()] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

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
    console.log("DINAMO", wallet.state());
    const state = await Rx.firstValueFrom(wallet.state());
    console.log(state);
    console.log(
      `Your wallet address is: ${state.address} ; ${state.coinPublicKeyLegacy}`,
    );
    let balance = state.balances[nativeToken()];
    if (balance === undefined || balance === 0n) {
      console.log(`Your wallet balance is: 0`);
      console.log(`Waiting to receive tokens...`);
      balance = await waitForFunds(wallet);
    }
    console.log(`Your wallet balance is: ${balance}`);

    const aliceSeed = "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim";
    const walletReceiver = await WalletBuilder.build(
      'http://127.0.0.1:8088/api/v1/graphql',
      'ws://127.0.0.1:8088/api/v1/graphql/ws',
      'http://localhost:6300',
      'http://127.0.0.1:9944',
      mnemonicToEntropy(aliceSeed),
      NetworkId.Undeployed
    );
    const stateReceiver = await Rx.firstValueFrom(walletReceiver.state());
    console.log(stateReceiver.address);
    const receiverAddress = stateReceiver.address;
    const transferRecipe = await wallet.transferTransaction([{
      amount:1n,
      type:nativeToken(),
      receiverAddress: receiverAddress
    }]);
    const provenTransaction = await wallet.proveTransaction(transferRecipe);
    const submittedTransaction = await wallet.submitTransaction(provenTransaction);
    console.log('Transaction submitted:', submittedTransaction);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

await main();
