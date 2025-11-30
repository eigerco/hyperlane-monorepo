import { webcrypto } from "crypto";

import {
  type CallResultPublic,
  deployContract,
  type DeployedContract,
  findDeployedContract,
  type FoundContract
} from "@midnight-ntwrk/midnight-js-contracts";
import { type FinalizedTxData, ImpureCircuitId, MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { assertIsContractAddress } from "@midnight-ntwrk/midnight-js-utils";

import { Contract, ledger } from "../../contracts/token/build/contract/index.cjs";

export type TokenCircuits = ImpureCircuitId<Contract<{}>>;
export type TokenProviders = MidnightProviders<
  TokenCircuits,
  typeof TokenPrivateStateId,
  {}
>;
export type TokenContract = Contract<{}>;
export type DeployedTokenContract =
  | DeployedContract<TokenContract>
  | FoundContract<TokenContract>;

const witnesses = {};
export const TokenPrivateStateId = "tokenPrivateState";

export class Token {
  provider: TokenProviders;
  tokenContractInstance: TokenContract = new Contract(witnesses);
  deployedContract?: DeployedTokenContract;

  constructor(provider: TokenProviders) {
    this.provider = provider;
  }

  async deploy(): Promise<DeployedContract<TokenContract>> {
    const nonce = new Uint8Array(32);
    webcrypto.getRandomValues(nonce);

    const deployedContract = await deployContract(this.provider, {
      contract: this.tokenContractInstance,
      privateStateId: "tokenPrivateState",
      initialPrivateState: {},
      args: [nonce],
    });
    this.deployedContract = deployedContract;

    return deployedContract;
  }

  async findDeployedContract(contractAddress: string) {
    this.deployedContract = await findDeployedContract(this.provider, {
      contractAddress,
      contract: this.tokenContractInstance,
      privateStateId: "tokenPrivateState",
      initialPrivateState: {},
    });
  }

  async mintTo(
    recipientAddress: Uint8Array,
  ): Promise<CallResultPublic & FinalizedTxData> {
    if (!this.deployedContract) {
      throw new Error("contract not deployed");
    }

    const txData = await this.deployedContract.callTx.mint_to({
      bytes: recipientAddress,
    });
    return txData.public;
  }
}
