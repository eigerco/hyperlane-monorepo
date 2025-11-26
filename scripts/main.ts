import { Command } from 'commander';
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
    // TODO: implement send command
    logger.info('Send command not yet implemented');
  });

try {
  program.parse();
} catch {
  // Suppress exit code error when showing help
}
