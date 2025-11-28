import { configureProviders } from './deploy.js';
import { Token } from './token.js';
import { getWallet, logger, waitForSync } from './utils.js';

export async function mint() {
  try {
    const contractAddress = "02000d306620f57e9f4e27a5e018e6b2fc742916760d19398843211ac82e612caab1";
    const walletAddress = "0cb0a483e30cbb6bbf397076fecc665264409f2222a5b0a711a7ffe0d9caa2fe";
    const wallet = await getWallet('alice');
    await waitForSync(wallet);

    const providers = await configureProviders(wallet);

    const token = new Token(providers);
    await token.findDeployedContract(contractAddress);
    logger.info("Successfully found contract");

    const recipientAddressBytes = new Uint8Array(
      Buffer.from(walletAddress, "hex"),
    );

    logger.info(`Minting tokens to wallet: ${walletAddress}`);
    const result = await token.mintTo(recipientAddressBytes);
    logger.info(`Tokens minted successfully! block:${result.blockHeight}`);

    await wallet.close();
  } catch (error) {
    console.error(`Error creating wallet or deploying contract: ${error}`);
    process.exit(1);
  }
}
