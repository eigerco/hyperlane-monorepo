/**
 * ISM (Interchain Security Module) utilities for Midnight - POC Version
 *
 * Simplified for 2 validators with secp256k1 ECDSA signature verification.
 */

import { secp256k1 } from '@noble/curves/secp256k1.js';

import {
  deployContract,
  type DeployedContract,
  findDeployedContract,
  type FoundContract
} from "@midnight-ntwrk/midnight-js-contracts";
import { ImpureCircuitId, MidnightProviders } from "@midnight-ntwrk/midnight-js-types";

import { Contract, type ISMMetadata, type Witnesses } from "../../contracts/ism/build/contract/index.cjs";
import { logger } from "./index.js";

// =============================================================================
// Types
// =============================================================================

export type ISMCircuits = ImpureCircuitId<Contract<{}>>;
export type ISMProviders = MidnightProviders<
  ISMCircuits,
  typeof ISMPrivateStateId,
  {}
>;
export type ISMContract = Contract<{}>;
export type DeployedISMContract =
  | DeployedContract<ISMContract>
  | FoundContract<ISMContract>;

export const ISMPrivateStateId = "ismPrivateState";

// Re-export ISMMetadata for convenience
export type { ISMMetadata };

// =============================================================================
// Helpers
// =============================================================================

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// Witnesses
// =============================================================================

/**
 * Create witnesses for ISM contract
 *
 * The witness verifies two secp256k1 ECDSA signatures over messageId.
 */
function createWitnesses(): Witnesses<{}> {
  return {
    /**
     * Verify two validator signatures over messageId
     *
     * @param context - Witness context
     * @param messageId - The message ID that was signed (32 bytes)
     * @param validator1PubKey - First validator's compressed public key (33 bytes)
     * @param validator1Sig - First validator's signature (64 bytes, r || s)
     * @param validator2PubKey - Second validator's compressed public key (33 bytes)
     * @param validator2Sig - Second validator's signature (64 bytes, r || s)
     * @returns [privateState, 1n if both valid, 0n otherwise]
     */
    verifyValidatorSignatures(
      context,
      messageId,
      validator1PubKey,
      validator1Sig,
      validator2PubKey,
      validator2Sig
    ) {
      logger.debug({
        messageId: toHex(messageId),
        validator1PubKey: toHex(validator1PubKey).slice(0, 16) + '...',
        validator2PubKey: toHex(validator2PubKey).slice(0, 16) + '...',
      }, '[witness] verifyValidatorSignatures');

      try {
        // Verify first signature
        const sig1Valid = secp256k1.verify(
          validator1Sig,
          messageId,
          validator1PubKey
        );
        logger.debug({ validator: 1, valid: sig1Valid }, '[witness] signature check');

        if (!sig1Valid) {
          logger.warn('Validator 1 signature invalid');
          return [context.privateState, 0n];
        }

        // Verify second signature
        const sig2Valid = secp256k1.verify(
          validator2Sig,
          messageId,
          validator2PubKey
        );
        logger.debug({ validator: 2, valid: sig2Valid }, '[witness] signature check');

        if (!sig2Valid) {
          logger.warn('Validator 2 signature invalid');
          return [context.privateState, 0n];
        }

        logger.info('Both validator signatures verified successfully');
        return [context.privateState, 1n];

      } catch (error) {
        logger.error({ error }, '[witness] signature verification error');
        return [context.privateState, 0n];
      }
    },
  };
}

// =============================================================================
// ISM Contract Class
// =============================================================================

/**
 * ISM - Interchain Security Module wrapper (POC version)
 *
 * Provides high-level interface to the ISM contract for:
 * - Deploying new ISM instances
 * - Verifying messages with validator signatures
 * - Querying verification status
 */
export class ISM {
  provider: ISMProviders;
  contractInstance: ISMContract;
  deployedContract?: DeployedISMContract;

  constructor(provider: ISMProviders) {
    this.provider = provider;
    this.contractInstance = new Contract(createWitnesses());
  }

  /**
   * Deploy a new ISM contract
   */
  async deploy(): Promise<DeployedContract<ISMContract>> {
    logger.info('Deploying ISM contract...');

    const deployedContract = await deployContract(this.provider, {
      contract: this.contractInstance,
      privateStateId: ISMPrivateStateId,
      initialPrivateState: {},
    });

    this.deployedContract = deployedContract;
    logger.info({ address: deployedContract.deployTxData.public.contractAddress }, 'ISM deployed');
    return deployedContract;
  }

  /**
   * Connect to an existing deployed ISM contract
   */
  async findDeployedContract(contractAddress: string) {
    this.deployedContract = await findDeployedContract(this.provider, {
      contractAddress,
      contract: this.contractInstance,
      privateStateId: ISMPrivateStateId,
      initialPrivateState: {},
    });
    logger.info({ contractAddress }, 'Connected to ISM');
  }

  /**
   * Verify a message using validator signatures
   *
   * @param messageId - Message ID (32 bytes, keccak256 hash from origin chain)
   * @param metadata - Contains two validator signatures
   */
  async verify(messageId: Uint8Array, metadata: ISMMetadata) {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }

    logger.info({
      messageId: toHex(messageId),
      validator1: toHex(metadata.validator1PubKey).slice(0, 16) + '...',
      validator2: toHex(metadata.validator2PubKey).slice(0, 16) + '...',
    }, 'Verifying message with ISM');

    const txData = await this.deployedContract.callTx.verify(messageId, metadata);

    logger.info('Message verified successfully');
    return txData.public;
  }

  /**
   * Check if a message has been verified
   *
   * @param messageId - Message ID to check
   * @returns true if verified
   */
  async isVerified(messageId: Uint8Array): Promise<boolean> {
    if (!this.deployedContract) {
      throw new Error("Contract not deployed");
    }

    try {
      await this.deployedContract.callTx.isVerified(messageId);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Helper to create ISMMetadata from validator signatures
 *
 * Use this to construct metadata from CardanoData or similar structures.
 */
export function createISMMetadata(
  validator1PubKey: Uint8Array,
  validator1Sig: Uint8Array,
  validator2PubKey: Uint8Array,
  validator2Sig: Uint8Array
): ISMMetadata {
  return {
    validator1PubKey,
    validator1Sig,
    validator2PubKey,
    validator2Sig,
  };
}

// Export toHex for convenience
export { toHex };
