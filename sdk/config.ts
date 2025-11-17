/**
 * Network configuration for Midnight Hyperlane
 */

import { NetworkConfig } from './types.js';

/**
 * Midnight Preview testnet configuration
 */
export const MIDNIGHT_PREVIEW: NetworkConfig = {
  rpcUrl: 'https://ogmios.testnet-02.midnight.network/',
  indexerUrl: 'https://indexer.testnet-02.midnight.network/graphql',
  provingServerUrl: 'https://proving-server.testnet-02.midnight.network/',
  faucetUrl: 'https://faucet.preview.midnight.network',
  domainId: 99999, // Placeholder - to be assigned by Hyperlane registry
};

/**
 * Local development configuration
 */
export const MIDNIGHT_LOCAL: NetworkConfig = {
  rpcUrl: 'http://localhost:1337',
  indexerUrl: 'http://localhost:8080/graphql',
  provingServerUrl: 'http://localhost:8081',
  domainId: 31337, // Local dev domain
};

/**
 * Network configurations by name
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  preview: MIDNIGHT_PREVIEW,
  local: MIDNIGHT_LOCAL,
};

/**
 * Get network configuration by name
 *
 * @param name - Network name (preview, local)
 * @returns Network configuration
 */
export function getNetworkConfig(name: string): NetworkConfig {
  const config = NETWORKS[name.toLowerCase()];
  if (!config) {
    throw new Error(`Unknown network: ${name}. Available: ${Object.keys(NETWORKS).join(', ')}`);
  }
  return config;
}

/**
 * Hyperlane domain IDs for known chains
 *
 * See: https://docs.hyperlane.xyz/docs/reference/domains
 */
export const HYPERLANE_DOMAINS = {
  // Mainnets
  ethereum: 1,
  polygon: 137,
  avalanche: 43114,
  arbitrum: 42161,
  optimism: 10,
  bsc: 56,
  celo: 42220,
  moonbeam: 1284,
  gnosis: 100,

  // Testnets
  sepolia: 11155111,
  mumbai: 80001,
  fuji: 43113,
  arbitrumGoerli: 421613,
  optimismGoerli: 420,
  bscTestnet: 97,
  alfajores: 44787,
  moonbaseAlpha: 1287,
  chiado: 10200,

  // Midnight (placeholder - to be assigned)
  midnight: 99999,
  midnightLocal: 31337,
} as const;

/**
 * Get domain name from ID
 *
 * @param domainId - Domain ID
 * @returns Domain name or undefined
 */
export function getDomainName(domainId: number): string | undefined {
  return Object.entries(HYPERLANE_DOMAINS).find(([_, id]) => id === domainId)?.[0];
}

/**
 * Configuration builder
 */
export class ConfigBuilder {
  private config: Partial<NetworkConfig> = {};

  withRpcUrl(url: string): this {
    this.config.rpcUrl = url;
    return this;
  }

  withIndexerUrl(url: string): this {
    this.config.indexerUrl = url;
    return this;
  }

  withProvingServerUrl(url: string): this {
    this.config.provingServerUrl = url;
    return this;
  }

  withFaucetUrl(url: string): this {
    this.config.faucetUrl = url;
    return this;
  }

  withDomainId(domainId: number): this {
    this.config.domainId = domainId;
    return this;
  }

  build(): NetworkConfig {
    if (!this.config.rpcUrl) {
      throw new Error('RPC URL is required');
    }
    if (!this.config.indexerUrl) {
      throw new Error('Indexer URL is required');
    }
    if (!this.config.provingServerUrl) {
      throw new Error('Proving server URL is required');
    }
    if (this.config.domainId === undefined) {
      throw new Error('Domain ID is required');
    }

    return this.config as NetworkConfig;
  }
}

/**
 * Environment variable configuration
 *
 * Load configuration from environment variables:
 * - MIDNIGHT_RPC_URL
 * - MIDNIGHT_INDEXER_URL
 * - MIDNIGHT_PROVING_SERVER_URL
 * - MIDNIGHT_FAUCET_URL
 * - MIDNIGHT_DOMAIN_ID
 */
export function loadConfigFromEnv(): NetworkConfig {
  const builder = new ConfigBuilder();

  const rpcUrl = process.env.MIDNIGHT_RPC_URL;
  const indexerUrl = process.env.MIDNIGHT_INDEXER_URL;
  const provingServerUrl = process.env.MIDNIGHT_PROVING_SERVER_URL;
  const faucetUrl = process.env.MIDNIGHT_FAUCET_URL;
  const domainId = process.env.MIDNIGHT_DOMAIN_ID;

  if (rpcUrl) builder.withRpcUrl(rpcUrl);
  if (indexerUrl) builder.withIndexerUrl(indexerUrl);
  if (provingServerUrl) builder.withProvingServerUrl(provingServerUrl);
  if (faucetUrl) builder.withFaucetUrl(faucetUrl);
  if (domainId) builder.withDomainId(parseInt(domainId, 10));

  try {
    return builder.build();
  } catch (error) {
    // Fall back to Preview network if env vars incomplete
    console.warn('Incomplete environment variables, using Preview network config');
    return MIDNIGHT_PREVIEW;
  }
}

/**
 * Example usage:
 *
 * ```typescript
 * import { getNetworkConfig, HYPERLANE_DOMAINS } from './config.js';
 *
 * // Get Preview testnet config
 * const config = getNetworkConfig('preview');
 * console.log('RPC:', config.rpcUrl);
 * console.log('Domain:', config.domainId);
 *
 * // Send message to Ethereum Sepolia
 * const destination = HYPERLANE_DOMAINS.sepolia;
 * ```
 */
