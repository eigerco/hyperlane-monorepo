import { Command } from 'commander';
import { balance } from './commands/balance.js';
import { deploy } from './commands/deploy.js';
import { deployMailbox } from './commands/deploy-mailbox.js';
import { mint } from './commands/mint.js';
import { send } from './commands/send.js';
import { testMailbox } from './commands/test-mailbox.js';
import { cardanoToMidnight } from './commands/cardano-midnight.js';
import { getWallet, logger, setNetwork, WALLET_SEEDS, type Network, type WalletName } from './utils/index.js';

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
    .command('mint <wallet> <contractAddress>')
    .description('Mint tokens (e.g., mint alice 02000d306620f57e9f4e27a5e018e6b2fc742916760d19398843211ac82e612caab1)')
    .action(async (walletName: string, contractAddress: string) => {
      setNetwork(network);
      if (!(walletName in WALLET_SEEDS)) {
        logger.error(`Unknown wallet: ${walletName}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      await mint(walletName as WalletName, contractAddress);
    });

  networkCommand
    .command('balance <wallet>')
    .description('Show wallet balance including native and custom tokens (e.g., balance alice)')
    .action(async (walletName: string) => {
      setNetwork(network);
      if (!(walletName in WALLET_SEEDS)) {
        logger.error(`Unknown wallet: ${walletName}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      await balance(walletName as WalletName);
    });

  networkCommand
    .command('deploy-mailbox <wallet>')
    .description('Deploy Hyperlane mailbox contract (e.g., deploy-mailbox phil)')
    .action(async (walletName: string) => {
      setNetwork(network);
      if (!(walletName in WALLET_SEEDS)) {
        logger.error(`Unknown wallet: ${walletName}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      await deployMailbox(walletName as WalletName);
    });

  networkCommand
    .command('test-mailbox <wallet> [contractAddress]')
    .description('Test mailbox dispatch/deliver (e.g., test-mailbox phil [address])')
    .action(async (walletName: string, contractAddress?: string) => {
      setNetwork(network);
      if (!(walletName in WALLET_SEEDS)) {
        logger.error(`Unknown wallet: ${walletName}. Available: ${Object.keys(WALLET_SEEDS).join(', ')}`);
        process.exit(1);
      }
      await testMailbox(walletName as WalletName, contractAddress);
    });

  networkCommand
    .command('cardano-midnight')
    .description('Test Cardano → Midnight message delivery with ECDSA verification')
    .action(async () => {
      setNetwork(network);
      await cardanoToMidnight();
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
