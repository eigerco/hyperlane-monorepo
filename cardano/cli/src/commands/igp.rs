//! IGP command - Manage Interchain Gas Paymaster

use anyhow::{anyhow, Result};
use clap::{Args, Subcommand};
use colored::Colorize;

use crate::utils::blockfrost::BlockfrostClient;
use crate::utils::context::CliContext;

#[derive(Args)]
pub struct IgpArgs {
    #[command(subcommand)]
    command: IgpCommands,
}

#[derive(Subcommand)]
enum IgpCommands {
    /// Show IGP state and configuration
    Show {
        /// IGP state NFT policy ID (defaults to deployment info)
        #[arg(long)]
        igp_policy: Option<String>,
    },
}

pub async fn execute(ctx: &CliContext, args: IgpArgs) -> Result<()> {
    match args.command {
        IgpCommands::Show { igp_policy } => show_igp(ctx, igp_policy).await,
    }
}

async fn show_igp(ctx: &CliContext, igp_policy: Option<String>) -> Result<()> {
    println!("{}", "IGP State".cyan());

    let policy_id = get_igp_policy(ctx, igp_policy)?;
    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    // Find IGP UTXO by state NFT
    let igp_utxo = client
        .find_utxo_by_asset(&policy_id, "")
        .await?
        .ok_or_else(|| anyhow!("IGP UTXO not found with policy {}", policy_id))?;

    println!("\n{}", "IGP UTXO:".green());
    println!("  TX: {}#{}", igp_utxo.tx_hash, igp_utxo.output_index);
    println!("  Address: {}", igp_utxo.address);
    println!(
        "  Balance: {} ADA ({} lovelace)",
        igp_utxo.lovelace as f64 / 1_000_000.0,
        igp_utxo.lovelace
    );

    // Parse the datum
    let datum = igp_utxo
        .inline_datum
        .as_ref()
        .ok_or_else(|| anyhow!("IGP UTXO has no inline datum"))?;

    match parse_igp_datum(datum) {
        Ok((owner, beneficiary, gas_oracles, default_gas_limit)) => {
            println!("\n{}", "Configuration:".green());
            println!("  Owner: {}", hex::encode(&owner));
            println!("  Beneficiary: {}", hex::encode(&beneficiary));
            println!("  Default Gas Limit: {}", default_gas_limit);

            println!("\n{}", "Gas Oracles:".green());
            if gas_oracles.is_empty() {
                println!("  (none configured)");
            } else {
                for (domain, gas_price, exchange_rate) in &gas_oracles {
                    println!("  Domain {}:", domain);
                    println!("    Gas Price: {}", gas_price);
                    println!("    Exchange Rate: {}", exchange_rate);
                }
            }

            // Show claimable balance
            let min_utxo = 5_000_000u64;
            let claimable = igp_utxo.lovelace.saturating_sub(min_utxo);
            println!("\n{}", "Claimable Fees:".green());
            println!(
                "  {} ADA ({} lovelace)",
                claimable as f64 / 1_000_000.0,
                claimable
            );
        }
        Err(e) => {
            println!("\n{}", "Raw Datum:".yellow());
            println!("{}", serde_json::to_string_pretty(datum)?);
            println!("\n{}", format!("Could not parse datum: {}", e).yellow());
        }
    }

    Ok(())
}

fn get_igp_policy(ctx: &CliContext, igp_policy: Option<String>) -> Result<String> {
    if let Some(p) = igp_policy {
        return Ok(p);
    }

    let deployment = ctx.load_deployment_info()?;
    deployment
        .igp
        .and_then(|i| i.state_nft_policy)
        .ok_or_else(|| anyhow!("IGP policy not found. Use --igp-policy or initialize IGP first"))
}

