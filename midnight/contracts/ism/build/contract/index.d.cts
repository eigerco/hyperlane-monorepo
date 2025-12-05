import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type ISMMetadata = { commitment: Uint8Array;
                            relayerPubKey: Uint8Array;
                            relayerSignature: Uint8Array
                          };

export type Witnesses<T> = {
  verifyBIP340Signature(context: __compactRuntime.WitnessContext<Ledger, T>,
                        pubKey_0: Uint8Array,
                        message_0: Uint8Array,
                        signature_0: Uint8Array): [T, bigint];
}

export type ImpureCircuits<T> = {
  verify(context: __compactRuntime.CircuitContext<T>,
         messageId_0: Uint8Array,
         metadata_0: ISMMetadata): __compactRuntime.CircuitResults<T, []>;
  isVerified(context: __compactRuntime.CircuitContext<T>,
             messageId_0: Uint8Array): __compactRuntime.CircuitResults<T, bigint>;
  addRelayer(context: __compactRuntime.CircuitContext<T>,
             relayerPubKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  removeRelayer(context: __compactRuntime.CircuitContext<T>,
                relayerPubKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  verify(context: __compactRuntime.CircuitContext<T>,
         messageId_0: Uint8Array,
         metadata_0: ISMMetadata): __compactRuntime.CircuitResults<T, []>;
  isVerified(context: __compactRuntime.CircuitContext<T>,
             messageId_0: Uint8Array): __compactRuntime.CircuitResults<T, bigint>;
  addRelayer(context: __compactRuntime.CircuitContext<T>,
             relayerPubKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  removeRelayer(context: __compactRuntime.CircuitContext<T>,
                relayerPubKey_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
