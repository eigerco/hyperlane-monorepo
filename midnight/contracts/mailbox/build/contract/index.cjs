'use strict';
const __compactRuntime = require('@midnight-ntwrk/compact-runtime');
const expectedRuntimeVersionString = '0.8.1';
const expectedRuntimeVersion = expectedRuntimeVersionString.split('-')[0].split('.').map(Number);
const actualRuntimeVersion = __compactRuntime.versionString.split('-')[0].split('.').map(Number);
if (expectedRuntimeVersion[0] != actualRuntimeVersion[0]
     || (actualRuntimeVersion[0] == 0 && expectedRuntimeVersion[1] != actualRuntimeVersion[1])
     || expectedRuntimeVersion[1] > actualRuntimeVersion[1]
     || (expectedRuntimeVersion[1] == actualRuntimeVersion[1] && expectedRuntimeVersion[2] > actualRuntimeVersion[2]))
   throw new __compactRuntime.CompactError(`Version mismatch: compiled code expects ${expectedRuntimeVersionString}, runtime is ${__compactRuntime.versionString}`);
{ const MAX_FIELD = 52435875175126190479447740508185965837690552500527637822603658699938581184512n;
  if (__compactRuntime.MAX_FIELD !== MAX_FIELD)
     throw new __compactRuntime.CompactError(`compiler thinks maximum field value is ${MAX_FIELD}; run time thinks it is ${__compactRuntime.MAX_FIELD}`)
}

const _descriptor_0 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_2 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_3 = new __compactRuntime.CompactTypeUnsignedInteger(65535n, 2);

const _descriptor_4 = new __compactRuntime.CompactTypeBytes(1024);

class _Message_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment())))))));
  }
  fromValue(value_0) {
    return {
      version: _descriptor_1.fromValue(value_0),
      nonce: _descriptor_2.fromValue(value_0),
      origin: _descriptor_2.fromValue(value_0),
      sender: _descriptor_0.fromValue(value_0),
      destination: _descriptor_2.fromValue(value_0),
      recipient: _descriptor_0.fromValue(value_0),
      bodyLength: _descriptor_3.fromValue(value_0),
      body: _descriptor_4.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.version).concat(_descriptor_2.toValue(value_0.nonce).concat(_descriptor_2.toValue(value_0.origin).concat(_descriptor_0.toValue(value_0.sender).concat(_descriptor_2.toValue(value_0.destination).concat(_descriptor_0.toValue(value_0.recipient).concat(_descriptor_3.toValue(value_0.bodyLength).concat(_descriptor_4.toValue(value_0.body))))))));
  }
}

const _descriptor_5 = new _Message_0();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(1n, 1);

const _descriptor_7 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_8 = new __compactRuntime.CompactTypeBoolean();

class _ContractAddress_0 {
  alignment() {
    return _descriptor_0.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.bytes);
  }
}

const _descriptor_9 = new _ContractAddress_0();

