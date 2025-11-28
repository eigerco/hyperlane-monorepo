import { Command } from 'commander';
import { deploy } from './deploy.js';
import { mint } from './mint.js';
import { send } from './send.js';
import { getWallet, logger, setNetwork, WALLET_SEEDS, type Network, type WalletName } from './utils.js';

const program = new Command();

program
  .name('midnight-hyperlane')
  .description('Hyperlane cross-chain messaging on Midnight blockchain')
  .version('0.1.0')
  .exitOverride();

function addCommands(networkCommand: Command, network: Network) {
  networkCommand
    .command('send <sender> <receiver> <amount>')
    .description('Send tDUST tokens (e.g., send phil alice 100000)')
    .action(async (sender: string, receiver: string, amount: string) => {
      setNetwork(network);
      if (!(sender in WALLET_SEEDS)) {
        logger.error(`Unknown sender wallet: ${sender}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      if (!(receiver in WALLET_SEEDS)) {
        logger.error(`Unknown receiver wallet: ${receiver}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      await send(sender as WalletName, receiver as WalletName, BigInt(amount));
    });

  networkCommand
    .command('state <wallet>')
    .description('State of wallet (e.g., state alice)')
    .action(async (walletName: string) => {
      setNetwork(network);
      if (!(walletName in WALLET_SEEDS)) {
        logger.error(`Unknown wallet: ${walletName}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      const wallet = await getWallet(walletName as WalletName);
      wallet.state().subscribe((state) => {
        logger.info({ state }, `${walletName}'s wallet state`);
      });
    });

  networkCommand
    .command('deploy <wallet>')
    .description('Deploy contract (e.g., deploy phil)')
    .action(async (walletName: string) => {
      setNetwork(network);
      if (!(walletName in WALLET_SEEDS)) {
        logger.error(`Unknown wallet: ${walletName}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      await deploy(walletName as WalletName);
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
