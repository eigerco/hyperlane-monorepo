import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId, nativeToken } from '@midnight-ntwrk/zswap';

try {
  const wallet = await WalletBuilder.build(
    'https://indexer.testnet-02.midnight.network/api/v1/graphql',
    'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
    'http://localhost:6300',
    'https://rpc.testnet-02.midnight.network',
    '0000000000000000000000000000000000000000000000000000000000000000',
    NetworkId.TestNet
  );
  wallet.start();
  const transferRecipe = await wallet.transferTransaction([{
    amount:1n,
    type:nativeToken(),
    receiverAddress: 'mn_shield-addr_test1kjwksfp8x2tachehsfvufsdl35ljg5cxzdcysjdn6ntadspyxn3qxqrxypgjm055c2azrpuyn7un0ge2vm25vkfv38d24rj3ewcku5wmdc94gjr9'// Example Bech32m address
  }]);
  const provenTransaction = await wallet.proveTransaction(transferRecipe);
  const submittedTransaction = await wallet.submitTransaction(provenTransaction);
  console.log('Transaction submitted:', submittedTransaction);
} catch (error) {
  console.error('An error occurred:', error);
}
