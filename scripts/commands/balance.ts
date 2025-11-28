import { nativeToken } from '@midnight-ntwrk/zswap';
import { getWallet, logger, waitForSync, type WalletName } from '../utils/index.js';

export async function balance(walletName: WalletName) {
  try {
    const wallet = await getWallet(walletName);
    const state = await waitForSync(wallet, walletName);

    const nativeTokenType = nativeToken();
    const nativeBalance = state.balances[nativeTokenType] ?? 0n;

    logger.info(`💳 Balance for ${walletName}`);
    logger.info(`   Native token (tDUST): ${nativeBalance.toString()}`);

    for (const [tokenType, amount] of Object.entries(state.balances)) {
      if (tokenType !== nativeTokenType) {
        logger.info(`   Custom token ${tokenType}: ${amount.toString()}`);
      }
    }

    await wallet.close();
  } catch (error) {
    logger.error({ error }, 'Error getting balance');
    process.exit(1);
  }
}
