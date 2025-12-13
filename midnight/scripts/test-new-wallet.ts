/**
 * Test new wallet SDK balance functionality.
 * Run with: yarn new-wallet [--network local|preview] [--seed alice|bob|phil|<hex>]
 *
 * Examples:
 *   yarn new-wallet                           # local network, alice seed
 *   yarn new-wallet --network preview         # preview network, alice seed
 *   yarn new-wallet --network preview --seed phil
 *   yarn new-wallet --seed 0x123...           # custom seed
 */

import * as ledger from '@midnight-ntwrk/ledger-v6';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet, createKeystore, PublicKey, InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';
import { mnemonicToEntropy } from 'bip39';

// Network configurations
const NETWORKS = {
  local: {
    indexer: 'http://127.0.0.1:8088/api/v3/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
    proofServer: 'http://localhost:6300',
    node: 'ws://127.0.0.1:9944',
    networkId: 'undeployed' as NetworkId.NetworkId,
  },
  preview: {
    indexer: 'https://indexer.preview.midnight.network/api/v1/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v1/graphql/ws',
    proofServer: 'http://localhost:6300', // Local proof server connected to preview
    node: 'wss://rpc.preview.midnight.network',
    networkId: 'preview' as NetworkId.NetworkId,
  },
};

// Well-known test seeds (matching scripts/utils/index.ts)
const SEEDS: Record<string, string> = {
  // Alice - from mnemonic
  alice: mnemonicToEntropy(
    "erase indicate catch trash beauty skirt eyebrow raise chief web topic venture brand power state clump find fringe wool analyst report text gym claim"
  ),
  // Bob - from mnemonic
  bob: mnemonicToEntropy(
    "jaguar false movie since grief relief fatigue rose core squirrel music dawn envelope ritual imitate minor put eager label split industry original wave dune"
  ),
  // Phil - genesis account on testnet (NOT on preview)
  phil: "0000000000000000000000000000000000000000000000000000000000000001",
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let network = 'local';
  let seedName = 'alice';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      network = args[i + 1];
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      seedName = args[i + 1];
      i++;
    }
  }

  return { network, seedName };
}

