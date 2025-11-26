import { Command } from 'commander';

const program = new Command();

program
  .name('midnight-hyperlane')
  .description('Hyperlane cross-chain messaging on Midnight blockchain')
  .version('0.1.0');

program
  .command('wallet')
  .description('Create and check wallet balance')
  .action(async () => {
    // TODO: implement wallet command
    console.log('Wallet command not yet implemented');
  });

program
  .command('transfer')
  .description('Transfer tDUST tokens')
  .action(async () => {
    // TODO: implement transfer command
    console.log('Transfer command not yet implemented');
  });

program.parse();
