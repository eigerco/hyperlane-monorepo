import { Command } from 'commander';
import { WalletBuilder } from '@midnight-ntwrk/wallet';
import { NetworkId } from '@midnight-ntwrk/zswap';
import { getWallet, send, WALLET_SEEDS } from './send.js';
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
    let wallet = await getWallet('alice');
    wallet.state().subscribe((state) => {
      console.log(state);
    });
  });

try {
  program.parse();
} catch {
  // Suppress exit code error when showing help
}
