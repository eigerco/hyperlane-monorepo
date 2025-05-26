import { UnsignedTransaction } from '@sovereign-sdk/web3';

import { Address, Domain, Numberish } from '@hyperlane-xyz/utils';

import { BaseSovereignAdapter } from '../../app/MultiProtocolApp.js';
import { ITokenAdapter } from '../../index.js';
import { MultiProtocolProvider } from '../../providers/MultiProtocolProvider.js';
import { ChainName } from '../../types.js';
import { TokenMetadata } from '../types.js';

import {
  IHypTokenAdapter,
  InterchainGasQuote,
  TransferParams,
  TransferRemoteParams,
} from './ITokenAdapter.js';

export interface BaseHyperlaneRuntimeCall {
  bank?: BankCallMessage;
}

export interface BankCallMessage {
  create_token?: CreateToken;
  transfer?: Transfer;
  burn?: Burn;
  mint?: Mint;
  freeze?: Freeze;
}

export interface Burn {
  /**
   * The amount of tokens to burn.
   */
  coins: Coins;
  [property: string]: any;
}

/**
 * The amount of tokens to transfer.
 *
 * Structure that stores information specifying a given `amount` (type [`Amount`]) of coins
 * stored at a `token_id` (type [`crate::TokenId`]).
 *
 * The amount of tokens to burn.
 *
 * The amount of tokens to mint.
 */
export interface Coins {
  /**
   * The number of tokens
   */
  amount: number;
  /**
   * The ID of the token
   */
  token_id: string;
  [property: string]: any;
}

export interface CreateToken {
  /**
   * Admins list.
   */
  admins: string[];
  /**
   * The initial balance of the new token.
   */
  initial_balance: number;
  /**
   * The address of the account that the new tokens are minted to.
   */
  mint_to_address: string;
  /**
   * The supply cap of the new token, if any.
   */
  supply_cap?: number | null;
  /**
   * The number of decimal places this token's amounts will have.
   */
  token_decimals?: number | null;
  /**
   * The name of the new token.
   */
  token_name: string;
  [property: string]: any;
}

export interface Freeze {
  /**
   * Address of the token to be frozen
   */
  token_id: string;
  [property: string]: any;
}

export interface Mint {
  /**
   * The amount of tokens to mint.
   */
  coins: Coins;
  /**
   * Address to mint tokens to
   */
  mint_to_address: string;
  [property: string]: any;
}

export interface Transfer {
  /**
   * The amount of tokens to transfer.
   */
  coins: Coins;
  /**
   * The address to which the tokens will be transferred.
   */
  to: string;
  [property: string]: any;
}

