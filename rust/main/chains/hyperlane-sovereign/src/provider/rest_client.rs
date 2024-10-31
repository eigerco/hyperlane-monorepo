use crate::ConnectionConf;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, BlockInfo, ChainCommunicationError, ChainInfo,
    ChainResult, Checkpoint, ModuleType, TxCostEstimate, TxOutcome, TxnInfo, H256, U256,
};
use reqwest::{header::HeaderMap, Client, Response};
use serde_json::{json, Value};
use std::{fmt::Debug, num::NonZeroU64};
use url::Url;

#[derive(Clone, Debug)]
pub(crate) struct SovereignRestClient {
    url: Url,
    client: Client,
}

impl SovereignRestClient {
    pub fn new(conf: &ConnectionConf) -> Self {
        SovereignRestClient {
            url: conf.url.clone(),
            client: Client::new(),
        }
    }

    async fn http_get(&self, query: &str) -> Result<Response, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert("content-type", "application/json".parse().unwrap());

        let response = self
            .client
            .get(format!("{}{}", &self.url, query))
            .headers(header_map)
            // .json(json)
            .send()
            .await?;

        // let response = response.bytes().await?;
        // let response : Value = serde_json::from_slice(&response).unwrap();

        Ok(response)
    }

    async fn http_post(&self, json: &Value) -> Result<Response, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert("content-type", "application/json".parse().unwrap());

        let response = self
            .client
            .post(format!("{}", &self.url))
            .headers(header_map)
            .json(json)
            .send()
            .await?;

        // let response = response.bytes().await?;
        // let response : Value = serde_json::from_slice(&response).unwrap();

        Ok(response)
    }

    pub async fn get_block_by_hash(&self, hash: &H256) -> ChainResult<BlockInfo> {
        let json = json!({"jsonrpc":"2.0", "method":"mailbox_count", "parms":hash, "id":"1"});

        let _res = self
            .http_post(&json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;

        todo!()
    }

    pub async fn get_txn_by_hash(&self) -> ChainResult<TxnInfo> {
        todo!()
    }

    pub async fn is_contract(&self) -> ChainResult<bool> {
        todo!()
    }

    pub async fn get_balance(&self) -> ChainResult<U256> {
        todo!()
    }

    pub async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        todo!()
    }

    pub async fn get_count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let query = match lag {
            Some(lag) => format!("/modules/mailbox/state/nonce?rollup_height={}", lag),
            None => "/modules/mailbox/state/nonce".to_owned(),
        };

        let _res = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;

        todo!()
    }

    pub async fn get_delivered_status(&self, message_id: u32) -> ChainResult<bool> {
        let query = format!("/modules/mailbox/state/deliveries/items/{}", message_id);

        let _res = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;

        todo!()
    }

    pub async fn dry_run(&self) -> ChainResult<Option<U256>> {
        todo!()
    }

    pub async fn module_type(&self) -> ChainResult<ModuleType> {
        todo!()
    }

    pub async fn tree(&self) -> ChainResult<IncrementalMerkle> {
        todo!()
    }

    pub async fn count(&self) -> ChainResult<u32> {
        todo!()
    }

    pub async fn latest_checkpoint(&self) -> ChainResult<Checkpoint> {
        todo!()
    }

    pub async fn validators_and_threshold(&self) -> ChainResult<(Vec<H256>, u8)> {
        todo!()
    }

    pub async fn route(&self) -> ChainResult<H256> {
        todo!()
    }

    pub async fn get_announced_storage_locations(&self) -> ChainResult<Vec<Vec<String>>> {
        todo!()
    }

    pub async fn announce(&self) -> ChainResult<TxOutcome> {
        todo!()
    }

    pub async fn announce_tokens_needed(&self) -> Option<U256> {
        todo!()
    }

    pub async fn default_ism(&self) -> ChainResult<H256> {
        let query = "/modules/mailbox/state/default-ism";

        let _res = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;

        todo!()
    }

    pub async fn recipient_ism(&self) -> ChainResult<H256> {
        todo!()
    }

    pub async fn process(&self) -> ChainResult<TxOutcome> {
        todo!()
    }

    pub async fn process_estimate_costs(&self) -> ChainResult<TxCostEstimate> {
        todo!()
    }

    pub fn process_calldata(&self) -> Vec<u8> {
        todo!()
    }
}
