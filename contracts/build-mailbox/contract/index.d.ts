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

export type Witnesses<PS> = {
  getMessageId(context: __compactRuntime.WitnessContext<Ledger, PS>,
               message_0: Message): [PS, Uint8Array];
  checkDelivered(context: __compactRuntime.WitnessContext<Ledger, PS>,
                 messageId_0: Uint8Array): [PS, bigint];
  validateWithISM(context: __compactRuntime.WitnessContext<Ledger, PS>,
                  message_0: Message,
                  metadata_0: Uint8Array): [PS, []];
  getZeroBytes(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getSender(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getLatestMessageId(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getCurrentNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
}

export type ImpureCircuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  dispatch(context: __compactRuntime.CircuitContext<PS>,
           localDomainId_0: bigint,
           destination_0: bigint,
           recipient_0: Uint8Array,
           bodyLength_0: bigint,
           body_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deliver(context: __compactRuntime.CircuitContext<PS>,
          localDomainId_0: bigint,
          message_0: Message,
          metadata_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  delivered(context: __compactRuntime.CircuitContext<PS>,
            messageId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  latestDispatchedId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  initialize(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  dispatch(context: __compactRuntime.CircuitContext<PS>,
           localDomainId_0: bigint,
           destination_0: bigint,
           recipient_0: Uint8Array,
           bodyLength_0: bigint,
           body_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  deliver(context: __compactRuntime.CircuitContext<PS>,
          localDomainId_0: bigint,
          message_0: Message,
          metadata_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  delivered(context: __compactRuntime.CircuitContext<PS>,
            messageId_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  latestDispatchedId(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
