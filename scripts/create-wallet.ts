/**
 * Create Midnight Wallet for Hyperlane Development
 *
 * Generates a new Midnight wallet with a secure random seed.
 * Use this wallet to deploy Hyperlane contracts and manage cross-chain messaging.
 *
 * Usage:
 *   yarn create-wallet [name]
 *
 * Example:
 *   yarn create-wallet deployer
 *   yarn create-wallet relayer
 *   yarn create-wallet validator-1
 */

import { randomBytes } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { SecretKeys } from '@midnight-ntwrk/zswap';

interface WalletAccount {
  name: string;
  seed: string;
  address: string;
  coinPublicKey: string;
  encryptionPublicKey: string;
  createdAt: string;
  purpose?: string;
}

/**
 * Generate a cryptographically secure random seed
 * @returns 32-byte hex string (required by SecretKeys.fromSeed)
 */
function generateSecureSeed(): string {
  const seedBytes = randomBytes(32);
  return seedBytes.toString('hex');
}

/**
 * Derive Midnight keys and address from seed
 * @param seedHex - 32-byte hex-encoded seed
 * @returns Derived keys and address
 */
function deriveKeysFromSeed(seedHex: string): {
  coinPublicKey: string;
  encryptionPublicKey: string;
  address: string;
} {
  // Convert hex seed to Uint8Array
  const seedBytes = new Uint8Array(
    seedHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Derive keys using Zswap
  const keys = SecretKeys.fromSeed(seedBytes);

  // Legacy address format: coinPublicKey|encryptionPublicKey
  const address = `${keys.coinPublicKey}|${keys.encryptionPublicKey}`;

  return {
    coinPublicKey: keys.coinPublicKey,
    encryptionPublicKey: keys.encryptionPublicKey,
    address,
  };
}

/**
 * Save wallet credentials securely
 */
function saveWalletCredentials(account: WalletAccount): string {
  const walletsDir = join(process.cwd(), 'wallets');

  // Create wallets directory if it doesn't exist
  if (!existsSync(walletsDir)) {
    mkdirSync(walletsDir, { recursive: true });
  }

  const filename = join(walletsDir, `${account.name}.json`);

  if (existsSync(filename)) {
    throw new Error(`Wallet "${account.name}" already exists! Use a different name or delete the existing wallet file.`);
  }

  writeFileSync(filename, JSON.stringify(account, null, 2));

  return filename;
}

/**
 * Display wallet information and next steps
 */
function displayWalletInfo(account: WalletAccount, filepath: string): void {
  console.log('\n' + '='.repeat(80));
  console.log('✓ Midnight Wallet Created Successfully');
  console.log('='.repeat(80));
  console.log(`\nWallet Name: ${account.name}`);
  console.log(`Created: ${account.createdAt}`);
  console.log(`Saved to: ${filepath}`);

  console.log('\n' + '-'.repeat(80));
  console.log('Wallet Address (Legacy Format)');
  console.log('-'.repeat(80));
  console.log(`${account.address}`);

  console.log('\n' + '-'.repeat(80));
  console.log('Public Keys');
  console.log('-'.repeat(80));
  console.log(`Coin Public Key:       ${account.coinPublicKey}`);
  console.log(`Encryption Public Key: ${account.encryptionPublicKey}`);

  console.log('\n' + '-'.repeat(80));
  console.log('IMPORTANT: Keep your seed secure!');
  console.log('-'.repeat(80));
  console.log(`Seed: ${account.seed}`);

  console.log('\n' + '-'.repeat(80));
  console.log('Next Steps');
  console.log('-'.repeat(80));

  console.log('\n1. Get test NIGHT tokens:');
  console.log('   Visit: https://faucet.preview.midnight.network');
  console.log('   Paste your address (shown above)');
  console.log('   Wait 2-5 minutes for tokens to arrive');

  console.log('\n2. Register for DUST generation:');
  console.log('   Connect your Cardano wallet (CIP-30)');
  console.log('   Map: CardanoAddress → MidnightDUSTAddress');
  console.log('   This enables transaction fee generation');

  console.log('\n3. Wait for DUST generation:');
  console.log('   1 NIGHT → up to 5 DUST');
  console.log('   Generation rate: ~1 week to reach cap');
  console.log('   You can start transacting once you have DUST');

  console.log('\n' + '='.repeat(80));
  console.log('Network Configuration');
  console.log('='.repeat(80));
  console.log('RPC URL:      https://ogmios.testnet-02.midnight.network/');
  console.log('Indexer URL:  https://indexer.testnet-02.midnight.network/graphql');
  console.log('Proving:      https://proving-server.testnet-02.midnight.network/');
  console.log('Faucet:       https://faucet.preview.midnight.network');
  console.log('Domain ID:    99999 (Midnight Preview)');

  console.log('\n' + '='.repeat(80));
  console.log('Recommended Funding Levels');
  console.log('='.repeat(80));
  console.log('Deployer:     ~10 NIGHT  (Contract deployment)');
  console.log('Relayer:      ~50 NIGHT  (Message delivery operations)');
  console.log('Validator:    ~5 NIGHT   (Message signature generation)');

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Get account purpose based on name
 */
function getAccountPurpose(name: string): string {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('deploy')) {
    return 'Deploy Hyperlane Mailbox contract';
  } else if (lowerName.includes('relay')) {
    return 'Deliver cross-chain messages';
  } else if (lowerName.includes('validator')) {
    return 'Sign messages for ISM validation';
  } else {
    return 'General purpose account';
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const accountName = args[0] || 'default';

  console.log('\nCreating Midnight wallet...\n');

  // Generate secure seed
  const seed = generateSecureSeed();

  // Derive keys and address from seed
  const { coinPublicKey, encryptionPublicKey, address } = deriveKeysFromSeed(seed);

  // Create wallet account
  const account: WalletAccount = {
    name: accountName,
    seed,
    address,
    coinPublicKey,
    encryptionPublicKey,
    createdAt: new Date().toISOString(),
    purpose: getAccountPurpose(accountName),
  };

  // Save credentials
  const filepath = saveWalletCredentials(account);

  // Display information
  displayWalletInfo(account, filepath);
}

// Run
main().catch((error) => {
  console.error('\n❌ Error creating wallet:', error.message);
  process.exit(1);
});
