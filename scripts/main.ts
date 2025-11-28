import { Command } from 'commander';
import { deploy } from './deploy.js';
import { mint } from './mint.js';
import { send } from './send.js';
import { getWallet, logger, setNetwork, type Network } from './utils.js';

const program = new Command();

program
  .name('midnight-hyperlane')
  .description('Hyperlane cross-chain messaging on Midnight blockchain')
  .version('0.1.0')
  .exitOverride();

function addCommands(networkCommand: Command, network: Network) {
  networkCommand
    .command('send')
    .description('Send tDUST tokens')
    .action(async () => {
      setNetwork(network);
      await send();
    });

  networkCommand
    .command('state')
    .description('State of Alice wallet')
    .action(async () => {
      setNetwork(network);
      const wallet = await getWallet('alice');
      wallet.state().subscribe((state) => {
        logger.info({ state }, 'Wallet state');
      });
    });

  networkCommand
    .command('deploy')
    .description('Deploy contract')
    .action(async () => {
      setNetwork(network);
      await deploy();
    });

  networkCommand
    .command('mint')
    .description('Mint tokens')
    .action(async () => {
      setNetwork(network);
      await mint();
    });
}

const local = program
  .command('local')
  .description('Run commands on local standalone network');
addCommands(local, 'local');

const testnet = program
  .command('testnet')
  .description('Run commands on testnet');
addCommands(testnet, 'testnet');

try {
  program.parse();
} catch {
  // Suppress exit code error when showing help
}
