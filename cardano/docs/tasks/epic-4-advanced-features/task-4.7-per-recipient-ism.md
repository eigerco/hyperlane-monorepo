[← Epic 4: Advanced Features](./EPIC.md) | [Epics Overview](../README.md)

# Task 4.7: Per-Recipient ISM

**Status:** ⬜ Not Started
**Complexity:** Medium
**Depends On:** -

## Objective

Allow Cardano recipients to specify a custom Interchain Security Module (ISM), overriding the mailbox's default ISM. This brings parity with EVM's `interchainSecurityModule()` pattern.

## Background

On EVM, any recipient contract can implement:

```solidity
function interchainSecurityModule() external view returns (IInterchainSecurityModule);
```

The mailbox calls this before processing a message. If the recipient returns a non-zero address, that ISM is used instead of the default.

On Cardano, Plutus scripts cannot call each other via staticcall. A different mechanism is needed.

## Current State

The mailbox hardcodes the default ISM for all recipients:

```aiken
// In mailbox.ak
fn get_recipient_ism(_recipient, default_ism, _tx) -> ScriptHash {
  default_ism  // Always returns default, recipient ignored
}
```

## Design: ISM Config UTXO (Opt-In)

Recipients that want a custom ISM deploy an **ISM config UTXO** at their script address. The mailbox checks for this UTXO during `process` and uses the specified ISM if found.

### ISM Config NFT Policy

A well-known minting policy (`ism_config_nft`) identifies ISM config UTXOs. The policy enforces that the minting TX spends a UTXO at the recipient's script address, proving the recipient authorized the config.

```
┌─────────────────────────────────────────────────────────────┐
│  ISM Config UTXO (sits at recipient's script address)       │
│                                                             │
│  Value:                                                     │
│    - min ADA                                                │
│    - 1x ism_config_nft (asset name = recipient script hash) │
│                                                             │
│  Datum (IsmConfigDatum):                                    │
│    - ism_script_hash: ScriptHash  // custom ISM to use      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Lookup Flow

```
process(message, metadata):
  1. recipient = message.recipient
  2. Scan reference_inputs for UTXO with ism_config_nft at recipient address
  3. If found → parse IsmConfigDatum → use ism_script_hash
  4. If not found → use mailbox default_ism
  5. Verify message against chosen ISM
