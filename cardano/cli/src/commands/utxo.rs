//! UTXO command - UTXO management utilities

use anyhow::{anyhow, Result};
use clap::{Args, Subcommand};
use colored::Colorize;
use pallas_txbuilder::{BuildConway, Output, StagingTransaction};

use crate::utils::blockfrost::BlockfrostClient;
use crate::utils::context::CliContext;

#[derive(Args)]
pub struct UtxoArgs {
    #[command(subcommand)]
    command: UtxoCommands,
}

#[derive(Subcommand)]
enum UtxoCommands {
    /// List UTXOs at wallet address
    List {
        /// Show only UTXOs suitable for collateral (ADA only, no assets)
        #[arg(long)]
        collateral: bool,

        /// Minimum lovelace amount
        #[arg(long)]
        min_lovelace: Option<u64>,
    },

    /// Split a UTXO into multiple smaller ones
    Split {
        /// Source UTXO (tx_hash#index)
        #[arg(long)]
        utxo: String,

        /// Number of outputs
        #[arg(long, default_value = "5")]
        count: u32,

        /// Amount per output (default: evenly split)
        #[arg(long)]
        amount: Option<u64>,

        /// Dry run
        #[arg(long)]
        dry_run: bool,
    },

    /// Consolidate multiple UTXOs into one
    Consolidate {
        /// Maximum UTXOs to consolidate
        #[arg(long, default_value = "10")]
        max: u32,

        /// Dry run
        #[arg(long)]
        dry_run: bool,
    },

    /// Find a suitable UTXO for an operation
    Find {
        /// Minimum lovelace required
        #[arg(long, default_value = "5000000")]
        min_lovelace: u64,

        /// Must have no assets (pure ADA)
        #[arg(long)]
        no_assets: bool,

        /// Must have inline datum
        #[arg(long)]
        with_datum: bool,
    },

    /// Show detailed info about a UTXO
    Info {
        /// UTXO reference (tx_hash#index)
        utxo: String,
    },

    /// Send ADA to another address
    Send {
        /// Destination address (bech32)
        #[arg(long)]
        to: String,

        /// Amount in lovelace
        #[arg(long)]
        amount: u64,

        /// Dry run
        #[arg(long)]
        dry_run: bool,
    },
}

pub async fn execute(ctx: &CliContext, args: UtxoArgs) -> Result<()> {
    match args.command {
        UtxoCommands::List {
            collateral,
            min_lovelace,
        } => list(ctx, collateral, min_lovelace).await,
        UtxoCommands::Split {
            utxo,
            count,
            amount,
            dry_run,
        } => split(ctx, &utxo, count, amount, dry_run).await,
        UtxoCommands::Consolidate { max, dry_run } => consolidate(ctx, max, dry_run).await,
        UtxoCommands::Find {
            min_lovelace,
            no_assets,
            with_datum,
        } => find(ctx, min_lovelace, no_assets, with_datum).await,
        UtxoCommands::Info { utxo } => info(ctx, &utxo).await,
        UtxoCommands::Send {
            to,
            amount,
            dry_run,
        } => send(ctx, &to, amount, dry_run).await,
    }
}

async fn list(ctx: &CliContext, collateral: bool, min_lovelace: Option<u64>) -> Result<()> {
    println!("{}", "Listing wallet UTXOs...".cyan());

    let keypair = ctx.load_signing_key()?;
    let address = keypair.address_bech32(ctx.pallas_network());

    println!("Address: {}", address);

    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    let utxos = client.get_utxos(&address).await?;

    let filtered: Vec<_> = utxos
        .iter()
        .filter(|u| {
            // For collateral, exclude UTXOs with assets or reference scripts
            if collateral && (!u.assets.is_empty() || u.reference_script.is_some()) {
                return false;
            }
            if let Some(min) = min_lovelace {
                if u.lovelace < min {
                    return false;
                }
            }
            true
        })
        .collect();

    println!("\n{} UTXOs found ({} after filtering):", utxos.len(), filtered.len());
    println!("{}", "-".repeat(100));

    for utxo in &filtered {
        let assets_info = if utxo.assets.is_empty() {
            "".to_string()
        } else {
            format!(" + {} assets", utxo.assets.len())
        };

        let datum_info = if utxo.inline_datum.is_some() {
            " [datum]".yellow().to_string()
        } else {
            "".to_string()
        };

        println!(
            "{}#{:<3} {:>15} lovelace{}{}",
            &utxo.tx_hash[..16],
            utxo.output_index,
            utxo.lovelace,
            assets_info,
            datum_info
        );
    }

    let total: u64 = filtered.iter().map(|u| u.lovelace).sum();
    println!("\nTotal: {} lovelace ({:.6} ADA)", total, total as f64 / 1_000_000.0);

    if collateral {
        println!("\n{}", "Tip:".yellow());
        println!("Use the first UTXO as collateral for script transactions.");
    }

    Ok(())
}

