/**
 * Test new wallet SDK balance functionality.
 * Run with: yarn new-wallet
 */

import * as ledger from '@midnight-ntwrk/ledger-v6';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
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

function deriveSecretKeys(seed: string): ledger.ZswapSecretKeys {
  // Use raw seed directly (same as old wallet did for phil)
  const seedBytes = Uint8Array.from(Buffer.from(seed, 'hex'));
  return ledger.ZswapSecretKeys.fromSeed(seedBytes);
}

async function testBalance() {
  console.log('Testing balance with new wallet SDK...');
  console.log('Config:', config);

  try {
    // Derive secret keys from seed
    console.log('Deriving secret keys...');
    const secretKeys = deriveSecretKeys(PHIL_SEED);
    console.log('✓ Secret keys derived');

    // Create shielded wallet with configuration
    console.log('Creating wallet configuration...');
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
    console.log('✓ Wallet class created');

    console.log('Starting wallet with secret keys...');
    console.log('Encryption public key:', secretKeys.encryptionPublicKey.toString());
    const wallet = WalletClass.startWithSecretKeys(secretKeys);
    console.log('✓ Wallet started');

    // Start the wallet (this initiates syncing)
    console.log('Calling wallet.start()...');
    await wallet.start(secretKeys);
    console.log('✓ Wallet start() called');

    console.log('Waiting for wallet to sync (subscribing to state updates)...');

    // Subscribe to state updates to see progress
    const subscription = wallet.state.subscribe({
      next: (state) => {
        console.log('State update:', {
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
      console.log('✓ Wallet synced');
      subscription.unsubscribe();

      // Get balances - the balances object has RawTokenType keys
      console.log(`\n💳 Balance for phil`);
      console.log('   Balances:', state.balances);
      console.log('\n✓ Done');
    } catch (timeoutError) {
      subscription.unsubscribe();
      console.error('Sync timed out:', timeoutError);
    }
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

testBalance();
