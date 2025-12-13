/**
 * Minimal test to verify new wallet SDK can connect to preview network.
 * Run with: node --no-warnings --loader ts-node/esm scripts/test-new-wallet.ts
 */

import { PolkadotNodeClient, makeConfig } from '@midnight-ntwrk/wallet-sdk-node-client';
import { HttpProverClient } from '@midnight-ntwrk/wallet-sdk-prover-client';

const config = {
  indexer: 'http://127.0.0.1:8088/api/v1/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v1/graphql/ws',
  proofServer: 'http://localhost:6300',
  node: 'ws://127.0.0.1:9944',
};

async function testConnection() {
  console.log('Testing connection to preview network with new wallet SDK...');
  console.log('Config:', config);

  try {
    // Test prover client creation
    const prover = new HttpProverClient({ url: config.proofServer });
    console.log('✓ Prover client created');

    // Test node client connection
    console.log('Connecting to node...');
    const nodeConfig = makeConfig({ nodeURL: new URL(config.node) });
    const node = await PolkadotNodeClient.init(nodeConfig);
    console.log('✓ Node client connected');

    await node.close();
    console.log('✓ Node client closed');

    console.log('\n✓ New wallet SDK packages work! Connection successful.');
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

testConnection();