async fn split(
    ctx: &CliContext,
    utxo_ref: &str,
    count: u32,
    amount: Option<u64>,
    dry_run: bool,
) -> Result<()> {
    println!("{}", "Splitting UTXO...".cyan());

    let parts: Vec<&str> = utxo_ref.split('#').collect();
    if parts.len() != 2 {
        return Err(anyhow!("Invalid UTXO format. Use tx_hash#index"));
    }

    let tx_hash = parts[0];
    let output_index: u32 = parts[1].parse()?;

    println!("  Source: {}#{}", tx_hash, output_index);
    println!("  Outputs: {}", count);

    let keypair = ctx.load_signing_key()?;
    let address = keypair.address_bech32(ctx.pallas_network());

    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    let utxos = client.get_utxos(&address).await?;
    let source_utxo = utxos
        .iter()
        .find(|u| u.tx_hash == tx_hash && u.output_index == output_index)
        .ok_or_else(|| anyhow!("UTXO not found at wallet address"))?;

    let fee = 200_000u64; // Conservative fee estimate
    let available = source_utxo.lovelace - fee;

    let per_output = match amount {
        Some(a) => a,
        None => available / count as u64,
    };

    println!("  Source lovelace: {}", source_utxo.lovelace);
    println!("  Per output: {}", per_output);
    println!("  Total outputs value: {}", per_output * count as u64);
    println!("  Fee (estimate): {}", fee);

    if per_output < 1_000_000 {
        return Err(anyhow!(
            "Output too small ({}). Minimum is 1 ADA.",
            per_output
        ));
    }

    if dry_run {
        println!("\n{}", "[Dry run - not submitting transaction]".yellow());
        println!("\nWould create {} outputs of {} lovelace each", count, per_output);
        return Ok(());
    }

    // Build the transaction
    println!("\n{}", "Building transaction...".cyan());

    let mut staging = StagingTransaction::new();

    // Add input
    let input_tx_hash: [u8; 32] = hex::decode(tx_hash)?
        .try_into()
        .map_err(|_| anyhow!("Invalid tx hash length"))?;
    staging = staging.input(pallas_txbuilder::Input::new(
        pallas_crypto::hash::Hash::from(input_tx_hash),
        output_index as u64,
    ));

    // Parse address
    let pallas_addr = pallas_addresses::Address::from_bech32(&address)
        .map_err(|e| anyhow!("Invalid address: {:?}", e))?;

    // Add outputs
    for _ in 0..count {
        staging = staging.output(Output::new(pallas_addr.clone(), per_output));
    }

    // Add change output for remainder
    let total_outputs = per_output * count as u64;
    let remainder = source_utxo.lovelace - total_outputs - fee;
    if remainder > 1_000_000 {
        staging = staging.output(Output::new(pallas_addr.clone(), remainder));
    }

    // Set fee and network
    staging = staging.fee(fee);
    staging = staging.network_id(ctx.network_id());

    // Build the transaction
    let tx = staging
        .build_conway_raw()
        .map_err(|e| anyhow!("Failed to build transaction: {:?}", e))?;

    println!("  TX Hash: {}", hex::encode(&tx.tx_hash.0));

    // Sign the transaction
    println!("{}", "Signing transaction...".cyan());
    let tx_hash_bytes: &[u8] = &tx.tx_hash.0;
    let signature = keypair.sign(tx_hash_bytes);
    let signed_tx = tx
        .add_signature(keypair.pallas_public_key().clone(), signature)
        .map_err(|e| anyhow!("Failed to sign transaction: {:?}", e))?;

    // Submit the transaction
    println!("{}", "Submitting transaction...".cyan());
    let submitted_tx_hash = client.submit_tx(&signed_tx.tx_bytes.0).await?;

    println!("\n{}", "SUCCESS!".green().bold());
    println!("  Transaction Hash: {}", submitted_tx_hash);
    println!("  Explorer: {}", ctx.explorer_tx_url(&submitted_tx_hash));
    println!("\n{}", "Created UTXOs:".cyan());
    for i in 0..count {
        println!("  {}#{}", submitted_tx_hash, i);
    }
    println!(
        "\nWait for confirmation, then check if any UTXO tx_hash < bc68..."
    );

    Ok(())
}