async function testUnshieldedBalance(config: typeof NETWORKS.local, seed: string, seedName: string) {
  console.log('\n=== Testing UNSHIELDED wallet ===');
  console.log('Network:', config.networkId);
  console.log('Indexer:', config.indexer);

  try {
    // Create keystore from seed
    console.log('Creating keystore...');
    const seedBytes = Uint8Array.from(Buffer.from(seed, 'hex'));
    const keystore = createKeystore(seedBytes, config.networkId);
    const publicKey = PublicKey.fromKeyStore(keystore);
    console.log('Keystore created');
    console.log('  Seed name:', seedName);
    console.log('  Address:', publicKey.address);

    // Create unshielded wallet with configuration
    console.log('Creating unshielded wallet...');
    const walletConfig = {
      networkId: config.networkId,
      indexerClientConnection: {
        indexerHttpUrl: config.indexer,
        indexerWsUrl: config.indexerWS,
      },
      txHistoryStorage: new InMemoryTransactionHistoryStorage(),
    };

    const WalletClass = UnshieldedWallet(walletConfig);
    const wallet = WalletClass.startWithPublicKey(publicKey);
    console.log('Wallet started');

    // Start syncing
    console.log('Calling wallet.start()...');
    await wallet.start();
    console.log('Wallet start() called');

    console.log('Waiting for wallet to sync...');

    // Subscribe to state updates
    const subscription = wallet.state.subscribe({
      next: (state) => {
        console.log('Unshielded state update:', {
          progress: state.progress,
          balances: state.balances,
          coinsCount: state.totalCoins.length,
        });
      },
      error: (err) => console.error('State error:', err),
    });

    // Wait with timeout (longer for preview network)
    const timeoutMs = config.networkId === 'preview' ? 120000 : 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Sync timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const state = await Promise.race([
        wallet.waitForSyncedState(),
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof wallet.waitForSyncedState>>;
      console.log('Unshielded wallet synced');
      subscription.unsubscribe();

      console.log(`\nUNSHIELDED Balance for ${seedName}`);
      console.log('   Address:', publicKey.address);
      console.log('   Balances:', state.balances);
      console.log('   Coins:', state.totalCoins.length);

      return { address: publicKey.address, balances: state.balances, coins: state.totalCoins.length };
    } catch (timeoutError) {
      subscription.unsubscribe();
      console.error('Sync timed out:', timeoutError);
      return null;
    }
  } catch (error) {
    console.error('Unshielded wallet failed:', error);
    return null;
  }
}

async function testShieldedBalance(config: typeof NETWORKS.local, seed: string, seedName: string) {
  console.log('\n=== Testing SHIELDED wallet ===');
  console.log('Network:', config.networkId);
  console.log('Proof Server:', config.proofServer);

  try {
    // Derive secret keys from seed
    console.log('Deriving secret keys...');
    const seedBytes = Uint8Array.from(Buffer.from(seed, 'hex'));
    const secretKeys = ledger.ZswapSecretKeys.fromSeed(seedBytes);
    console.log('Secret keys derived');
    console.log('  Seed name:', seedName);
    console.log('  Encryption public key:', secretKeys.encryptionPublicKey.toString());

    // Create shielded wallet with configuration
    console.log('Creating shielded wallet...');
    const walletConfig = {
      networkId: config.networkId,
      indexerClientConnection: {
        indexerHttpUrl: config.indexer,
        indexerWsUrl: config.indexerWS,
      },
      provingServerUrl: new URL(config.proofServer),
      relayURL: new URL(config.node),
    };

    const WalletClass = ShieldedWallet(walletConfig);
    const wallet = WalletClass.startWithSecretKeys(secretKeys);
    console.log('Wallet started');

    // Start syncing
    console.log('Calling wallet.start()...');
    await wallet.start(secretKeys);
    console.log('Wallet start() called');

    console.log('Waiting for wallet to sync...');

    // Subscribe to state updates
    const subscription = wallet.state.subscribe({
      next: (state) => {
        console.log('Shielded state update:', {
          progress: state.progress,
          balances: state.balances,
          coinsCount: state.totalCoins.length,
        });
      },
      error: (err) => console.error('State error:', err),
    });

    // Wait with timeout (longer for preview network)
    const timeoutMs = config.networkId === 'preview' ? 120000 : 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Sync timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const state = await Promise.race([
        wallet.waitForSyncedState(),
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof wallet.waitForSyncedState>>;
      console.log('Shielded wallet synced');
      subscription.unsubscribe();

      console.log(`\nSHIELDED Balance for ${seedName}`);
      console.log('   Balances:', state.balances);
      console.log('   Coins:', state.totalCoins.length);

      return { balances: state.balances, coins: state.totalCoins.length };
    } catch (timeoutError) {
      subscription.unsubscribe();
      console.error('Sync timed out:', timeoutError);
      return null;
    }
  } catch (error) {
    console.error('Shielded wallet failed:', error);
    return null;
  }
}

async function main() {
  const { network, seedName } = parseArgs();

  // Get network config
  const config = NETWORKS[network as keyof typeof NETWORKS];
  if (!config) {
    console.error(`Unknown network: ${network}`);
    console.error('Available networks: local, preview');
    process.exit(1);
  }

  // Get seed
  let seed: string;
  if (SEEDS[seedName]) {
    seed = SEEDS[seedName];
  } else if (seedName.match(/^[0-9a-fA-F]{64}$/)) {
    seed = seedName;
  } else {
    console.error(`Unknown seed: ${seedName}`);
    console.error('Available seeds: alice, bob, phil, or provide 64-char hex');
    process.exit(1);
  }

  console.log('========================================');
  console.log('Midnight Wallet SDK Test');
  console.log('========================================');
  console.log('Network:', network);
  console.log('Seed:', seedName);
  console.log('Network ID:', config.networkId);
  console.log('');

  if (network === 'preview') {
    console.log('NOTE: For preview network, ensure:');
    console.log('  1. Proof server is running: docker-compose -f preview-proof-server.yml up -d');
    console.log('  2. Account has funds from faucet: https://faucet.preview.midnight.network');
    console.log('');
  }

  // Test unshielded first (genesis coins are typically unshielded)
  const unshieldedResult = await testUnshieldedBalance(config, seed, seedName);

  // Then test shielded
  const shieldedResult = await testShieldedBalance(config, seed, seedName);

  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  if (unshieldedResult) {
    console.log('Unshielded Address:', unshieldedResult.address);
    console.log('Unshielded Balances:', unshieldedResult.balances);
  }
  if (shieldedResult) {
    console.log('Shielded Balances:', shieldedResult.balances);
  }

  if (network === 'preview' && (!unshieldedResult?.coins && !shieldedResult?.coins)) {
    console.log('\nNo funds found. To get funds:');
    console.log('1. Copy the unshielded address above');
    console.log('2. Go to https://faucet.preview.midnight.network');
    console.log('3. Request funds for that address');
    console.log('4. Wait for transaction to confirm');
    console.log('5. Run this script again');
  }

  console.log('\nDone');
  process.exit(0);
}

main();
