import { Token } from '../utils/token.js';
import { configureProviders, getWallet, logger, waitForSync, type WalletName } from '../utils/index.js';

export async function deploy(walletName: WalletName) {
  try {
    const wallet = await getWallet(walletName);
    await waitForSync(wallet, walletName);

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
    logger.error(`Error creating wallet or deploying contract: ${error}`);
    process.exit(1);
  }
}