async fn consolidate(ctx: &CliContext, max: u32, dry_run: bool) -> Result<()> {
    println!("{}", "Consolidating UTXOs...".cyan());

    let keypair = ctx.load_signing_key()?;
    let address = keypair.address_bech32(ctx.pallas_network());

    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    let utxos = client.get_utxos(&address).await?;

    // Filter to pure ADA UTXOs (no assets, no datums, no reference scripts)
    let pure_ada: Vec<_> = utxos
        .iter()
        .filter(|u| u.assets.is_empty() && u.inline_datum.is_none() && u.reference_script.is_none())
        .take(max as usize)
        .collect();

    if pure_ada.len() < 2 {
        println!("{}", "Not enough UTXOs to consolidate (need at least 2)".yellow());
        return Ok(());
    }

    let total: u64 = pure_ada.iter().map(|u| u.lovelace).sum();
    println!("  UTXOs to consolidate: {}", pure_ada.len());
    println!("  Total lovelace: {}", total);

    if dry_run {
        println!("\n{}", "[Dry run - not submitting transaction]".yellow());
        return Ok(());
    }

    println!("\n{}", "Manual Transaction Required:".yellow().bold());
    println!("Build a transaction with cardano-cli:");
    println!("\ncardano-cli conway transaction build \\");
    println!("  --testnet-magic {} \\", ctx.network_magic());
    for utxo in &pure_ada {
        println!("  --tx-in {}#{} \\", utxo.tx_hash, utxo.output_index);
    }
    println!("  --change-address {} \\", address);
    println!("  --out-file consolidate.raw");

    Ok(())
}

async fn find(
    ctx: &CliContext,
    min_lovelace: u64,
    no_assets: bool,
    with_datum: bool,
) -> Result<()> {
    println!("{}", "Finding suitable UTXO...".cyan());

    let keypair = ctx.load_signing_key()?;
    let address = keypair.address_bech32(ctx.pallas_network());

    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    let utxos = client.get_utxos(&address).await?;

    let suitable = utxos.iter().find(|u| {
        if u.lovelace < min_lovelace {
            return false;
        }
        // When no_assets is requested, also exclude UTXOs with reference scripts
        if no_assets && (!u.assets.is_empty() || u.reference_script.is_some()) {
            return false;
        }
        if with_datum && u.inline_datum.is_none() {
            return false;
        }
        true
    });

    if let Some(utxo) = suitable {
        println!("\n{}", "Found suitable UTXO:".green());
        println!("  {}#{}", utxo.tx_hash, utxo.output_index);
        println!("  Lovelace: {}", utxo.lovelace);
        println!("  Assets: {}", utxo.assets.len());
        println!("  Has datum: {}", utxo.inline_datum.is_some());
    } else {
        println!("\n{}", "No suitable UTXO found".yellow());
        println!("Try relaxing the search criteria or adding funds to your wallet.");
    }

    Ok(())
}

async fn info(ctx: &CliContext, utxo_ref: &str) -> Result<()> {
    println!("{}", format!("UTXO Info: {}", utxo_ref).cyan());

    let parts: Vec<&str> = utxo_ref.split('#').collect();
    if parts.len() != 2 {
        return Err(anyhow!("Invalid UTXO format. Use tx_hash#index"));
    }

    let tx_hash = parts[0];
    let output_index: u32 = parts[1].parse()?;

    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    // We need to find this UTXO - check if it's at our address first
    let keypair = ctx.load_signing_key()?;
    let address = keypair.address_bech32(ctx.pallas_network());

    let utxos = client.get_utxos(&address).await?;

    if let Some(utxo) = utxos
        .iter()
        .find(|u| u.tx_hash == tx_hash && u.output_index == output_index)
    {
        println!("\n{}", "UTXO Details:".green());
        println!("{}", serde_json::to_string_pretty(utxo)?);
    } else {
        println!("\n{}", "UTXO not found at wallet address".yellow());
        println!("The UTXO may have been spent or is at a different address.");
    }

    Ok(())
}

