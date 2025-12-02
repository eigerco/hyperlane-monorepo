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

const _descriptor_0 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_1 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

const _descriptor_2 = new __compactRuntime.CompactTypeBytes(32);

const _descriptor_3 = new __compactRuntime.CompactTypeBytes(2048);

class _ISMMetadata_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_3.alignment().concat(_descriptor_0.alignment()));
  }
  fromValue(value_0) {
    return {
      merkleRoot: _descriptor_2.fromValue(value_0),
      signatures: _descriptor_3.fromValue(value_0),
      signatureCount: _descriptor_0.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0.merkleRoot).concat(_descriptor_3.toValue(value_0.signatures).concat(_descriptor_0.toValue(value_0.signatureCount)));
  }
}

const _descriptor_4 = new _ISMMetadata_0();

const _descriptor_5 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_6 = new __compactRuntime.CompactTypeBoolean();

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
    if (typeof(witnesses_0.computeCheckpointDigest) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named computeCheckpointDigest');
    }
    if (typeof(witnesses_0.countValidSignatures) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named countValidSignatures');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      verify: (...args_1) => {
        if (args_1.length !== 6) {
          throw new __compactRuntime.CompactError(`verify: expected 6 arguments (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        const origin_0 = args_1[1];
        const originMailbox_0 = args_1[2];
        const nonce_0 = args_1[3];
        const messageId_0 = args_1[4];
        const metadata_0 = args_1[5];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('verify',
                                      'argument 1 (as invoked from Typescript)',
                                      'multisig-ism.compact line 112 char 1',
                                      'CircuitContext',
                                      contextOrig_0)
        }
        if (!(typeof(origin_0) === 'bigint' && origin_0 >= 0n && origin_0 <= 4294967295n)) {
          __compactRuntime.type_error('verify',
                                      'argument 1 (argument 2 as invoked from Typescript)',
                                      'multisig-ism.compact line 112 char 1',
                                      'Uint<0..4294967295>',
                                      origin_0)
        }
        if (!(originMailbox_0.buffer instanceof ArrayBuffer && originMailbox_0.BYTES_PER_ELEMENT === 1 && originMailbox_0.length === 32)) {
          __compactRuntime.type_error('verify',
                                      'argument 2 (argument 3 as invoked from Typescript)',
                                      'multisig-ism.compact line 112 char 1',
                                      'Bytes<32>',
                                      originMailbox_0)
        }
        if (!(typeof(nonce_0) === 'bigint' && nonce_0 >= 0n && nonce_0 <= 4294967295n)) {
          __compactRuntime.type_error('verify',
                                      'argument 3 (argument 4 as invoked from Typescript)',
                                      'multisig-ism.compact line 112 char 1',
                                      'Uint<0..4294967295>',
                                      nonce_0)
        }
        if (!(messageId_0.buffer instanceof ArrayBuffer && messageId_0.BYTES_PER_ELEMENT === 1 && messageId_0.length === 32)) {
          __compactRuntime.type_error('verify',
                                      'argument 4 (argument 5 as invoked from Typescript)',
                                      'multisig-ism.compact line 112 char 1',
                                      'Bytes<32>',
                                      messageId_0)
        }
        if (!(typeof(metadata_0) === 'object' && metadata_0.merkleRoot.buffer instanceof ArrayBuffer && metadata_0.merkleRoot.BYTES_PER_ELEMENT === 1 && metadata_0.merkleRoot.length === 32 && metadata_0.signatures.buffer instanceof ArrayBuffer && metadata_0.signatures.BYTES_PER_ELEMENT === 1 && metadata_0.signatures.length === 2048 && typeof(metadata_0.signatureCount) === 'bigint' && metadata_0.signatureCount >= 0n && metadata_0.signatureCount <= 255n)) {
          __compactRuntime.type_error('verify',
                                      'argument 5 (argument 6 as invoked from Typescript)',
                                      'multisig-ism.compact line 112 char 1',
                                      'struct ISMMetadata<merkleRoot: Bytes<32>, signatures: Bytes<2048>, signatureCount: Uint<0..255>>',
                                      metadata_0)
        }
        const context = { ...contextOrig_0 };
        const partialProofData = {
          input: {
            value: _descriptor_1.toValue(origin_0).concat(_descriptor_2.toValue(originMailbox_0).concat(_descriptor_1.toValue(nonce_0).concat(_descriptor_2.toValue(messageId_0).concat(_descriptor_4.toValue(metadata_0))))),
            alignment: _descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_1.alignment().concat(_descriptor_2.alignment().concat(_descriptor_4.alignment()))))
          },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = this._verify_0(context,
                                        partialProofData,
                                        origin_0,
                                        originMailbox_0,
                                        nonce_0,
                                        messageId_0,
                                        metadata_0);
        partialProofData.output = { value: [], alignment: [] };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      getThreshold: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`getThreshold: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('getThreshold',
                                      'argument 1 (as invoked from Typescript)',
                                      'multisig-ism.compact line 145 char 1',
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
        const result_0 = this._getThreshold_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData };
      },
      getValidatorCount: (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`getValidatorCount: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.originalState != undefined && contextOrig_0.transactionContext != undefined)) {
          __compactRuntime.type_error('getValidatorCount',
                                      'argument 1 (as invoked from Typescript)',
                                      'multisig-ism.compact line 152 char 1',
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
        const result_0 = this._getValidatorCount_0(context, partialProofData);
        partialProofData.output = { value: _descriptor_0.toValue(result_0), alignment: _descriptor_0.alignment() };
        return { result: result_0, context: context, proofData: partialProofData };
      }
    };
    this.impureCircuits = {
      verify: this.circuits.verify,
      getThreshold: this.circuits.getThreshold,
      getValidatorCount: this.circuits.getValidatorCount
    };
  }
  initialState(...args_0) {
    if (args_0.length !== 11) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 11 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const _threshold_0 = args_0[1];
    const _validatorCount_0 = args_0[2];
    const v0_0 = args_0[3];
    const v1_0 = args_0[4];
    const v2_0 = args_0[5];
    const v3_0 = args_0[6];
    const v4_0 = args_0[7];
    const v5_0 = args_0[8];
    const v6_0 = args_0[9];
    const v7_0 = args_0[10];
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
    if (!(typeof(_threshold_0) === 'bigint' && _threshold_0 >= 0n && _threshold_0 <= 255n)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 1 (argument 2 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Uint<0..255>',
                                  _threshold_0)
    }
    if (!(typeof(_validatorCount_0) === 'bigint' && _validatorCount_0 >= 0n && _validatorCount_0 <= 255n)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 2 (argument 3 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Uint<0..255>',
                                  _validatorCount_0)
    }
    if (!(v0_0.buffer instanceof ArrayBuffer && v0_0.BYTES_PER_ELEMENT === 1 && v0_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 3 (argument 4 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v0_0)
    }
    if (!(v1_0.buffer instanceof ArrayBuffer && v1_0.BYTES_PER_ELEMENT === 1 && v1_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 4 (argument 5 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v1_0)
    }
    if (!(v2_0.buffer instanceof ArrayBuffer && v2_0.BYTES_PER_ELEMENT === 1 && v2_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 5 (argument 6 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v2_0)
    }
    if (!(v3_0.buffer instanceof ArrayBuffer && v3_0.BYTES_PER_ELEMENT === 1 && v3_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 6 (argument 7 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v3_0)
    }
    if (!(v4_0.buffer instanceof ArrayBuffer && v4_0.BYTES_PER_ELEMENT === 1 && v4_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 7 (argument 8 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v4_0)
    }
    if (!(v5_0.buffer instanceof ArrayBuffer && v5_0.BYTES_PER_ELEMENT === 1 && v5_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 8 (argument 9 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v5_0)
    }
    if (!(v6_0.buffer instanceof ArrayBuffer && v6_0.BYTES_PER_ELEMENT === 1 && v6_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 9 (argument 10 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v6_0)
    }
    if (!(v7_0.buffer instanceof ArrayBuffer && v7_0.BYTES_PER_ELEMENT === 1 && v7_0.length === 32)) {
      __compactRuntime.type_error('Contract state constructor',
                                  'argument 10 (argument 11 as invoked from Typescript)',
                                  'multisig-ism.compact line 75 char 1',
                                  'Bytes<32>',
                                  v7_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = stateValue_0;
    state_0.setOperation('verify', new __compactRuntime.ContractOperation());
    state_0.setOperation('getThreshold', new __compactRuntime.ContractOperation());
    state_0.setOperation('getValidatorCount', new __compactRuntime.ContractOperation());
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
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(1n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(2n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newMap(
                                        new __compactRuntime.StateMap()
                                      ).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(0n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(_threshold_0),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    Contract._query(context,
                    partialProofData,
                    [
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(1n),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(_validatorCount_0),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } }]);
    const tmp_0 = 0n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_0),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v0_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
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
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_1),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v1_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_2 = 2n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_2),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v2_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_3 = 3n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_3),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v3_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_4 = 4n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_4),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v4_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_5 = 5n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_5),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v5_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_6 = 6n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_6),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v6_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    const tmp_7 = 7n;
    Contract._query(context,
                    partialProofData,
                    [
                     { idx: { cached: false,
                              pushPath: true,
                              path: [
                                     { tag: 'value',
                                       value: { value: _descriptor_0.toValue(2n),
                                                alignment: _descriptor_0.alignment() } }] } },
                     { push: { storage: false,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(tmp_7),
                                                                            alignment: _descriptor_0.alignment() }).encode() } },
                     { push: { storage: true,
                               value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(v7_0),
                                                                            alignment: _descriptor_2.alignment() }).encode() } },
                     { ins: { cached: false, n: 1 } },
                     { ins: { cached: true, n: 1 } }]);
    state_0.data = context.transactionContext.state;
    return {
      currentContractState: state_0,
      currentPrivateState: context.currentPrivateState,
      currentZswapLocalState: context.currentZswapLocalState
    }
  }
  _computeCheckpointDigest_0(context, partialProofData, checkpoint_0) {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.computeCheckpointDigest(witnessContext_0,
                                                                                  checkpoint_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(result_0.buffer instanceof ArrayBuffer && result_0.BYTES_PER_ELEMENT === 1 && result_0.length === 32)) {
      __compactRuntime.type_error('computeCheckpointDigest',
                                  'return value',
                                  'multisig-ism.compact line 58 char 1',
                                  'Bytes<32>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_2.toValue(result_0),
      alignment: _descriptor_2.alignment()
    });
    return result_0;
  }
  _countValidSignatures_0(context,
                          partialProofData,
                          digest_0,
                          signatures_0,
                          signatureCount_0)
  {
    const witnessContext_0 = __compactRuntime.witnessContext(ledger(context.transactionContext.state), context.currentPrivateState, context.transactionContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.countValidSignatures(witnessContext_0,
                                                                               digest_0,
                                                                               signatures_0,
                                                                               signatureCount_0);
    context.currentPrivateState = nextPrivateState_0;
    if (!(typeof(result_0) === 'bigint' && result_0 >= 0n && result_0 <= 255n)) {
      __compactRuntime.type_error('countValidSignatures',
                                  'return value',
                                  'multisig-ism.compact line 62 char 1',
                                  'Uint<0..255>',
                                  result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_0.toValue(result_0),
      alignment: _descriptor_0.alignment()
    });
    return result_0;
  }
  _verify_0(context,
            partialProofData,
            origin_0,
            originMailbox_0,
            nonce_0,
            messageId_0,
            metadata_0)
  {
    const checkpoint_0 = { origin: origin_0,
                           originMailbox: originMailbox_0,
                           merkleRoot: metadata_0.merkleRoot,
                           nonce: nonce_0,
                           messageId: messageId_0 };
    const digest_0 = this._computeCheckpointDigest_0(context,
                                                     partialProofData,
                                                     checkpoint_0);
    const validCount_0 = this._countValidSignatures_0(context,
                                                      partialProofData,
                                                      digest_0,
                                                      metadata_0.signatures,
                                                      metadata_0.signatureCount);
    __compactRuntime.assert(validCount_0
                            >=
                            _descriptor_0.fromValue(Contract._query(context,
                                                                    partialProofData,
                                                                    [
                                                                     { dup: { n: 0 } },
                                                                     { idx: { cached: false,
                                                                              pushPath: false,
                                                                              path: [
                                                                                     { tag: 'value',
                                                                                       value: { value: _descriptor_0.toValue(0n),
                                                                                                alignment: _descriptor_0.alignment() } }] } },
                                                                     { popeq: { cached: false,
                                                                                result: undefined } }]).value),
                            'Signature threshold not met');
    return [];
  }
  _getThreshold_0(context, partialProofData) {
    return _descriptor_0.fromValue(Contract._query(context,
                                                   partialProofData,
                                                   [
                                                    { dup: { n: 0 } },
                                                    { idx: { cached: false,
                                                             pushPath: false,
                                                             path: [
                                                                    { tag: 'value',
                                                                      value: { value: _descriptor_0.toValue(0n),
                                                                               alignment: _descriptor_0.alignment() } }] } },
                                                    { popeq: { cached: false,
                                                               result: undefined } }]).value);
  }
  _getValidatorCount_0(context, partialProofData) {
    return _descriptor_0.fromValue(Contract._query(context,
                                                   partialProofData,
                                                   [
                                                    { dup: { n: 0 } },
                                                    { idx: { cached: false,
                                                             pushPath: false,
                                                             path: [
                                                                    { tag: 'value',
                                                                      value: { value: _descriptor_0.toValue(1n),
                                                                               alignment: _descriptor_0.alignment() } }] } },
                                                    { popeq: { cached: false,
                                                               result: undefined } }]).value);
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
    validators: {
      isEmpty(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`isEmpty: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_6.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_0.toValue(2n),
                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                        'size',
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_5.toValue(0n),
                                                                                                               alignment: _descriptor_5.alignment() }).encode() } },
                                                        'eq',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      size(...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`size: expected 0 arguments, received ${args_0.length}`);
        }
        return _descriptor_5.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_0.toValue(2n),
                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                        'size',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      member(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`member: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 255n)) {
          __compactRuntime.type_error('member',
                                      'argument 1',
                                      'multisig-ism.compact line 29 char 1',
                                      'Uint<0..255>',
                                      key_0)
        }
        return _descriptor_6.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_0.toValue(2n),
                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                        { push: { storage: false,
                                                                  value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(key_0),
                                                                                                               alignment: _descriptor_0.alignment() }).encode() } },
                                                        'member',
                                                        { popeq: { cached: true,
                                                                   result: undefined } }]).value);
      },
      lookup(...args_0) {
        if (args_0.length !== 1) {
          throw new __compactRuntime.CompactError(`lookup: expected 1 argument, received ${args_0.length}`);
        }
        const key_0 = args_0[0];
        if (!(typeof(key_0) === 'bigint' && key_0 >= 0n && key_0 <= 255n)) {
          __compactRuntime.type_error('lookup',
                                      'argument 1',
                                      'multisig-ism.compact line 29 char 1',
                                      'Uint<0..255>',
                                      key_0)
        }
        return _descriptor_2.fromValue(Contract._query(context,
                                                       partialProofData,
                                                       [
                                                        { dup: { n: 0 } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_0.toValue(2n),
                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                        { idx: { cached: false,
                                                                 pushPath: false,
                                                                 path: [
                                                                        { tag: 'value',
                                                                          value: { value: _descriptor_0.toValue(key_0),
                                                                                   alignment: _descriptor_0.alignment() } }] } },
                                                        { popeq: { cached: false,
                                                                   result: undefined } }]).value);
      },
      [Symbol.iterator](...args_0) {
        if (args_0.length !== 0) {
          throw new __compactRuntime.CompactError(`iter: expected 0 arguments, received ${args_0.length}`);
        }
        const self_0 = state.asArray()[2];
        return self_0.asMap().keys().map(  (key) => {    const value = self_0.asMap().get(key).asCell();    return [      _descriptor_0.fromValue(key.value),      _descriptor_2.fromValue(value.value)    ];  })[Symbol.iterator]();
      }
    }
  };
}
const _emptyContext = {
  originalState: new __compactRuntime.ContractState(),
  transactionContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress())
};
const _dummyContract = new Contract({
  computeCheckpointDigest: (...args) => undefined,
  countValidSignatures: (...args) => undefined
});
const pureCircuits = {};
const contractReferenceLocations = { tag: 'publicLedgerArray', indices: { } };
exports.Contract = Contract;
exports.ledger = ledger;
exports.pureCircuits = pureCircuits;
exports.contractReferenceLocations = contractReferenceLocations;
//# sourceMappingURL=index.cjs.map
