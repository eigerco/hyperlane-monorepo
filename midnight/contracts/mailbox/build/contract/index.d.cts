import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Message = { version: bigint;
                        nonce: bigint;
                        origin: bigint;
                        sender: Uint8Array;
                        destination: bigint;
                        recipient: Uint8Array;
                        bodyLength: bigint;
                        body: Uint8Array
                      };

export type Witnesses<T> = {
  getMessageId(context: __compactRuntime.WitnessContext<Ledger, T>,
               message_0: Message): [T, Uint8Array];
  checkDelivered(context: __compactRuntime.WitnessContext<Ledger, T>,
                 messageId_0: Uint8Array): [T, bigint];
  validateWithISM(context: __compactRuntime.WitnessContext<Ledger, T>,
                  message_0: Message,
                  metadata_0: Uint8Array): [T, []];
  getZeroBytes(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
  getSender(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
  getLatestMessageId(context: __compactRuntime.WitnessContext<Ledger, T>): [T, Uint8Array];
  getCurrentNonce(context: __compactRuntime.WitnessContext<Ledger, T>): [T, bigint];
}

export type ImpureCircuits<T> = {
  initialize(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  dispatch(context: __compactRuntime.CircuitContext<T>,
           localDomainId_0: bigint,
           destination_0: bigint,
           recipient_0: Uint8Array,
           bodyLength_0: bigint,
           body_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  deliver(context: __compactRuntime.CircuitContext<T>,
          localDomainId_0: bigint,
          message_0: Message,
          metadata_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  delivered(context: __compactRuntime.CircuitContext<T>, messageId_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  latestDispatchedId(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, Uint8Array>;
}

export type PureCircuits = {
}

export type Circuits<T> = {
  initialize(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, []>;
  dispatch(context: __compactRuntime.CircuitContext<T>,
           localDomainId_0: bigint,
           destination_0: bigint,
           recipient_0: Uint8Array,
           bodyLength_0: bigint,
           body_0: Uint8Array): __compactRuntime.CircuitResults<T, Uint8Array>;
  deliver(context: __compactRuntime.CircuitContext<T>,
          localDomainId_0: bigint,
          message_0: Message,
          metadata_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  delivered(context: __compactRuntime.CircuitContext<T>, messageId_0: Uint8Array): __compactRuntime.CircuitResults<T, []>;
  latestDispatchedId(context: __compactRuntime.CircuitContext<T>): __compactRuntime.CircuitResults<T, Uint8Array>;
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
