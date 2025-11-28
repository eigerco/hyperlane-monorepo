import { configureProviders } from './deploy.js';
import { Token } from './token.js';
import { getWallet, logger, waitForSync } from './utils.js';

export async function mint() {
  try {
    const contractAddress = "02000d306620f57e9f4e27a5e018e6b2fc742916760d19398843211ac82e612caab1";
    const wallet = await getWallet('phil');
    await waitForSync(wallet);

    const providers = await configureProviders(wallet);

    const token = new Token(providers);
    await token.findDeployedContract(contractAddress);
    logger.info("Successfully found contract");

    await wallet.close();
  } catch (error) {
    console.error(`Error creating wallet or deploying contract: ${error}`);
    process.exit(1);
  }
}