async fn send(ctx: &CliContext, to: &str, amount: u64, dry_run: bool) -> Result<()> {
    println!("{}", "Sending ADA...".cyan());

    let keypair = ctx.load_signing_key()?;
    let from_address = keypair.address_bech32(ctx.pallas_network());

    println!("  From: {}", from_address);
    println!("  To: {}", to);
    println!("  Amount: {} lovelace ({:.6} ADA)", amount, amount as f64 / 1_000_000.0);

    let api_key = ctx.require_api_key()?;
    let client = BlockfrostClient::new(ctx.blockfrost_url(), api_key);

    let utxos = client.get_utxos(&from_address).await?;

    // Find a suitable UTXO (pure ADA, no assets, no reference scripts)
    let fee = 200_000u64;
    let required = amount + fee;

    let source_utxo = utxos
        .iter()
        .find(|u| u.assets.is_empty() && u.reference_script.is_none() && u.lovelace >= required)
        .ok_or_else(|| anyhow!("No suitable UTXO found with at least {} lovelace", required))?;

    println!("  Source UTXO: {}#{}", source_utxo.tx_hash, source_utxo.output_index);
    println!("  Source lovelace: {}", source_utxo.lovelace);
    println!("  Fee (estimate): {}", fee);

    if dry_run {
        println!("\n{}", "[Dry run - not submitting transaction]".yellow());
        return Ok(());
    }

    // Build the transaction
    println!("\n{}", "Building transaction...".cyan());

    let mut staging = StagingTransaction::new();

    // Add input
    let input_tx_hash: [u8; 32] = hex::decode(&source_utxo.tx_hash)?
        .try_into()
        .map_err(|_| anyhow!("Invalid tx hash length"))?;
    staging = staging.input(pallas_txbuilder::Input::new(
        pallas_crypto::hash::Hash::from(input_tx_hash),
        source_utxo.output_index as u64,
    ));

    // Parse destination address
    let to_addr = pallas_addresses::Address::from_bech32(to)
        .map_err(|e| anyhow!("Invalid destination address: {:?}", e))?;

    // Parse source address for change
    let from_addr = pallas_addresses::Address::from_bech32(&from_address)
        .map_err(|e| anyhow!("Invalid source address: {:?}", e))?;

    // Add output to destination
    staging = staging.output(Output::new(to_addr, amount));

    // Add change output
    let change = source_utxo.lovelace - amount - fee;
    if change > 1_000_000 {
        staging = staging.output(Output::new(from_addr, change));
    }

    // Set fee and network
    staging = staging.fee(fee);
    staging = staging.network_id(ctx.network_id());

    // Build the transaction
    let tx = staging
        .build_conway_raw()
        .map_err(|e| anyhow!("Failed to build transaction: {:?}", e))?;

    println!("  TX Hash: {}", hex::encode(&tx.tx_hash.0));

    // Sign the transaction
    println!("{}", "Signing transaction...".cyan());
    let tx_hash_bytes: &[u8] = &tx.tx_hash.0;
    let signature = keypair.sign(tx_hash_bytes);
    let signed_tx = tx
        .add_signature(keypair.pallas_public_key().clone(), signature)
        .map_err(|e| anyhow!("Failed to sign transaction: {:?}", e))?;

    // Submit the transaction
    println!("{}", "Submitting transaction...".cyan());
    let submitted_tx_hash = client.submit_tx(&signed_tx.tx_bytes.0).await?;

    println!("\n{}", "SUCCESS!".green().bold());
    println!("  Transaction Hash: {}", submitted_tx_hash);
    println!("  Explorer: {}", ctx.explorer_tx_url(&submitted_tx_hash));
    println!("\n  Sent {} lovelace ({:.6} ADA) to {}", amount, amount as f64 / 1_000_000.0, to);

    Ok(())
}
