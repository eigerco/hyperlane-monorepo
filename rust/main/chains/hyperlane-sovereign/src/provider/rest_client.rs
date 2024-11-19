use crate::ConnectionConf;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, BlockInfo, ChainCommunicationError, ChainInfo,HyperlaneMessage,
    ChainResult, Checkpoint, ModuleType, TxCostEstimate, TxOutcome, TxnInfo, TxnReceiptInfo, H256, U256, FixedPointNumber,
    H512
};
use reqwest::{header::HeaderMap, Client, Response};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{fmt::Debug, num::NonZeroU64, str::FromStr};
use url::Url;
use bech32::primitives::decode::{CheckedHrpstring, SegwitHrpstring};
use bech32::{hrp, segwit, Hrp, Bech32m};

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

    async fn http_post(&self, query: &str, json: &Value) -> Result<Response, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert("content-type", "application/json".parse().unwrap());

        let response = self
            .client
            .post(format!("{}{}", &self.url, query))
            .headers(header_map)
            .json(json)
            .send()
            .await?;

        Ok(response)
    }

    // @Provider - test working
    pub(crate) async fn get_block_by_hash(&self, tx_id: &H256) -> ChainResult<BlockInfo> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            #[serde(rename = "type")]
            sovereign_type: Option<String>,
            number: Option<u64>,
            hash: Option<String>,
            event_range: Option<EventRange>,
            receipt: Option<Value>,
            body: Option<String>,
            events: Option<Value>,
            batch_number: Option<u32>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct EventRange {
            start: Option<u32>,
            end: Option<u32>
        }

        // /ledger/txs/{txId}
        let children = 0;   // use 0 for compact and 1 for full
        let query = format!("/ledger/txs/{:?}?children={}", tx_id.clone(), children);
        println!("QUERY**********: {:#?}", query);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("pre-parse: {:?}\n", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("post-parse: {:?}\n", response);

        // let hash = H256::from_str("0x2959329517b31126012eb858e33ae5b66ed466d67e4b6e722f1ef87b6f805b4a").unwrap();
        let res = BlockInfo {
            hash: H256::from_str(response.clone().data.unwrap().hash.unwrap().as_str()).unwrap(),
            timestamp: u64::default(),
            number: response.data.unwrap().number.unwrap(),
        };

        Ok(res)
    }

    // @Provider - test working
    pub async fn get_txn_by_hash(&self, tx_hash: &H256) -> ChainResult<TxnInfo> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            id: Option<String>,
            status: Option<String>
        }

        // /sequencer/txs/{txHash}
        let query = format!("/sequencer/txs/{:?}", tx_hash);
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

    // @Provider - test working, need to test all variants
    pub async fn is_contract(&self, key: &str) -> ChainResult<bool> {
        // /modules/mailbox-hook-registry/state/registry/items/{key}
        // /modules/mailbox-ism-registry/state/registry/items/{key}
        // /modules/mailbox-recipient-registry/state/registry/items/{key}

        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            key: Option<String>,
            value: Option<String>
        }

        let query = format!("/modules/mailbox-hook-registry/state/registry/items/{}", key);
        let query = format!("/modules/mailbox-ism-registry/state/registry/items/{}", key);
        // let query = format!("/modules/mailbox-recipient-registry/state/registry/items/{}", key);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("{:?}", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("{:?}", response);

        let resp = if response.data.unwrap().key.is_some() { true } else {false };
        Ok(resp)
    }

    // @Provider - test working
    pub async fn get_balance(&self, token_id: &str, address: &str) -> ChainResult<U256> {
        // /modules/bank/tokens/{token_id}/balances/{address}
        let query = format!("/modules/bank/tokens/{}/balances/{}", token_id, address);

        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            amount: Option<u128>,
            token_id: Option<String>
        }

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("RESPONSE: {:?}\n", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("PARSED RESPONSE: {:?}\n", response);

        // let response = U256::from(response);
        Ok(U256::default())
    }

    // @Provider - todo - mock only
    pub async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        todo!()
    }

    // @Mailbox - test working
    pub async fn get_count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<u32>,
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
    pub async fn get_delivered_status(&self, message_id: &str) -> ChainResult<bool> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<u32>,
        }

        // /modules/mailbox/state/deliveries/items/{key}
        let query = format!("/modules/mailbox/state/deliveries/items/{}", message_id);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("{:?}", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("{:?}", response);

        Ok(bool::default())
    }

    // @Mailbox - test working
    pub async fn default_ism(&self) -> ChainResult<H256> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
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

        // const DATA: [u8; 20] = [0xab; 20]; // Arbitrary data to be encoded.
        // const STRING: &str = "sov1hsm838n6rc5pgdjxgg5c9rup04np9aa5wltxty0lj657qe9uex9qx6twad";
        let (_, data) = bech32::decode(&res).expect("failed to decode");
        // assert_eq!(hrp, Hrp::parse("abc").unwrap());
        // assert_eq!(data, DATA);
        // println!("hrp {:?}", hrp);
        // println!("data {:?}", data);

        // let res = H256::from_str(res.as_str()).unwrap();
        let res = H256::from_slice(&data);
        println!("{:?}", res);

        Ok(res)
    }

    // @Mailbox
    pub async fn recipient_ism(&self) -> ChainResult<H256> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            #[serde(rename = "type")]
            sovereign_type: Option<String>,
            namespace: Option<String>,
            prefix: Option<String>
        }

        // /modules/mailbox-ism-registry/state/registry
        let query = "/modules/mailbox-ism-registry/state/registry";

        let response = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("RESPONSE: {:?}\n", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("PARSED RESPONSE {:?}\n", response);

        let res = response.data.unwrap().prefix.unwrap();
        println!("{:?}", res);

        // const DATA: [u8; 20] = [0xab; 20]; // Arbitrary data to be encoded.
        // const STRING: &str = "sov1hsm838n6rc5pgdjxgg5c9rup04np9aa5wltxty0lj657qe9uex9qx6twad";
        // let (_, data) = bech32::decode(&res).expect("failed to decode");
        // assert_eq!(hrp, Hrp::parse("abc").unwrap());
        // assert_eq!(data, DATA);
        // println!("hrp {:?}", hrp);
        // println!("data {:?}", data);

        // let res = H256::from_str(res.as_str()).unwrap();
        // let res = H256::from_slice(&data);
        // println!("{:?}", res);

        let res = H256::from_str(&res).unwrap();
        // smaller result is working, but large one panics
        // let res = H256::from_str("0x736f765f686c5f69736d5f72656769737472792f49736d52656769737472792f72656769737472792f").unwrap();
        // let res = H256::from_str("0x27f470568d73f168b248a82791da54e90f9aebea4489257bd5e04b1828e4e9a2").unwrap();
        println!("{:?}", res);

        Ok(res)
    }

    // @Mailbox - test ok, but needs work
    pub async fn process(&self) -> ChainResult<TxOutcome> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            // data: Option<Data>,
            errors: Option<Vec<Errors>>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        // /sequencer/txs
        let query = "/sequencer/txs";

        let json = json!({"body":""});
        println!("JSON: {:?}\n", json);

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("Response(bytes): {:?}\n", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("Response(parsed): {:?}\n", response);

        let res = TxOutcome {
            transaction_id: H512::default(),
            executed: bool::default(),
            gas_used: U256::default(),
            gas_price: FixedPointNumber::default(),
        };
        
        Ok(res)
    }

    // @Mailbox - test ok, but needs work
    pub async fn process_estimate_costs(&self, message: &HyperlaneMessage, _metadata: &[u8]) -> ChainResult<TxCostEstimate> {
        // .process(
        //     Bytes(metadata.to_vec()),
        //     Bytes(RawHyperlaneMessage::from(message)),
        // )

        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            // data: Option<Data>,
            errors: Option<Vec<Errors>>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        // /rollup/simulate
        let query = "/rollup/simulate";

        let json = json!(
            {
                "body":{
                    "details":{
                        "chain_id":0,
                        "max_fee":0,
                        "max_priority_fee_bips":0
                    },
                    "encoded_call_message":"",
                    "nonce":message.nonce,
                    "sender_pub_key":""
                }
            }
        );
        println!("JSON: {:?}\n", json);

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("Response(bytes): {:?}\n", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("Response(parsed): {:?}\n", response);

        let res = TxCostEstimate {
            gas_limit: U256::default(),
            gas_price: FixedPointNumber::default(),
            l2_gas_limit: None
        };
        
        Ok(res)
    }

    // @Mailbox - todo - mock only
    pub fn process_calldata(&self) -> Vec<u8> {
        todo!()
    }
    
    // @ISM
    pub async fn dry_run(&self) -> ChainResult<Option<U256>> {
        // .process(
        //     Bytes(metadata.to_vec()),
        //     Bytes(RawHyperlaneMessage::from(message)),
        // )

        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            // data: Option<Data>,
            errors: Option<Vec<Errors>>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        // /rollup/simulate
        let query = "/rollup/simulate";

        let json = json!(
            {
                "body":{
                    "details":{
                        "chain_id":0,
                        "max_fee":0,
                        "max_priority_fee_bips":0
                    },
                    "encoded_call_message":"",
                    "nonce":0,
                    "sender_pub_key":""
                }
            }
        );
        println!("JSON: {:?}\n", json);

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("Response(bytes): {:?}\n", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("Response(parsed): {:?}\n", response);
        
        Ok(None)
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

    // @Merkle Tree Hook - test working, need to find better test condition
    pub async fn latest_checkpoint(&self) -> ChainResult<Checkpoint> {
        #[derive(Clone, Debug, Deserialize)]
        struct Schema {
            data: Option<Data>,
            errors: Option<Errors>,
            meta: Option<Meta>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            #[serde(rename = "type")]
            sovereign_type: Option<String>,
            number: Option<u32>,
            hash: Option<String>,
            state_root: Option<String>,
            batch_range: Option<BatchRange>,
            batches: Option<Vec<String>>,
            finality_status: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct BatchRange {
            start: Option<u32>,
            end: Option<u32>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Errors {
            details: Option<Value>,
            status: Option<u32>,
            title: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Meta {
            meta: Option<String>,
        }

        // /ledger/slots/latest
        let children = 0;   // use 0 for compact and 1 for full
        let query = format!("/ledger/slots/latest?children={}", children);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response = response.bytes().await.unwrap();
        println!("{:?}", response);
        let response : Schema = serde_json::from_slice(&response).unwrap();
        println!("{:?}", response);

        // let xxx = response.clone().data.unwrap().hash.unwrap().as_str();
        let response =  Checkpoint {
            merkle_tree_hook_address: H256::default(),
            mailbox_domain: response.clone().data.unwrap().number.unwrap(),
            root: H256::from_str(response.data.unwrap().hash.unwrap().as_str()).unwrap(),
            index: u32::default(),
        };

        Ok(response)
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
