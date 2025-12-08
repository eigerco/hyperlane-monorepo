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

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(33);

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(64);

class _ISMMetadata_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_2.alignment().concat(_descriptor_3.alignment())));
  }
  fromValue(value_0) {
    return {
      validator1PubKey: _descriptor_2.fromValue(value_0),
      validator1Sig: _descriptor_3.fromValue(value_0),
      validator2PubKey: _descriptor_2.fromValue(value_0),
      validator2Sig: _descriptor_3.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.validator1PubKey).concat(_descriptor_3.toValue(value_0.validator1Sig).concat(_descriptor_2.toValue(value_0.validator2PubKey).concat(_descriptor_3.toValue(value_0.validator2Sig))));
  }
}

const _descriptor_4 = new _ISMMetadata_0();

const _descriptor_5 = new __compactRuntime.CompactTypeBoolean();

const _descriptor_6 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

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

const _descriptor_7 = new _ContractAddress_0();

const _descriptor_8 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

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
    if (typeof(witnesses_0.verifyValidatorSignatures) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named verifyValidatorSignatures');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      verify: (...args_1) => {
        if (args_1.length !== 3) {
          throw new __compactRuntime.CompactError(`verify: expected 3 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const messageId_0 = args_1[1];
        const metadata_0 = args_1[2];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('verify',
                                      'argument 1 (as invoked from Typescript)',
                                      'ism.compact line 73 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        if (!(messageId_0.buffer instanceof ArrayBuffer && messageId_0.BYTES_PER_ELEMENT === 1 && messageId_0.length === 32)) {
          __compactRuntime.type_error('verify',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      'ism.compact line 73 char 1',
                                      'Bytes<32>',
                                      messageId_0)
        }
        if (!(typeof(metadata_0) === 'object' && metadata_0.validator1PubKey.buffer instanceof ArrayBuffer && metadata_0.validator1PubKey.BYTES_PER_ELEMENT === 1 && metadata_0.validator1PubKey.length === 33 && metadata_0.validator1Sig.buffer instanceof ArrayBuffer && metadata_0.validator1Sig.BYTES_PER_ELEMENT === 1 && metadata_0.validator1Sig.length === 64 && metadata_0.validator2PubKey.buffer instanceof ArrayBuffer && metadata_0.validator2PubKey.BYTES_PER_ELEMENT === 1 && metadata_0.validator2PubKey.length === 33 && metadata_0.validator2Sig.buffer instanceof ArrayBuffer && metadata_0.validator2Sig.BYTES_PER_ELEMENT === 1 && metadata_0.validator2Sig.length === 64)) {
          __compactRuntime.type_error('verify',
                                      'argument 2 (argument 3 as invoked from Typescript)',
                                      'ism.compact line 73 char 1',
                                      'struct ISMMetadata<validator1PubKey: Bytes<33>, validator1Sig: Bytes<64>, validator2PubKey: Bytes<33>, validator2Sig: Bytes<64>>',
                                      metadata_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_0.toValue(messageId_0).concat(_descriptor_4.toValue(metadata_0)),
            alignment: _descriptor_0.alignment().concat(_descriptor_4.alignment())
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._verify_0(context,
                                        partialProofData,
                                        messageId_0,
                                        metadata_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      isVerified: (...args_1) => {
        if (args_1.length !== 2) {
          throw new __compactRuntime.CompactError(`isVerified: expected 2 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const messageId_0 = args_1[1];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('isVerified',
                                      'argument 1 (as invoked from Typescript)',
                                      'ism.compact line 97 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        if (!(messageId_0.buffer instanceof ArrayBuffer && messageId_0.BYTES_PER_ELEMENT === 1 && messageId_0.length === 32)) {
          __compactRuntime.type_error('isVerified',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      'ism.compact line 97 char 1',
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
        const result_0 = this._isVerified_0(context,
                                            partialProofData,
                                            messageId_0);
        partialProofData.output = { value: _descriptor_1.toValue(result_0), alignment: _descriptor_1.alignment() };
        return { result: result_0, context: context, proofData: partialProofData };
      }
    };
    this.impureCircuits = {
      verify: this.circuits.verify,
      isVerified: this.circuits.isVerified
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
    state_0.data = stateValue_0;
    state_0.setOperation('verify', new __compactRuntime.ContractOperation());
    state_0.setOperation('isVerified', new __compactRuntime.ContractOperation());
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
  _verifyValidatorSignatures_0(context,
                               partialProofData,
                               messageId_0,
                               validator1PubKey_0,
                               validator1Sig_0,
                               validator2PubKey_0,
                               validator2Sig_0)
  {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.verifyValidatorSignatures(witnessContext_0,
                                                                                    messageId_0,
                                                                                    validator1PubKey_0,
                                                                                    validator1Sig_0,
                                                                                    validator2PubKey_0,
                                                                                    validator2Sig_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 255n)) {
      __compactRuntime.type_error('verifyValidatorSignatures',
                                  'return value',
                                  'ism.compact line 55 char 1',
                                  'Uint<0..255>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_1.toValue(result_0),
      alignment: _descriptor_1.alignment()
    });
    return result_0;
  }
  _verify_0(context, partialProofData, messageId_0, metadata_0) {
    const isValid_0 = this._verifyValidatorSignatures_0(context,
                                                        partialProofData,
                                                        messageId_0,
                                                        metadata_0.validator1PubKey,
                                                        metadata_0.validator1Sig,
                                                        metadata_0.validator2PubKey,
                                                        metadata_0.validator2Sig);
    __compactRuntime.assert(this._equal_0(isValid_0, 1n),
                            'Validator signature verification failed');
    const tmp_0 = 1n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_1.toValue(0n),
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
  _isVerified_0(context, partialProofData, messageId_0) {
    __compactRuntime.assert(_descriptor_5.fromValue(Contract._query(context,
                                                                    partialProofData,
                                                                    [
                                                                     { dup: { n: 0 } },
                                                                     { idx: { cached: false,
                                                                              pushPath: false,
                                                                              path: [
                                                                                     { tag: 'value',
                                                                                       value: { value: _descriptor_1.toValue(0n),
                                                                                                alignment: _descriptor_1.alignment() } }] } },
                                                                     { push: { storage: false,
                                                                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(messageId_0),
                                                                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                                                                     'member',
                                                                     { popeq: { cached: true,
                                                                                result: undefined } }]).value),
                            'Message not verified');
    return 1n;
  }
  _equal_0(x0, y0) {
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
  verifyValidatorSignatures: (...args) => undefined
});
const pureCircuits = {};
const contractReferenceLocations = { tag: 'publicLedgerArray', indices: { } };
exports.Contract = Contract;
exports.ledger = ledger;
exports.pureCircuits = pureCircuits;
exports.contractReferenceLocations = contractReferenceLocations;
//# sourceMappingURL=index.cjs.map
