import { Token } from './token.js';
import { configureProviders, getWallet, logger, waitForSync, type WalletName } from './utils.js';

export async function mint(walletName: WalletName, contractAddress: string) {
  try {
    const wallet = await getWallet(walletName);
    const state = await waitForSync(wallet, walletName);

    const providers = await configureProviders(wallet);

    const token = new Token(providers);
    await token.findDeployedContract(contractAddress);
    logger.info("Successfully found contract");

    const coinPublicKeyLegacy = state.coinPublicKeyLegacy;
    const recipientAddressBytes = new Uint8Array(
      Buffer.from(coinPublicKeyLegacy, "hex"),
    );

    logger.info(`Minting tokens to ${walletName}'s wallet`);
    const result = await token.mintTo(recipientAddressBytes);
    logger.info(`Tokens minted successfully! block:${result.blockHeight}`);

    await wallet.close();
  } catch (error) {
    console.error(`Error creating wallet or deploying contract: ${error}`);
    process.exit(1);
  }
}
