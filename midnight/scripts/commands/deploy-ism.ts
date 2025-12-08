import { ISM } from '../utils/ism.js';
import { configureISMProviders, getWallet, logger, waitForSync, type WalletName } from '../utils/index.js';

export async function deployISM(walletName: WalletName) {
  try {
    const wallet = await getWallet(walletName);
    await waitForSync(wallet, walletName);

    const providers = await configureISMProviders(wallet);

    const ism = new ISM(providers);
    logger.info("Deploying ISM contract...");
    const deployedContract = await ism.deploy();

    const contractAddress = deployedContract.deployTxData.public.contractAddress;
    logger.info(`ISM contract deployed! block:${deployedContract.deployTxData.public.blockHeight}`);
    logger.info(`Contract address: ${contractAddress}`);

    await wallet.close();

    return contractAddress;
  } catch (error) {
    console.error(`Error deploying ISM contract: ${error}`);
    process.exit(1);
  }
}
