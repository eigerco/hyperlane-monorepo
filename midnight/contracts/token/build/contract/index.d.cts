import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<T> = {
}

export type ImpureCircuits<T> = {
  mint_to(context: __compactRuntime.CircuitContext<T>,
          addr_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  mint_to(context: __compactRuntime.CircuitContext<T>,
          addr_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
  readonly counter: bigint;
  readonly nonce: Uint8Array;
  readonly tvl: bigint;
  readonly coin_name: Uint8Array;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>,
               initNonce_0: Uint8Array): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