const _descriptor_10 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

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
    if (typeof(witnesses_0.checkDelivered) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named checkDelivered');
    }
    if (typeof(witnesses_0.validateWithISM) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named validateWithISM');
    }
    if (typeof(witnesses_0.getZeroBytes) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getZeroBytes');
    }
    if (typeof(witnesses_0.getSender) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getSender');
    }
    if (typeof(witnesses_0.getLatestMessageId) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getLatestMessageId');
    }
    if (typeof(witnesses_0.getCurrentNonce) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getCurrentNonce');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      initialize: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`initialize: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('initialize',
                                      'argument 1 (as invoked from Typescript)',
                                      'mailbox.compact line 90 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._initialize_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      dispatch: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`dispatch: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const localDomainId_0 = args_1[1];
        const destination_0 = args_1[2];
        const recipient_0 = args_1[3];
        const bodyLength_0 = args_1[4];
        const body_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('dispatch',
                                      'argument 1 (as invoked from Typescript)',
                                      'mailbox.compact line 110 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        if (!(typeof(localDomainId_0) === 'bigint' && localDomainId_0 >= 0n && localDomainId_0 <= 4294967295n)) {
          __compactRuntime.type_error('dispatch',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      'mailbox.compact line 110 char 1',
                                      'Uint<0..4294967295>',
                                      localDomainId_0)
        }
        if (!(typeof(destination_0) === 'bigint' && destination_0 >= 0n && destination_0 <= 4294967295n)) {
          __compactRuntime.type_error('dispatch',
                                      'argument 2 (argument 3 as invoked from Typescript)',
                                      'mailbox.compact line 110 char 1',
                                      'Uint<0..4294967295>',
                                      destination_0)
        }
        if (!(recipient_0.buffer instanceof ArrayBuffer && recipient_0.BYTES_PER_ELEMENT === 1 && recipient_0.length === 32)) {
          __compactRuntime.type_error('dispatch',
                                      'argument 3 (argument 4 as invoked from Typescript)',
                                      'mailbox.compact line 110 char 1',
                                      'Bytes<32>',
                                      recipient_0)
        }
        if (!(typeof(bodyLength_0) === 'bigint' && bodyLength_0 >= 0n && bodyLength_0 <= 65535n)) {
          __compactRuntime.type_error('dispatch',
                                      'argument 4 (argument 5 as invoked from Typescript)',
                                      'mailbox.compact line 110 char 1',
                                      'Uint<0..65535>',
                                      bodyLength_0)
        }
        if (!(body_0.buffer instanceof ArrayBuffer && body_0.BYTES_PER_ELEMENT === 1 && body_0.length === 1024)) {
          __compactRuntime.type_error('dispatch',
                                      'argument 5 (argument 6 as invoked from Typescript)',
                                      'mailbox.compact line 110 char 1',
                                      'Bytes<1024>',
                                      body_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(localDomainId_0).concat(_descriptor_2.toValue(destination_0).concat(_descriptor_0.toValue(recipient_0).concat(_descriptor_3.toValue(bodyLength_0).concat(_descriptor_4.toValue(body_0))))),
            alignment: _descriptor_2.alignment().concat(_descriptor_2.alignment().concat(_descriptor_0.alignment().concat(_descriptor_3.alignment().concat(_descriptor_4.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._dispatch_0(context,
                                          partialProofData,
                                          localDomainId_0,
                                          destination_0,
                                          recipient_0,
                                          bodyLength_0,
                                          body_0);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      deliver: (...args_1) => {
        if (args_1.length !== 4) {
          throw new __compactRuntime.CompactError(`deliver: expected 4 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const localDomainId_0 = args_1[1];
        const message_0 = args_1[2];
        const metadata_0 = args_1[3];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('deliver',
                                      'argument 1 (as invoked from Typescript)',
                                      'mailbox.compact line 169 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        if (!(typeof(localDomainId_0) === 'bigint' && localDomainId_0 >= 0n && localDomainId_0 <= 4294967295n)) {
          __compactRuntime.type_error('deliver',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      'mailbox.compact line 169 char 1',
                                      'Uint<0..4294967295>',
                                      localDomainId_0)
        }
        if (!(typeof(message_0) === 'object' && typeof(message_0.version) === 'bigint' && message_0.version >= 0n && message_0.version <= 255n && typeof(message_0.nonce) === 'bigint' && message_0.nonce >= 0n && message_0.nonce <= 4294967295n && typeof(message_0.origin) === 'bigint' && message_0.origin >= 0n && message_0.origin <= 4294967295n && message_0.sender.buffer instanceof ArrayBuffer && message_0.sender.BYTES_PER_ELEMENT === 1 && message_0.sender.length === 32 && typeof(message_0.destination) === 'bigint' && message_0.destination >= 0n && message_0.destination <= 4294967295n && message_0.recipient.buffer instanceof ArrayBuffer && message_0.recipient.BYTES_PER_ELEMENT === 1 && message_0.recipient.length === 32 && typeof(message_0.bodyLength) === 'bigint' && message_0.bodyLength >= 0n && message_0.bodyLength <= 65535n && message_0.body.buffer instanceof ArrayBuffer && message_0.body.BYTES_PER_ELEMENT === 1 && message_0.body.length === 1024)) {
          __compactRuntime.type_error('deliver',
                                      'argument 2 (argument 3 as invoked from Typescript)',
                                      'mailbox.compact line 169 char 1',
                                      'struct Message<version: Uint<0..255>, nonce: Uint<0..4294967295>, origin: Uint<0..4294967295>, sender: Bytes<32>, destination: Uint<0..4294967295>, recipient: Bytes<32>, bodyLength: Uint<0..65535>, body: Bytes<1024>>',
                                      message_0)
        }
        if (!(metadata_0.buffer instanceof ArrayBuffer && metadata_0.BYTES_PER_ELEMENT === 1 && metadata_0.length === 1024)) {
          __compactRuntime.type_error('deliver',
                                      'argument 3 (argument 4 as invoked from Typescript)',
                                      'mailbox.compact line 169 char 1',
                                      'Bytes<1024>',
                                      metadata_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_2.toValue(localDomainId_0).concat(_descriptor_5.toValue(message_0).concat(_descriptor_4.toValue(metadata_0))),
            alignment: _descriptor_2.alignment().concat(_descriptor_5.alignment().concat(_descriptor_4.alignment()))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._deliver_0(context,
                                         partialProofData,
                                         localDomainId_0,
                                         message_0,
                                         metadata_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      delivered: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`delivered: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const messageId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('delivered',
                                      'argument 1 (as invoked from Typescript)',
                                      'mailbox.compact line 208 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        if (!(messageId_0.buffer instanceof ArrayBuffer && messageId_0.BYTES_PER_ELEMENT === 1 && messageId_0.length === 32)) {
          __compactRuntime.type_error('delivered',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      'mailbox.compact line 208 char 1',
                                      'Bytes<32>',
                                      messageId_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(messageId_0),
            alignment: _descriptor_0.alignment()
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._delivered_0(context,
                                           partialProofData,
                                           messageId_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      latestDispatchedId: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`latestDispatchedId: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('latestDispatchedId',
                                      'argument 1 (as invoked from Typescript)',
                                      'mailbox.compact line 220 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._latestDispatchedId_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData };
      }
    };
    this.impureCircuits = {
      initialize: this.circuits.initialize,
      dispatch: this.circuits.dispatch,
      deliver: this.circuits.deliver,
      delivered: this.circuits.delivered,
      latestDispatchedId: this.circuits.latestDispatchedId
    };
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
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = stateValue_0;
    state_0.setOperation('initialize', new __compactRuntime.ContractOperation());
    state_0.setOperation('dispatch', new __compactRuntime.ContractOperation());
    state_0.setOperation('deliver', new __compactRuntime.ContractOperation());
    state_0.setOperation('delivered', new __compactRuntime.ContractOperation());
    state_0.setOperation('latestDispatchedId', new __compactRuntime.ContractOperation());
    const context = {
      originalState: state_0,
      currentPrivateState: constructorContext_0.initialPrivateState,
      currentZswapLocalState: constructorContext_0.initialZswapLocalState,
      transactionContext: new __compactRuntime.QueryContext(state_0.data, __compactRuntime.dummyContractAddress())
    };
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                            alignment: _descriptor_7.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(1n),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newMap(
                                        new __compactRuntime.StateMap()
                                      ).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(2n),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newMap(
                                        new __compactRuntime.StateMap()
                                      ).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    state_0.data = context.transactionContext.state;
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _getMessageId_0(context, partialProofData, message_0) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getMessageId(witnessContext_0,
                                                                       message_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.type_error('getMessageId',
                                  'return value',
                                  'mailbox.compact line 36 char 1',
                                  'Bytes<32>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _checkDelivered_0(context, partialProofData, messageId_0) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.checkDelivered(witnessContext_0,
                                                                         messageId_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 1n)) {
      __compactRuntime.type_error('checkDelivered',
                                  'return value',
                                  'mailbox.compact line 39 char 1',
                                  'Uint<0..1>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_6.toValue(result_0),
      alignment: _descriptor_6.alignment()
    });
    return result_0;
  }
  _validateWithISM_0(context, partialProofData, message_0, metadata_0) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.validateWithISM(witnessContext_0,
                                                                          message_0,
                                                                          metadata_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 0 )) {
      __compactRuntime.type_error('validateWithISM',
                                  'return value',
                                  'mailbox.compact line 43 char 1',
                                  '[]',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: [],
      alignment: []
    });
    return result_0;
  }
  _getZeroBytes_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getZeroBytes(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.type_error('getZeroBytes',
                                  'return value',
                                  'mailbox.compact line 46 char 1',
                                  'Bytes<32>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _getSender_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getSender(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.type_error('getSender',
                                  'return value',
                                  'mailbox.compact line 49 char 1',
                                  'Bytes<32>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _getLatestMessageId_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getLatestMessageId(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.type_error('getLatestMessageId',
                                  'return value',
                                  'mailbox.compact line 52 char 1',
                                  'Bytes<32>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _getCurrentNonce_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getCurrentNonce(witnessContext_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 4294967295n)) {
      __compactRuntime.type_error('getCurrentNonce',
                                  'return value',
                                  'mailbox.compact line 55 char 1',
                                  'Uint<0..4294967295>',
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
  _initialize_0(context, partialProofData) {
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(0n),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_7.toValue(0n),
                                                                            alignment: _descriptor_7.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 0n;
    const tmp_1 = this._getZeroBytes_0(context, partialProofData);
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_1.toValue(2n),
                                                alignment: _descriptor_1.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _dispatch_0(context,
              partialProofData,
              localDomainId_0,
              destination_0,
              recipient_0,
              bodyLength_0,
              body_0)
  {
    const currentNonce_0 = this._getCurrentNonce_0(context, partialProofData);
    const sender_0 = this._getSender_0(context, partialProofData);
    const message_0 = { version: 3n,
                        nonce: currentNonce_0,
                        origin: localDomainId_0,
                        sender: sender_0,
                        destination: destination_0,
                        recipient: recipient_0,
                        bodyLength: bodyLength_0,
                        body: body_0 };
    this._validateMessage_0(message_0);
    const messageId_0 = this._computeMessageId_0(context,
                                                 partialProofData,
                                                 message_0);
    const tmp_0 = 0n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_1.toValue(2n),
                                                alignment: _descriptor_1.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(messageId_0),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_1 = 1n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_1.toValue(0n),
                                                alignment: _descriptor_1.alignment() } }] } },
                     { addi: { immediate: parseInt(__compactRuntime.valueToBigInt(
                                            { value: _descriptor_3.toValue(tmp_1),
                                              alignment: _descriptor_3.alignment() }
                                              .value
                                          )) } },
                     { ins: { cached: true, n: 1 } }]);
    return messageId_0;
  }
  _deliver_0(context, partialProofData, localDomainId_0, message_0, metadata_0)
  {
    this._validateMessage_0(message_0);
    __compactRuntime.assert(this._equal_0(message_0.destination, localDomainId_0),
                            'Message destination does not match this chain');
    const messageId_0 = this._computeMessageId_0(context,
                                                 partialProofData,
                                                 message_0);
    __compactRuntime.assert(this._equal_1(this._checkDelivered_0(context,
                                                                 partialProofData,
                                                                 messageId_0),
                                          0n),
                            'Message already delivered');
    this._validateWithISM_0(context, partialProofData, message_0, metadata_0);
    const tmp_0 = 1n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_1.toValue(1n),
                                                alignment: _descriptor_1.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(messageId_0),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_1.toValue(tmp_0),
                                                                            alignment: _descriptor_1.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    return [];
  }
  _delivered_0(context, partialProofData, messageId_0) {
    __compactRuntime.assert(this._equal_2(this._checkDelivered_0(context,
                                                                 partialProofData,
                                                                 messageId_0),
                                          1n),
                            'Message not delivered');
    return [];
  }
  _latestDispatchedId_0(context, partialProofData) {
    return this._getLatestMessageId_0(context, partialProofData);
  }
  _equal_0(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  _equal_2(x0, y0) {
    if (x0 !== y0) { return false; }
    return true;
  }
  static _query(context, partialProofData, prog) {
    var res;
    try {
      res = context.transactionContext.query(prog, __compactRuntime.CostModel.dummyCostModel());
    } catch (err) {
      throw new __compactRuntime.CompactError(err.toString());
    }
    context.transactionContext = res.context;
    var reads = res.events.filter((e) => e.tag === 'read');
    var i = 0;
    partialProofData.publicTranscript = partialProofData.publicTranscript.concat(prog.map((op) => {
      if(typeof(op) === 'object' && 'popeq' in op) {
        return { popeq: {
          ...op.popeq,
          result: reads[i++].content,
        } };
      } else {
        return op;
      }
    }));
    if(res.events.length == 1 && res.events[0].tag === 'read') {
      return res.events[0].content;
    } else {
      return res.events;
    }
  }
}
function ledger(state) {
  const context = {
    originalState: state,
    transactionContext: new __compactRuntime.QueryContext(state, __compactRuntime.dummyContractAddress())
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
  originalState: new __compactRuntime.ContractState(),
  transactionContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  getMessageId: (...args) => undefined,
  checkDelivered: (...args) => undefined,
  validateWithISM: (...args) => undefined,
  getZeroBytes: (...args) => undefined,
  getSender: (...args) => undefined,
  getLatestMessageId: (...args) => undefined,
  getCurrentNonce: (...args) => undefined
});
const pureCircuits = {};
const contractReferenceLocations = { tag: 'publicLedgerArray', indices: { } };
exports.Contract = Contract;
exports.ledger = ledger;
exports.pureCircuits = pureCircuits;
exports.contractReferenceLocations = contractReferenceLocations;
//# sourceMappingURL=index.cjs.map