/// Parse IGP datum, returns (owner, beneficiary, gas_oracles, default_gas_limit)
fn parse_igp_datum(
    datum: &serde_json::Value,
) -> Result<(Vec<u8>, Vec<u8>, Vec<(u32, u64, u64)>, u64)> {
    // Check if datum is raw CBOR hex
    if let Some(hex_str) = datum.as_str() {
        let decoded = crate::utils::cbor::decode_plutus_datum(hex_str)?;
        return parse_igp_datum(&decoded);
    }

    let fields = datum
        .get("fields")
        .and_then(|f| f.as_array())
        .ok_or_else(|| anyhow!("Invalid IGP datum structure"))?;

    if fields.len() < 4 {
        return Err(anyhow!("IGP datum must have 4 fields"));
    }

    // owner (field 0)
    let owner = hex::decode(
        fields[0]
            .get("bytes")
            .and_then(|b| b.as_str())
            .ok_or_else(|| anyhow!("Invalid owner"))?,
    )?;

    // beneficiary (field 1)
    let beneficiary = hex::decode(
        fields[1]
            .get("bytes")
            .and_then(|b| b.as_str())
            .ok_or_else(|| anyhow!("Invalid beneficiary"))?,
    )?;

    // gas_oracles (field 2)
    let mut gas_oracles = Vec::new();
    if let Some(list) = fields[2].get("list").and_then(|l| l.as_array()) {
        for entry in list {
            let items: Vec<&serde_json::Value> = entry
                .get("list")
                .and_then(|l| l.as_array())
                .map(|a| a.iter().collect())
                .unwrap_or_default();

            if items.len() >= 2 {
                let domain = items[0].get("int").and_then(|i| i.as_u64()).unwrap_or(0) as u32;
                let oracle_fields = items[1].get("fields").and_then(|f| f.as_array());
                if let Some(of) = oracle_fields {
                    if of.len() >= 2 {
                        let gas_price = of[0].get("int").and_then(|i| i.as_u64()).unwrap_or(0);
                        let exchange_rate = of[1].get("int").and_then(|i| i.as_u64()).unwrap_or(0);
                        gas_oracles.push((domain, gas_price, exchange_rate));
                    }
                }
            }
        }
    }

    // default_gas_limit (field 3)
    let default_gas_limit = fields[3].get("int").and_then(|i| i.as_u64()).unwrap_or(0);

    Ok((owner, beneficiary, gas_oracles, default_gas_limit))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_parse_igp_datum_basic() {
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"bytes": "1212a023380020f8c7b94b831e457b9ee65f009df9d1d588430dcc89"},
                {"bytes": "1212a023380020f8c7b94b831e457b9ee65f009df9d1d588430dcc89"},
                {"list": []},
                {"int": 200000}
            ]
        });

        let (owner, beneficiary, gas_oracles, default_gas_limit) =
            parse_igp_datum(&datum).unwrap();

        assert_eq!(
            hex::encode(&owner),
            "1212a023380020f8c7b94b831e457b9ee65f009df9d1d588430dcc89"
        );
        assert_eq!(
            hex::encode(&beneficiary),
            "1212a023380020f8c7b94b831e457b9ee65f009df9d1d588430dcc89"
        );
        assert!(gas_oracles.is_empty());
        assert_eq!(default_gas_limit, 200000);
    }

    #[test]
    fn test_parse_igp_datum_with_oracles() {
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"bytes": "aabbccdd"},
                {"bytes": "11223344"},
                {
                    "list": [
                        {
                            "list": [
                                {"int": 43113},
                                {
                                    "constructor": 0,
                                    "fields": [
                                        {"int": 25000000000_u64},
                                        {"int": 1000000}
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {"int": 150000}
            ]
        });

        let (owner, beneficiary, gas_oracles, default_gas_limit) =
            parse_igp_datum(&datum).unwrap();

        assert_eq!(hex::encode(&owner), "aabbccdd");
        assert_eq!(hex::encode(&beneficiary), "11223344");
        assert_eq!(gas_oracles.len(), 1);
        assert_eq!(gas_oracles[0], (43113, 25000000000, 1000000));
        assert_eq!(default_gas_limit, 150000);
    }

    #[test]
    fn test_parse_igp_datum_multiple_oracles() {
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"bytes": "aabbccdd"},
                {"bytes": "11223344"},
                {
                    "list": [
                        {
                            "list": [
                                {"int": 43113},
                                {
                                    "constructor": 0,
                                    "fields": [
                                        {"int": 25000000000_u64},
                                        {"int": 1000000}
                                    ]
                                }
                            ]
                        },
                        {
                            "list": [
                                {"int": 11155111},
                                {
                                    "constructor": 0,
                                    "fields": [
                                        {"int": 30000000000_u64},
                                        {"int": 1200000}
                                    ]
                                }
                            ]
                        }
                    ]
                },
                {"int": 200000}
            ]
        });

        let (_, _, gas_oracles, _) = parse_igp_datum(&datum).unwrap();

        assert_eq!(gas_oracles.len(), 2);
        assert_eq!(gas_oracles[0], (43113, 25000000000, 1000000));
        assert_eq!(gas_oracles[1], (11155111, 30000000000, 1200000));
    }

    #[test]
    fn test_parse_igp_datum_missing_fields() {
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"bytes": "aabbccdd"},
                {"bytes": "11223344"}
            ]
        });

        let result = parse_igp_datum(&datum);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("must have 4 fields"));
    }

    #[test]
    fn test_parse_igp_datum_invalid_structure() {
        let datum = json!({
            "invalid": "structure"
        });

        let result = parse_igp_datum(&datum);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid IGP datum structure"));
    }

    #[test]
    fn test_parse_igp_datum_invalid_owner() {
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"int": 123},
                {"bytes": "11223344"},
                {"list": []},
                {"int": 200000}
            ]
        });

        let result = parse_igp_datum(&datum);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid owner"));
    }

    #[test]
    fn test_parse_igp_datum_invalid_beneficiary() {
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"bytes": "aabbccdd"},
                {"int": 456},
                {"list": []},
                {"int": 200000}
            ]
        });

        let result = parse_igp_datum(&datum);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid beneficiary"));
    }

    #[test]
    fn test_parse_igp_datum_empty_oracle_list_items() {
        // Test with malformed oracle entries that should be skipped
        let datum = json!({
            "constructor": 0,
            "fields": [
                {"bytes": "aabbccdd"},
                {"bytes": "11223344"},
                {
                    "list": [
                        {"list": []},
                        {"list": [{"int": 1}]}
                    ]
                },
                {"int": 200000}
            ]
        });

        let (_, _, gas_oracles, _) = parse_igp_datum(&datum).unwrap();
        // Malformed entries should be skipped
        assert!(gas_oracles.is_empty());
    }
}
