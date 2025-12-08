import { nativeToken } from '@midnight-ntwrk/zswap';
import { getWallet, logger, waitForSync, waitForTxToArrive, type WalletName } from '../utils/index.js';

export async function send(sender: WalletName, receiver: WalletName, amount: bigint, tokenType?: string) {
  try {
    const walletSender = await getWallet(sender);
    const walletReceiver = await getWallet(receiver);

    const effectiveTokenType = tokenType ?? nativeToken();
    const tokenLabel = tokenType ? `token ${tokenType.slice(0, 16)}...` : 'tDUST';

    let stateSender = await waitForSync(walletSender, sender);
    let stateReceiver = await waitForSync(walletReceiver, receiver);
    let senderBalance = stateSender.balances[effectiveTokenType] ?? 0n;
    let receiverBalance = stateReceiver.balances[effectiveTokenType] ?? 0n;
    logger.info({ [sender]: senderBalance.toString(), [receiver]: receiverBalance.toString() }, `${tokenLabel} balance before transfer`);

    if (senderBalance < amount) {
      logger.error(`Insufficient balance: ${sender} has ${senderBalance} but needs ${amount}`);
      await walletSender.close();
      await walletReceiver.close();
      process.exit(1);
    }

    const receiverAddress = stateReceiver.address;
    const transferRecipe = await walletSender.transferTransaction([{
      amount,
      type: effectiveTokenType,
      receiverAddress: receiverAddress
    }]);
    const provenTransaction = await walletSender.proveTransaction(transferRecipe);
    logger.info({ transactionHash: provenTransaction.transactionHash() }, 'Transaction proved');
    const submittedTransaction = await walletSender.submitTransaction(provenTransaction);
    logger.info({ transactionIdentifier: submittedTransaction }, 'Transaction submitted');

    const txHash = provenTransaction.transactionHash();
    stateReceiver = await waitForTxToArrive(walletReceiver, txHash, receiver);
    logger.info({ transactionHash: txHash }, `Transaction confirmed in ${receiver}'s wallet`);

    const receiverState = await waitForSync(walletReceiver, receiver);
    receiverBalance = receiverState.balances[effectiveTokenType] ?? 0n;
    const senderState = await waitForSync(walletSender, sender);
    senderBalance = senderState.balances[effectiveTokenType] ?? 0n;
    logger.info({ [sender]: senderBalance.toString(), [receiver]: receiverBalance.toString() }, `${tokenLabel} balance after transfer`);

    await walletSender.close();
    await walletReceiver.close();
  } catch (error) {
    logger.error({ error }, 'An error occurred');
  }
}
