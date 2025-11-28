import { nativeToken } from '@midnight-ntwrk/zswap';
import { getWallet, logger, waitForSync, waitForTxToArrive, type WalletName } from './utils.js';

export async function send(sender: WalletName, receiver: WalletName, amount: bigint) {
  try {
    const walletSender = await getWallet(sender);
    const walletReceiver = await getWallet(receiver);

    let stateSender = await waitForSync(walletSender);
    let stateReceiver = await waitForSync(walletReceiver);
    let senderBalance = stateSender.balances[nativeToken()] ?? 0n;
    let receiverBalance = stateReceiver.balances[nativeToken()] ?? 0n;
    logger.info({ sender: senderBalance.toString(), receiver: receiverBalance.toString() }, 'Balance before transfer');

    const receiverAddress = stateReceiver.address;
    const transferRecipe = await walletSender.transferTransaction([{
      amount,
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
