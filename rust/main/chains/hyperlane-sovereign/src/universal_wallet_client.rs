use anyhow::{bail, Context, Result};
use base64::prelude::BASE64_STANDARD;
use base64::Engine;
use futures::StreamExt;
use reqwest::{Client, ClientBuilder};
use serde_json::{json, Value};
use sov_universal_wallet::schema::{RollupRoots, Schema};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub mod crypto;
pub mod tx_state;
pub mod types;

use types::TxStatus;

pub struct UniversalClient {
    pub api_url: String,
    pub chain_hash: [u8; 32],
    pub chain_id: u64,
    pub http_client: Client,
    pub crypto: crypto::Crypto,
    pub address: String,
    pub schema: Schema,
}

impl UniversalClient {
    pub async fn new(api_url: &str, crypto: crypto::Crypto, chain_id: u64) -> anyhow::Result<Self> {
        let http_client = ClientBuilder::default().build()?;
        let mut schema = Self::fetch_schema(api_url, &http_client).await?;

        Ok(Self {
            api_url: api_url.to_string(),
            chain_hash: schema.chain_hash()?,
            chain_id,
            http_client,
            address: crypto.address()?,
            crypto,
            schema,
        })
    }

    pub async fn build_and_submit(&self, call_message: Value) -> Result<String> {
        let utx = self.build_tx_json(&call_message);
        let tx = self.sign_tx(utx)?;
        let body = self.serialise_tx(&tx)?;
        let hash = self.submit_tx(body).await?;
        // self.submit_batch().await?;
        self.wait_for_tx(hash.clone()).await?;

        Ok(hash)
    }

    async fn wait_for_tx(&self, tx_hash: String) -> Result<()> {
        let mut slot_subscription = self.subscribe_to_tx_status_updates(tx_hash).await?;

        let max_waiting_time = Duration::from_secs(300);
        let start_wait = Instant::now();

        while start_wait.elapsed() < max_waiting_time {
            if let Some(tx_info) = slot_subscription.next().await.transpose()? {
                match tx_info.status {
                    TxStatus::Processed | TxStatus::Finalized => {
                        return Ok(());
                    }
                    TxStatus::Dropped => {
                        bail! {"transaction dropped"}
                    }
                    _ => {}
                }
            }
        }
        anyhow::bail!(
            "Giving up waiting for target batch to be published after {:?}",
            start_wait.elapsed()
        );
    }

    fn build_tx_json(&self, call_message: &Value) -> Value {
        json!({
            "runtime_call": call_message,
            "generation": self.get_generation(),
            "details": {
                "max_priority_fee_bips": 100,
                "max_fee": 100_000_000,
                "gas_limit": serde_json::Value::Null,
                "chain_id": self.chain_id
            }
        })
    }

    fn sign_tx(&self, mut utx_json: Value) -> Result<Value> {
        let utx_index = self
            .schema
            .rollup_expected_index(RollupRoots::UnsignedTransaction)?;
        let mut utx_bytes = self
            .schema
            .json_to_borsh(utx_index, &utx_json.to_string())?;

        utx_bytes.extend_from_slice(&self.chain_hash);

        let signature = self.crypto.sign(&utx_bytes);

        if let Some(obj) = utx_json.as_object_mut() {
            obj.insert("signature".to_string(), json!({"msg_sig": signature}));
            obj.insert(
                "pub_key".to_string(),
                json!({
                    "pub_key": self.crypto.public_key()
                }),
            );
        }
        Ok(utx_json)
    }

    fn serialise_tx(&self, tx_json: &Value) -> Result<String> {
        let tx_index = self
            .schema
            .rollup_expected_index(RollupRoots::Transaction)?;
        let tx_bytes = self.schema.json_to_borsh(tx_index, &tx_json.to_string())?;

        Ok(BASE64_STANDARD.encode(&tx_bytes))
    }

    async fn submit_tx(&self, tx: String) -> Result<String> {
        let url = format!("{}/sequencer/txs", self.api_url);
        let resp = self
            .http_client
            .post(url)
            .json(&json!({"body": tx}))
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let error_text = resp
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            bail!("Request failed with status {}: {}", status, error_text);
        }

        let dave: serde_json::Value = resp.json().await?;

        let Some(id) = dave
            .get("data")
            .and_then(|data| data.get("id"))
            .and_then(|id| id.as_str())
        else {
            bail!("ID not found in response");
        };
        Ok(id.to_string())
    }

    /// I think this is not necessary any more, now there is automatic submission in sovereign
    // async fn submit_batch(&self) -> Result<()> {
    //     let url = format!("{}/sequencer/batches", self.api_url);
    //     let req = json!({"transactions": []});
    //     let resp = self.http_client.post(url).json(&req).send().await?;

    //     if !resp.status().is_success() {
    //         let status = resp.status();
    //         let error_text = resp
    //             .text()
    //             .await
    //             .unwrap_or_else(|_| "Unknown error".to_string());
    //         bail!("Request failed with status {}: {}", status, error_text);
    //     }

    //     let _result: serde_json::Value = resp.json().await?;
    //     Ok(())
    // }

    /// Query the rollup REST API for it's schema, in JSON format (used to serialise json transactions into borsh ones)
    async fn fetch_schema(api_url: &str, client: &Client) -> Result<Schema> {
        let resp = client
            .get(format!("{api_url}/rollup/schema"))
            .send()
            .await
            .context("querying rollup schema")?
            .error_for_status()?;
        let schema_json: Value = resp.json().await?;
        let schema_text = schema_json["data"].to_string();

        let schema = Schema::from_json(&schema_text).context("parsing rollup schema")?;
        Ok(schema)
    }

    /// Get the current 'generation' - the timestamp in seconds suffices;
    /// # Panics
    ///
    /// Will panic if system time is before epoch
    #[must_use]
    pub fn get_generation(&self) -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs()
    }
}
