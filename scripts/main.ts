import { Command } from 'commander';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId } from '@midnight-ntwrk/zswap';
import { send, testnetWalletSeeds } from './send.js';
import { logger } from './utils.js';

const program = new Command();

program
  .name('midnight-hyperlane')
  .description('Hyperlane cross-chain messaging on Midnight blockchain')
  .version('0.1.0')
  .exitOverride();

program
  .command('send')
  .description('Send tDUST tokens')
  .action(async () => {
    await send();
  });

program
  .command('state')
  .description('State of Alice wallet')
  .action(async () => {
    const wallet = await WalletBuilder.build(
      'http://127.0.0.1:8088/api/v1/graphql',
      'ws://127.0.0.1:8088/api/v1/graphql/ws',
      'http://localhost:6300',
      'http://127.0.0.1:9944',
      testnetWalletSeeds.alice,
      NetworkId.Undeployed
    );
    wallet.start();
    wallet.state().subscribe((state) => {
      console.log(state);
    });
  });

try {
  program.parse();
} catch {
  // Suppress exit code error when showing help
}
