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

    /// Quote gas payment for a destination
    Quote {
        /// Destination domain ID
        #[arg(long)]
        destination: u32,

        /// Gas amount to quote (uses default_gas_limit if not provided)
        #[arg(long)]
        gas_amount: Option<u64>,

        /// IGP state NFT policy ID (defaults to deployment info)
        #[arg(long)]
        igp_policy: Option<String>,
    },
}

pub async fn execute(ctx: &CliContext, args: IgpArgs) -> Result<()> {
    match args.command {
        IgpCommands::Show { igp_policy } => show_igp(ctx, igp_policy).await,
        IgpCommands::Quote {
            destination,
            gas_amount,
            igp_policy,
        } => quote_gas(ctx, destination, gas_amount, igp_policy).await,
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

async fn quote_gas(
    ctx: &CliContext,
    destination: u32,
    gas_amount: Option<u64>,
    igp_policy: Option<String>,
) -> Result<()> {
    println!("{}", "IGP Gas Quote".cyan());

    let policy_id = get_igp_policy(ctx, igp_policy)?;
    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    // Find IGP UTXO by state NFT
    let igp_utxo = client
        .find_utxo_by_asset(&policy_id, "")
        .await?
        .ok_or_else(|| anyhow!("IGP UTXO not found with policy {}", policy_id))?;

    // Parse the datum
    let datum = igp_utxo
        .inline_datum
        .as_ref()
        .ok_or_else(|| anyhow!("IGP UTXO has no inline datum"))?;

    let (_, _, gas_oracles, default_gas_limit) = parse_igp_datum(datum)?;

    // Determine effective gas amount
    let effective_gas = gas_amount.unwrap_or(default_gas_limit);

    // Find oracle for destination
    let oracle = gas_oracles.iter().find(|(d, _, _)| *d == destination);

    println!("\n{}", format!("Quote for destination {}:", destination).green());
    println!("  Gas amount: {}", format_number(effective_gas));

    let (gas_price, exchange_rate, required_lovelace) = match oracle {
        Some((_, gp, er)) => {
            let lovelace = calculate_gas_payment(effective_gas, *gp, *er);
            (*gp, *er, lovelace)
        }
        None => {
            // Use default values (same as contract)
            let default_gas_price = 1u64;
            let default_exchange_rate = 1_000_000u64;
            let lovelace = calculate_gas_payment(effective_gas, default_gas_price, default_exchange_rate);
            println!(
                "  {}",
                "Warning: No oracle configured for this destination, using defaults".yellow()
            );
            (default_gas_price, default_exchange_rate, lovelace)
        }
    };

    println!("  Gas price: {}", format_number(gas_price));
    println!("  Exchange rate: {}", format_number(exchange_rate));
    println!(
        "\n{} {} ADA ({} lovelace)",
        "Required payment:".green().bold(),
        required_lovelace as f64 / 1_000_000.0,
        format_number(required_lovelace)
    );

    Ok(())
}

/// Calculate gas payment in lovelace
/// Formula: gas_amount * gas_price * token_exchange_rate / 1_000_000_000_000
fn calculate_gas_payment(gas_amount: u64, gas_price: u64, exchange_rate: u64) -> u64 {
    // Use u128 to avoid overflow during multiplication
    let numerator = gas_amount as u128 * gas_price as u128 * exchange_rate as u128;
    (numerator / 1_000_000_000_000u128) as u64
}

/// Format a number with thousand separators
fn format_number(n: u64) -> String {
    let s = n.to_string();
    let mut result = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.push(',');
        }
        result.push(c);
    }
    result.chars().rev().collect()
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

    // Tests for calculate_gas_payment
    #[test]
    fn test_calculate_gas_payment_basic() {
        // 200,000 gas * 25,000,000,000 gas_price * 1,000,000 exchange_rate / 1e12
        // = 200,000 * 25,000,000,000 * 1,000,000 / 1,000,000,000,000
        // = 5,000,000,000,000,000,000,000 / 1,000,000,000,000
        // = 5,000,000,000 lovelace = 5000 ADA
        let result = calculate_gas_payment(200_000, 25_000_000_000, 1_000_000);
        assert_eq!(result, 5_000_000_000);
    }

    #[test]
    fn test_calculate_gas_payment_with_defaults() {
        // Using default oracle values from contract: gas_price=1, exchange_rate=1,000,000
        // 200,000 * 1 * 1,000,000 / 1e12 = 200,000,000,000 / 1e12 = 0.2 (rounds to 0)
        let result = calculate_gas_payment(200_000, 1, 1_000_000);
        assert_eq!(result, 0);
    }

    #[test]
    fn test_calculate_gas_payment_large_values() {
        // Test with large values to ensure no overflow
        let result = calculate_gas_payment(1_000_000, 100_000_000_000, 2_000_000);
        // 1,000,000 * 100,000,000,000 * 2,000,000 / 1e12
        // = 200,000,000,000,000,000,000,000 / 1e12
        // = 200,000,000,000 lovelace
        assert_eq!(result, 200_000_000_000);
    }

    #[test]
    fn test_calculate_gas_payment_zero_gas() {
        let result = calculate_gas_payment(0, 25_000_000_000, 1_000_000);
        assert_eq!(result, 0);
    }

    #[test]
    fn test_calculate_gas_payment_different_rates() {
        // Sepolia example: 30 gwei gas price, 1.2x exchange rate
        // 200,000 * 30,000,000,000 * 1,200,000 / 1e12
        // = 7,200,000,000,000,000,000,000 / 1e12
        // = 7,200,000,000 lovelace = 7200 ADA
        let result = calculate_gas_payment(200_000, 30_000_000_000, 1_200_000);
        assert_eq!(result, 7_200_000_000);
    }

    // Tests for format_number
    #[test]
    fn test_format_number_small() {
        assert_eq!(format_number(0), "0");
        assert_eq!(format_number(1), "1");
        assert_eq!(format_number(12), "12");
        assert_eq!(format_number(123), "123");
    }

    #[test]
    fn test_format_number_thousands() {
        assert_eq!(format_number(1_000), "1,000");
        assert_eq!(format_number(12_345), "12,345");
        assert_eq!(format_number(123_456), "123,456");
    }

    #[test]
    fn test_format_number_millions() {
        assert_eq!(format_number(1_000_000), "1,000,000");
        assert_eq!(format_number(5_000_000), "5,000,000");
        assert_eq!(format_number(123_456_789), "123,456,789");
    }

    #[test]
    fn test_format_number_large() {
        assert_eq!(format_number(25_000_000_000), "25,000,000,000");
        assert_eq!(format_number(1_000_000_000_000), "1,000,000,000,000");
    }
}
