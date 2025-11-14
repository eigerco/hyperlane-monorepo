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
}

export type ImpureCircuits<PS> = {
  computeMessageId(context: __compactRuntime.CircuitContext<PS>,
                   message_0: Message): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
  validateMessage(message_0: Message): [];
}

export type Circuits<PS> = {
  computeMessageId(context: __compactRuntime.CircuitContext<PS>,
                   message_0: Message): __compactRuntime.CircuitResults<PS, Uint8Array>;
  validateMessage(context: __compactRuntime.CircuitContext<PS>,
                  message_0: Message): __compactRuntime.CircuitResults<PS, []>;
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