```

### Security: Minting Policy Authorization

The `ism_config_nft` minting policy must prevent unauthorized ISM config creation. Without this, an attacker could place a fake ISM config at a victim's address.

```aiken
validator ism_config_nft {
  mint(redeemer: IsmConfigRedeemer, own_policy: PolicyId, tx: Transaction) {
    when redeemer is {
      // Minting: require spending a UTXO at the recipient's script address
      MintConfig { recipient_script_hash } -> {
        let asset_name = recipient_script_hash
        // Verify a UTXO at the recipient address is spent in this TX
        expect list.any(tx.inputs, fn(input) {
          let cred = input.output.address.payment_credential
          cred == ScriptCredential(recipient_script_hash)
        })
        // Verify exactly 1 NFT minted with correct asset name
        let minted = assets.tokens(tx.mint, own_policy)
        dict.to_pairs(minted) == [Pair(asset_name, 1)]
      }
      // Burning: always allowed (recipient removes their config)
      BurnConfig -> {
        let minted = assets.tokens(tx.mint, own_policy)
        list.all(dict.to_pairs(minted), fn(pair) { pair.2nd < 0 })
      }
    }
  }
  else(_) { fail }
}
```

This ensures only the recipient script itself can authorize its ISM config, since spending a UTXO at a script address requires satisfying that script's validator.

## Implementation

### 1. Aiken: `ism_config_nft.ak`

New minting policy as described above. Parameters: none (standalone policy).

Datum type:

```aiken
type IsmConfigDatum {
  ism_script_hash: ByteArray,
}
```

### 2. Aiken: Update `mailbox.ak`

Add `ism_config_nft_policy` parameter to mailbox (or to `processed_message_nft` if Task 4.5 is done first).

Update `get_recipient_ism`:

```aiken
fn get_recipient_ism(
  recipient: HyperlaneAddress,
  default_ism: ScriptHash,
  ism_config_policy: PolicyId,
  tx: Transaction,
) -> ScriptHash {
  let recipient_hash = bytearray.drop(recipient, 4)
  // Check reference inputs for ISM config UTXO
  let config = list.find(tx.reference_inputs, fn(ref_input) {
    let has_nft = assets.quantity_of(
      ref_input.output.value,
      ism_config_policy,
      recipient_hash,
    ) > 0
    let at_recipient = ref_input.output.address.payment_credential
      == ScriptCredential(recipient_hash)
    has_nft && at_recipient
  })
  when config is {
    Some(ref_input) -> {
      expect datum: IsmConfigDatum = parse_inline_datum(ref_input.output)
      datum.ism_script_hash
    }
    None -> default_ism
  }
}
```

### 3. CLI: Deploy ISM Config NFT

New `init ism-config` command to deploy the minting policy and register its reference script.

### 4. CLI: Set Recipient ISM

New command `recipient set-ism` (or extend `greeting set-ism`) to:
1. Spend a UTXO at the recipient script address
2. Mint `ism_config_nft` with asset name = recipient script hash
3. Create UTXO at recipient address with `IsmConfigDatum`

### 5. Relayer: Include ISM Config as Reference Input

Update `tx_builder.rs` to:
1. Query recipient address for UTXO containing `ism_config_nft`
2. If found, add as reference input in process TX
3. Use the custom ISM's reference script and datum for verification

### 6. Relayer: ISM Resolution in `interchain_security_module()`

Update `CardanoMailbox::default_ism()` or add per-message ISM resolution that checks for ISM config UTXOs via Blockfrost before building the process TX.

## Files to Modify

| File | Changes |
|------|---------|
| `cardano/contracts/validators/ism_config_nft.ak` | New minting policy |
| `cardano/contracts/lib/types.ak` | `IsmConfigDatum`, `IsmConfigRedeemer` |
| `cardano/contracts/validators/mailbox.ak` | `get_recipient_ism` with config lookup |
| `cardano/cli/src/commands/init.rs` | Deploy ISM config NFT policy |
| `cardano/cli/src/commands/recipient.rs` | New `set-ism` command |
| `rust/main/chains/hyperlane-cardano/src/tx_builder.rs` | ISM config reference input |
| `rust/main/chains/hyperlane-cardano/src/mailbox.rs` | Per-message ISM resolution |

## Testing

| Test Case | Expected Result |
|-----------|-----------------|
| No ISM config UTXO | Default ISM used |
| Valid ISM config UTXO at recipient | Custom ISM used |
| ISM config with wrong asset name | Ignored (falls back to default) |
| ISM config at wrong address | Ignored (falls back to default) |
| Unauthorized mint attempt | Minting policy rejects TX |
| Burn ISM config | Reverts to default ISM |
| E2E: greeting with custom ISM | Message verified by custom ISM |

## Interaction with Task 4.5

If Task 4.5 (parallel processing) is implemented first, the ISM config lookup moves to the `processed_message_nft` minting policy instead of `mailbox.ak`. The design is the same — scan reference inputs for the ISM config UTXO.

If this task is done first, the lookup goes in `mailbox.ak` and migrates to the minting policy when Task 4.5 lands.

## Definition of Done

- [ ] `ism_config_nft` minting policy deployed
- [ ] Recipients can set a custom ISM via CLI
- [ ] Mailbox uses custom ISM when config UTXO exists
- [ ] Relayer includes ISM config as reference input
- [ ] Default ISM fallback works when no config exists
- [ ] Authorization enforced (only recipient can set its ISM)
- [ ] E2E test with custom ISM

## Acceptance Criteria

1. Recipient with ISM config UTXO gets messages verified by their chosen ISM
2. Recipients without config continue using default ISM (no regression)
3. Only the recipient script can authorize ISM config creation
4. Relayer automatically detects and includes ISM config reference inputs
