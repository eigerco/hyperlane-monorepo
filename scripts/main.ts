import { Command } from 'commander';
import { logger } from './utils.js';

const program = new Command();

program
  .name('midnight-hyperlane')
  .description('Hyperlane cross-chain messaging on Midnight blockchain')
  .version('0.1.0');

program
  .command('transfer')
  .description('Transfer tDUST tokens')
  .action(async () => {
    // TODO: implement transfer command
    logger.info('Transfer command not yet implemented');
  });

program.parse();
