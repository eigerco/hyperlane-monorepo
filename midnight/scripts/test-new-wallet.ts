/**
 * Test new wallet SDK balance functionality.
 * Run with: yarn new-wallet
 */

import * as ledger from '@midnight-ntwrk/ledger-v6';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { UnshieldedWallet, createKeystore, PublicKey, InMemoryTransactionHistoryStorage } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { NetworkId } from '@midnight-ntwrk/wallet-sdk-abstractions';

const NETWORK_ID: NetworkId.NetworkId = 'undeployed';

const config = {
  indexer: 'http://127.0.0.1:8088/api/v3/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v3/graphql/ws',
  proofServer: 'http://localhost:6300',
  node: 'ws://127.0.0.1:9944',
  networkId: NETWORK_ID,
};

// Phil's seed (genesis account)
const PHIL_SEED = "0000000000000000000000000000000000000000000000000000000000000001";

async function testUnshieldedBalance() {
  console.log('\n=== Testing UNSHIELDED wallet ===');
  console.log('Config:', config);

  try {
    // Create keystore from seed
    console.log('Creating keystore...');
    const seedBytes = Uint8Array.from(Buffer.from(PHIL_SEED, 'hex'));
    const keystore = createKeystore(seedBytes, config.networkId);
    const publicKey = PublicKey.fromKeyStore(keystore);
    console.log('✓ Keystore created');
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
    console.log('✓ Wallet started');

    // Start syncing
    console.log('Calling wallet.start()...');
    await wallet.start();
    console.log('✓ Wallet start() called');

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

    // Wait with timeout
    const timeoutMs = 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Sync timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const state = await Promise.race([
        wallet.waitForSyncedState(),
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof wallet.waitForSyncedState>>;
      console.log('✓ Unshielded wallet synced');
      subscription.unsubscribe();

      console.log(`\n💳 UNSHIELDED Balance for phil`);
      console.log('   Balances:', state.balances);
      console.log('   Coins:', state.totalCoins.length);
    } catch (timeoutError) {
      subscription.unsubscribe();
      console.error('Sync timed out:', timeoutError);
    }
  } catch (error) {
    console.error('Unshielded wallet failed:', error);
  }
}

async function testShieldedBalance() {
  console.log('\n=== Testing SHIELDED wallet ===');

  try {
    // Derive secret keys from seed
    console.log('Deriving secret keys...');
    const seedBytes = Uint8Array.from(Buffer.from(PHIL_SEED, 'hex'));
    const secretKeys = ledger.ZswapSecretKeys.fromSeed(seedBytes);
    console.log('✓ Secret keys derived');
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
    console.log('✓ Wallet started');

    // Start syncing
    console.log('Calling wallet.start()...');
    await wallet.start(secretKeys);
    console.log('✓ Wallet start() called');

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

    // Wait with timeout
    const timeoutMs = 30000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Sync timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    try {
      const state = await Promise.race([
        wallet.waitForSyncedState(),
        timeoutPromise,
      ]) as Awaited<ReturnType<typeof wallet.waitForSyncedState>>;
      console.log('✓ Shielded wallet synced');
      subscription.unsubscribe();

      console.log(`\n💳 SHIELDED Balance for phil`);
      console.log('   Balances:', state.balances);
      console.log('   Coins:', state.totalCoins.length);
    } catch (timeoutError) {
      subscription.unsubscribe();
      console.error('Sync timed out:', timeoutError);
    }
  } catch (error) {
    console.error('Shielded wallet failed:', error);
  }
}

async function main() {
  // Test unshielded first (genesis coins are likely unshielded)
  await testUnshieldedBalance();

  // Then test shielded
  await testShieldedBalance();

  console.log('\n✓ Done');
  process.exit(0);
}

main();
