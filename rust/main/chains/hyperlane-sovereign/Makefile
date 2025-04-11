DA=../../target/debug/sov-hl-demo-rollup
ROLLUP_DIR=../../../../../sovereign-sdk-wip/examples/demo-hl-rollup
TX_SUBMIT=../../target/debug/txsubmit
REGISTER_MERKLE=register-merkle-tree-hook
REGISTER_RECIPIENT=register-test-recipient --ism-addr sov1088zwzenahljwddu77wzws0xjjdrprfr8amvx3wp93ers8er0w9
CREATE_ISM=create-ism message-id-multisig --validators 14dC79964da2C08b23698B3D3cc7Ca32193d9955 --threshold 1
DISPATCH_MESSAGE=dispatch-message 54321 0x000000003e734a45a54c76add3ce38070db1c6eb29af168effa59dc239e90d50 0xdeadbeef

export TOKEN_KEY_FILE=../../../../../sov-hyperlane/examples/test-data/keys/token_deployer_private_key.json

test:
	cd $(ROLLUP_DIR) && $(TX_SUBMIT) $(REGISTER_MERKLE); \
	$(TX_SUBMIT) $(REGISTER_RECIPIENT); \
	$(TX_SUBMIT) $(CREATE_ISM); \
	$(TX_SUBMIT) $(DISPATCH_MESSAGE); \
	
	cargo nextest run --no-fail-fast;
