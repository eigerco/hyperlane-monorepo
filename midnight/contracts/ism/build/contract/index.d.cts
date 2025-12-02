import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type ISMMetadata = { merkleRoot: Uint8Array;
                            signatures: Uint8Array;
                            signatureCount: bigint
                          };

export type Checkpoint = { origin: bigint;
                           originMailbox: Uint8Array;
                           merkleRoot: Uint8Array;
                           nonce: bigint;
                           messageId: Uint8Array
                         };

export type Witnesses<T> = {
  computeCheckpointDigest(context: __compactRuntime.WitnessContext<Ledger, T>,
                          checkpoint_0: Checkpoint): [T, Uint8Array];
  countValidSignatures(context: __compactRuntime.WitnessContext<Ledger, T>,
                       digest_0: Uint8Array,
                       signatures_0: Uint8Array,
                       signatureCount_0: bigint): [T, bigint];
}

export type ImpureCircuits<T> = {
  verify(context: __compactRuntime.CircuitContext<T>,
         origin_0: bigint,
         originMailbox_0: Uint8Array,
         nonce_0: bigint,
         messageId_0: Uint8Array,
         metadata_0: ISMMetadata): __compactRuntime.CircuitResults<T, []>;
  getThreshold(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, bigint>;
  getValidatorCount(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, bigint>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  verify(context: __compactRuntime.CircuitContext<T>,
         origin_0: bigint,
         originMailbox_0: Uint8Array,
         nonce_0: bigint,
         messageId_0: Uint8Array,
         metadata_0: ISMMetadata): __compactRuntime.CircuitResults<T, []>;
  getThreshold(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, bigint>;
  getValidatorCount(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, bigint>;
}

export type Ledger = {
  validators: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<T, W extends Witnesses<T> = Witnesses<T>> {
  witnesses: W;
  circuits: Circuits<T>;
  impureCircuits: ImpureCircuits<T>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<T>,
               _threshold_0: bigint,
               _validatorCount_0: bigint,
               v0_0: Uint8Array,
               v1_0: Uint8Array,
               v2_0: Uint8Array,
               v3_0: Uint8Array,
               v4_0: Uint8Array,
               v5_0: Uint8Array,
               v6_0: Uint8Array,
               v7_0: Uint8Array): __compactRuntime.ConstructorResult<T>;
}

export declare function ledger(state: __compactRuntime.StateValue): Ledger;
export declare const pureCircuits: PureCircuits;
