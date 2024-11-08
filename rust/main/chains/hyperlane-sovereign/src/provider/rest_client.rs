use crate::ConnectionConf;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, BlockInfo, ChainCommunicationError, ChainInfo,
    ChainResult, Checkpoint, ModuleType, TxCostEstimate, TxOutcome, TxnInfo, TxnReceiptInfo, H256, U256,
};
use reqwest::{header::HeaderMap, Client, Response};
use serde::Deserialize;
use serde_json::Value;
use std::{fmt::Debug, num::NonZeroU64, str::FromStr};
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

        Ok(response)
    }

    async fn _http_post(&self, json: &Value) -> Result<Response, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert("content-type", "application/json".parse().unwrap());

        let response = self
            .client
            .post(format!("{}", &self.url))
            .headers(header_map)
            .json(json)
            .send()
            .await?;

        Ok(response)
    }

    // @Provider
    pub async fn get_block_by_hash(&self, _hash: &H256) -> ChainResult<BlockInfo> {
        // let json = json!({"jsonrpc":"2.0", "method":"mailbox_count", "parms":hash, "id":"1"});

        // let _res = self
        //     .http_post(&json)
        //     .await
        //     .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;

        // /sequencer/txs/{txHash}
        // or 
        // /ledger/txs/{txId}

        let res = BlockInfo {
            hash: H256::default(),
            timestamp: u64::default(),
            number: u64::default(),
        };

        Ok(res)
    }

    // @Provider
    pub async fn get_txn_by_hash(&self, hash: &str) -> ChainResult<TxnInfo> {
        #[derive(Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            meta: Option<Meta>
        }

        #[derive(Debug, Deserialize)]
        struct Data {
            id: Option<String>,
            status: Option<String>
        }

        #[derive(Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        // /sequencer/txs/{txHash}
        // or 
        // /ledger/txs/{txId}
        let query = format!("/sequencer/txs/{}", hash);
        // let query = format!("/sequencer/txs/{}", "0x2959329517b31126012eb858e33ae5b66ed466d67e4b6e722f1ef87b6f805b4a");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("{:?}", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("{:?}", response);

        let res = TxnInfo {
            hash: H256::from_str(response.data.unwrap().id.unwrap().as_str()).unwrap(),
            gas_limit: U256::default(),
            max_priority_fee_per_gas: Some(U256::default()),
            max_fee_per_gas: Some(U256::default()),
            gas_price: Some(U256::default()),
            nonce: u64::default(),
            sender: H256::default(),
            recipient: Some(H256::default()),
            receipt: Some(TxnReceiptInfo{
                gas_used: U256::default(),
                cumulative_gas_used: U256::default(),
                effective_gas_price: Some(U256::default()),
            }),
        };
        Ok(res)
    }

    // @Provider
    pub async fn is_contract(&self) -> ChainResult<bool> {
        todo!()
    }

    // @Provider
    pub async fn get_balance(&self,  address: String) -> ChainResult<U256> {
        // /modules/bank/tokens/{token_id}/balances/{address}
        let token_id = "token_1nmu7udmg3ffyuhu6a9pafjw6sv70tnl839zpy5afaxtqpndsrzwzms2txfv3l6gukpu4ytz8qc46f9alm2qkuw7";
        let query = format!("/modules/bank/tokens/{}/balances/{}", token_id, address);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        let _response : Value = serde_json::from_slice(&response).unwrap();

        Ok(U256::default())
    }

    // @Provider
    pub async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        todo!()
    }

    // @Mailbox
    pub async fn get_count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        #[derive(Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            meta: Option<Meta>
        }

        #[derive(Debug, Deserialize)]
        struct Data {
            value: Option<u32>,
        }

        #[derive(Debug, Deserialize)]
        struct Meta {
            value: Option<String>,
        }

        // /modules/mailbox/state/nonce
        let query = match lag {
            Some(lag) => format!("/modules/mailbox/state/nonce?rollup_height={}", lag),
            None => "/modules/mailbox/state/nonce".to_owned(),
        };

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("{:?}", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("{:?}", response);

        Ok(response.data.unwrap().value.unwrap())
    }

    // @Mailbox
    pub async fn get_delivered_status(&self, message_id: u32) -> ChainResult<bool> {
        // /modules/mailbox/state/deliveries/items/{key}
        let query = format!("/modules/mailbox/state/deliveries/items/{}", message_id);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        let _response : Value = serde_json::from_slice(&response).unwrap();

        todo!()
    }

    // @Mailbox
    pub async fn default_ism(&self) -> ChainResult<H256> {
        #[derive(Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            meta: Option<Meta>
        }

        #[derive(Debug, Deserialize)]
        struct Data {
            value: Option<String>
        }

        #[derive(Debug, Deserialize)]
        struct Meta {
            value: Option<String>
        }

        // /modules/mailbox/state/default-ism
        let query = "/modules/mailbox/state/default-ism";

        let response = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("{:?}", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("{:?}", response);

        let res = response.data.unwrap().value.unwrap();
        println!("{:?}", res);
        let res = H256::from_str(res.as_str()).unwrap();

        Ok(res)
    }

    // @Mailbox
    pub async fn recipient_ism(&self) -> ChainResult<H256> {
        // /modules/mailbox-ism-registry/state/registry
        todo!()
    }

    // @Mailbox
    pub async fn process(&self) -> ChainResult<TxOutcome> {
        // /sequencer/txs
        todo!()
    }

    // @Mailbox
    pub async fn process_estimate_costs(&self) -> ChainResult<TxCostEstimate> {
        // /modules/mailbox-ism-registry/state/registry
        // or
        // /rollup/simulate
        todo!()
    }

    // @Mailbox
    pub fn process_calldata(&self) -> Vec<u8> {
        todo!()
    }
    
    // @ISM
    pub async fn dry_run(&self) -> ChainResult<Option<U256>> {
        todo!()
    }

    // @ISM
    pub async fn module_type(&self) -> ChainResult<ModuleType> {
        todo!()
    }

    // @Merkle Tree Hook
    pub async fn tree(&self) -> ChainResult<IncrementalMerkle> {
        todo!()
    }

    // @Merkle Tree Hook
    pub async fn count(&self) -> ChainResult<u32> {
        todo!()
    }

    // @Merkle Tree Hook
    pub async fn latest_checkpoint(&self) -> ChainResult<Checkpoint> {
        // /ledger/slots/latest
        todo!()
    }

    // @MultiSig ISM
    pub async fn validators_and_threshold(&self) -> ChainResult<(Vec<H256>, u8)> {
        todo!()
    }

    // @Routing ISM
    pub async fn route(&self) -> ChainResult<H256> {
        todo!()
    }

    // @Validator Announce
    pub async fn get_announced_storage_locations(&self) -> ChainResult<Vec<Vec<String>>> {
        todo!()
    }

    // @Validator Announce
    pub async fn announce(&self) -> ChainResult<TxOutcome> {
        todo!()
    }

    // @Validator Announce
    pub async fn announce_tokens_needed(&self) -> Option<U256> {
        todo!()
    }
}