export class SovereignTokenAdapter
  extends BaseSovereignAdapter
  implements ITokenAdapter<UnsignedTransaction<BaseHyperlaneRuntimeCall>>
{
  public readonly tokenId: string;

  constructor(
    public readonly chainName: ChainName,
    public readonly multiProvider: MultiProtocolProvider,
    public readonly addresses: { token: Address },
  ) {
    super(chainName, multiProvider, addresses);
    this.tokenId = addresses.token;
  }

  async getBalance(address: Address): Promise<bigint> {
    const provider = await this.getProvider();
    const tokenId = this.tokenId;
    const url = `/modules/bank/tokens/${tokenId}/balances/${address}`;
    console.log('Fetching balance from url', url); // Existing console.log

    try {
      const response: Record<string, unknown> = await provider.http.get(url);

      const responseData = response['data'] as Record<string, unknown> | undefined;
      if (responseData && typeof responseData['amount'] === 'string') {
        const amountStr = responseData['amount'] as string;
        return BigInt(amountStr);
      } else {
        // This case handles when a successful HTTP response (2xx) does not conform to the expected structure
        // (e.g., missing 'data' field or 'data.amount' is not a string).
        console.error(
          'Unexpected response structure after successful HTTP request, or amount is missing/not a string:',
          response,
        );
        throw new Error(
          'Failed to parse balance from server response due to unexpected data structure in successful response.',
        );
      }
    } catch (error: any) {
      let errorData;
      // Attempt to parse the JSON from the error message
      // The message format is "NotFoundError: 404 {JSON_STRING}"
      // or "Error: 404 {JSON_STRING}"
      // We need to extract the JSON part.
      if (error && typeof error.message === 'string') {
        const match = error.message.match(/^[^{]*({.*})$/);
        if (match && match[1]) {
          try {
            errorData = JSON.parse(match[1]);
          } catch (parseError) {
            console.error('Failed to parse error message JSON:', parseError);
            // If parsing fails, we can't inspect it further, so re-throw original error.
            throw error;
          }
        }
      }

      // Check if the error is the specific HTTP 404 error indicating "Balance not found".
      // The primary status check can be error.status (if available) or from parsed errorData.
      const httpStatus = error?.status || errorData?.status; // error.status from NotFoundError, errorData.status from the JSON body

      if (
        httpStatus === 404 &&
        errorData && // Parsed JSON must exist
        Array.isArray(errorData.errors) && // Body has an 'errors' array
        errorData.errors.length > 0 // The 'errors' array is not empty
      ) {
        const firstApiError = errorData.errors[0]; // Get the first error object from the API's list
        if (
          firstApiError &&
          firstApiError.status === 404 && // The API error object itself also indicates a 404 status
          typeof firstApiError.title === 'string' &&
          firstApiError.title.startsWith("Balance '") && // Title matches "Balance '...' not found"
          firstApiError.title.endsWith("' not found")
        ) {
          // This is the specific "Balance not found" 404 error. Return 0 as requested.
          return BigInt(0);
        }
      }
      
      // console.log('Error fetching balance', error); // Kept for debugging if needed
      // console.log('Parsed errorData', errorData); // Kept for debugging if needed
      
      // If the error is not the specific "Balance not found" 404, or if its structure doesn't match,
      // re-throw the error to be handled by higher-level error handlers or to fail the operation.
      throw error;
    }
  }
  async getTotalSupply(): Promise<bigint | undefined> {
    // TODO: Return supply if applicable
    return undefined;
  }
  async getMetadata(isNft?: boolean): Promise<TokenMetadata> {
    // TODO: Return actual metadata
    return { decimals: 9, symbol: 'SPL', name: 'SPL Token' };
  }

  async isRevokeApprovalRequired(): Promise<boolean> {
    return false;
  }

  async getMinimumTransferAmount(recipient: Address): Promise<bigint> {
    return 0n;
  }
  async isApproveRequired(
    owner: Address,
    spender: Address,
    weiAmountOrId: Numberish,
  ): Promise<boolean> {
    return false;
  }
  async populateApproveTx(
    params: TransferParams,
  ): Promise<UnsignedTransaction<BaseHyperlaneRuntimeCall>> {
    throw new Error('Approve not required for sovereign tokens');
  }
  async populateTransferTx(
    params: TransferParams,
  ): Promise<UnsignedTransaction<BaseHyperlaneRuntimeCall>> {
    const { recipient, weiAmountOrId } = params;
    const tokenId = this.tokenId;
    const generation = Date.now();
    return {
      runtime_call: {
        bank: {
          transfer: {
            coins: {
              amount: Number(weiAmountOrId),
              token_id: tokenId,
            },
            to: recipient,
          },
        },
      },
      generation: generation,
      details: (await this.getProvider()).context.defaultTxDetails,
    };
  }
}

export class SovereignHypTokenAdapter
  extends SovereignTokenAdapter
  implements IHypTokenAdapter<UnsignedTransaction<BaseHyperlaneRuntimeCall>>
{
  public readonly routeId: Address;

  constructor(
    public readonly chainName: ChainName,
    public readonly multiProvider: MultiProtocolProvider,
    public readonly addresses: { token: Address; routeId: Address },
  ) {
    super(chainName, multiProvider, addresses);
    this.routeId = addresses.routeId;
  }

  async getDomains(): Promise<Domain[]> {
    let routers = await this.getAllRouters();
    return routers.map((r) => r.domain);
  }
  async getRouterAddress(domain: Domain): Promise<Buffer> {
    let routers = await this.getAllRouters();
    let router = routers.find((r) => r.domain === domain);
    if (!router) {
      throw new Error(`No router found for domain ${domain}`);
    }
    return router.address;
  }
  async getAllRouters(): Promise<Array<{ domain: Domain; address: Buffer }>> {
    let response = await (
      await this.getProvider()
    ).http.get(`/modules/warp/route/${this.routeId}/routers`);
    let routers = response as Record<string, unknown>['data'] as Array<{
      domain: Domain;
      address: Buffer;
    }>;
    return routers;
  }
  // Meant to be overridden by subclasses. TODO: Replace all usages of this class with subclasses
  async getBridgedSupply(): Promise<bigint | undefined> {
    // For synthetic tokens, this is just the total supply.
    // For collateral (and native), this is the amount of collateral in the module.
    return undefined;
  }
  // Sender is only required for Sealevel origins.
  async quoteTransferRemoteGas(
    destination: Domain,
    sender?: Address,
  ): Promise<InterchainGasQuote> {
    // TODO: Fetch the quote from the IGP module
    return {
      amount: 0n,
    };
  }
  async populateTransferRemoteTx(
    p: TransferRemoteParams,
  ): Promise<UnsignedTransaction<BaseHyperlaneRuntimeCall>> {
    // TODO: Add this to the interface
    throw new Error('Not implemented');
  }
}
