import { Mailbox, MailboxPrivateStateId } from '../utils/mailbox.js';
import { configureMailboxProviders, getWallet, logger, waitForSync, type WalletName } from '../utils/index.js';

export async function deployMailbox(walletName: WalletName) {
  try {
    const wallet = await getWallet(walletName);
    await waitForSync(wallet, walletName);

    const providers = await configureMailboxProviders(wallet);

    const mailbox = new Mailbox(providers);
    logger.info("Deploying mailbox contract...");
    const deployedContract = await mailbox.deploy();

    const contractAddress = deployedContract.deployTxData.public.contractAddress;
    logger.info(`Mailbox contract deployed! block:${deployedContract.deployTxData.public.blockHeight}`);
    logger.info(`Contract address: ${contractAddress}`);

    // Initialize the mailbox
    logger.info("Initializing mailbox...");
    const initResult = await mailbox.initialize();
    logger.info(`Mailbox initialized! block:${initResult.blockHeight}`);

    await wallet.close();

    return contractAddress;
  } catch (error) {
    console.error(`Error deploying mailbox contract: ${error}`);
    process.exit(1);
  }
}
