import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
const expectedRuntimeVersionString = '0.11.0';
__compactRuntime.checkRuntimeVersion(expectedRuntimeVersionString);

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_4 = new __compactRuntime.CompactTypeBytes(1024);

class _Message_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment())))))));
  }
  fromValue(value_0) {
    return {
      version: _descriptor_0.fromValue(value_0),
      nonce: _descriptor_1.fromValue(value_0),
      origin: _descriptor_1.fromValue(value_0),
      sender: _descriptor_2.fromValue(value_0),
      destination: _descriptor_1.fromValue(value_0),
      recipient: _descriptor_2.fromValue(value_0),
      bodyLength: _descriptor_3.fromValue(value_0),
      body: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.version).concat(_descriptor_1.toValue(value_0.nonce).concat(_descriptor_1.toValue(value_0.origin).concat(_descriptor_2.toValue(value_0.sender).concat(_descriptor_1.toValue(value_0.destination).concat(_descriptor_2.toValue(value_0.recipient).concat(_descriptor_3.toValue(value_0.bodyLength).concat(_descriptor_4.toValue(value_0.body))))))));
  }
}

const _descriptor_5 = new _Message_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_7 = __compactRuntime.CompactTypeBoolean;

class _Either_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_2.fromValue(value_0),
      right: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_2.toValue(value_0.left).concat(_descriptor_2.toValue(value_0.right)));
  }
}

const _descriptor_8 = new _Either_0();

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_2.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_2.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.bytes);
  }
}

const _descriptor_10 = new _ContractAddress_0();

class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.getMessageId) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getMessageId');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      computeMessageId: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`computeMessageId: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const message_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.currentQueryContext != undefined)) {
          __compactRuntime.typeError('computeMessageId',
                                     'argument 1 (as invoked from Typescript)',
                                     'message.compact line 67 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        if (!(typeof(message_0) === 'object' && typeof(message_0.version) === 'bigint' && message_0.version >= 0n && message_0.version <= 255n && typeof(message_0.nonce) === 'bigint' && message_0.nonce >= 0n && message_0.nonce <= 4294967295n && typeof(message_0.origin) === 'bigint' && message_0.origin >= 0n && message_0.origin <= 4294967295n && message_0.sender.buffer instanceof ArrayBuffer && message_0.sender.BYTES_PER_ELEMENT === 1 && message_0.sender.length === 32 && typeof(message_0.destination) === 'bigint' && message_0.destination >= 0n && message_0.destination <= 4294967295n && message_0.recipient.buffer instanceof ArrayBuffer && message_0.recipient.BYTES_PER_ELEMENT === 1 && message_0.recipient.length === 32 && typeof(message_0.bodyLength) === 'bigint' && message_0.bodyLength >= 0n && message_0.bodyLength <= 65535n && message_0.body.buffer instanceof ArrayBuffer && message_0.body.BYTES_PER_ELEMENT === 1 && message_0.body.length === 1024)) {
          __compactRuntime.typeError('computeMessageId',
                                     'argument 1 (argument 2 as invoked from Typescript)',
                                     'message.compact line 67 char 1',
                                     'struct Message<version: Uint<0..255>, nonce: Uint<0..4294967295>, origin: Uint<0..4294967295>, sender: Bytes<32>, destination: Uint<0..4294967295>, recipient: Bytes<32>, bodyLength: Uint<0..65535>, body: Bytes<1024>>',
                                     message_0)
        }
        const context = { ...contextOrig_0, gasCost: __compactRuntime.emptyRunningCost() };
        const partialProofData = {
          input: {
            value: _descriptor_5.toValue(message_0),
            alignment: _descriptor_5.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._computeMessageId_0(context,
                                                  partialProofData,
                                                  message_0);
        partialProofData.output = { value: _descriptor_2.toValue(result_0), alignment: _descriptor_2.alignment() };
        return { result: result_0, context: context, proofData: partialProofData, gasCost: context.gasCost };
      },
      validateMessage(context, ...args_1) {
        return { result: pureCircuits.validateMessage(...args_1), context };
      }
    };
    this.impureCircuits = { computeMessageId: this.circuits.computeMessageId };
  }
  initialState(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('computeMessageId', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext(__compactRuntime.dummyContractAddress(), constructorContext_0.initialZswapLocalState.coinPublicKey, state_0.data, constructorContext_0.initialPrivateState);
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    state_0.data = context.currentQueryContext.state;
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _getMessageId_0(context, partialProofData, message_0) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.currentQueryContext.state), context.currentPrivateState, context.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getMessageId(witnessContext_0,
                                                                       message_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.typeError('getMessageId',
                                 'return value',
                                 'message.compact line 60 char 1',
                                 'Bytes<32>',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _computeMessageId_0(context, partialProofData, message_0) {
    return this._getMessageId_0(context, partialProofData, message_0);
  }
  _validateMessage_0(message_0) {
    __compactRuntime.assert(message_0.version <= 3n,
                            'Unsupported message version');
    __compactRuntime.assert(message_0.bodyLength <= 1024n,
                            'Body length exceeds maximum');
    return [];
  }
}
function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()),
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
  };
}
const _emptyContext = {
  currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({ getMessageId: (...args) => undefined });
const pureCircuits = {
  validateMessage: (...args_0) => {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`validateMessage: expected 1 argument (as invoked from Typescript), received ${args_0.length}`);
    }
    const message_0 = args_0[0];
    if (!(typeof(message_0) === 'object' && typeof(message_0.version) === 'bigint' && message_0.version >= 0n && message_0.version <= 255n && typeof(message_0.nonce) === 'bigint' && message_0.nonce >= 0n && message_0.nonce <= 4294967295n && typeof(message_0.origin) === 'bigint' && message_0.origin >= 0n && message_0.origin <= 4294967295n && message_0.sender.buffer instanceof ArrayBuffer && message_0.sender.BYTES_PER_ELEMENT === 1 && message_0.sender.length === 32 && typeof(message_0.destination) === 'bigint' && message_0.destination >= 0n && message_0.destination <= 4294967295n && message_0.recipient.buffer instanceof ArrayBuffer && message_0.recipient.BYTES_PER_ELEMENT === 1 && message_0.recipient.length === 32 && typeof(message_0.bodyLength) === 'bigint' && message_0.bodyLength >= 0n && message_0.bodyLength <= 65535n && message_0.body.buffer instanceof ArrayBuffer && message_0.body.BYTES_PER_ELEMENT === 1 && message_0.body.length === 1024)) {
      __compactRuntime.typeError('validateMessage',
                                 'argument 1',
                                 'message.compact line 78 char 1',
                                 'struct Message<version: Uint<0..255>, nonce: Uint<0..4294967295>, origin: Uint<0..4294967295>, sender: Bytes<32>, destination: Uint<0..4294967295>, recipient: Bytes<32>, bodyLength: Uint<0..65535>, body: Bytes<1024>>',
                                 message_0)
    }
    return _dummyContract._validateMessage_0(message_0);
  }
};
const contractReferenceLocations = { tag: 'publicLedgerArray', indices: { } };
export { Contract, ledger, pureCircuits, contractReferenceLocations };
//# sourceMappingURL=index.js.map
