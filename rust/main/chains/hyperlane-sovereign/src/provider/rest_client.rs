use crate::ConnectionConf;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, BlockInfo, ChainCommunicationError, ChainInfo,
    ChainResult, Checkpoint, FixedPointNumber, HyperlaneMessage, ModuleType, TxCostEstimate,
    TxOutcome, TxnInfo, TxnReceiptInfo, H256, H512, U256,
};
use reqwest::StatusCode;
use reqwest::{header::HeaderMap, Client, Response};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{fmt::Debug, num::NonZeroU64, str::FromStr};
use url::Url;
// use bech32::primitives::decode;//::{CheckedHrpstring, SegwitHrpstring};
// use mockall::*;
// use mockall::predicate::*;
use bytes::Bytes;
use tracing::info;

#[derive(Clone, Debug, Deserialize)]
struct Schema<T> {
    data: Option<T>,
    _errors: Option<Errors>,
    _meta: Option<Meta>,
}

#[derive(Clone, Debug, Deserialize)]
struct Meta {
    _meta: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
struct Errors {
    _details: Option<Value>,
    _status: Option<u32>,
    _title: Option<String>,
}

// mock! {
//     SovereignRestClient {}

//     impl HttpClient for SovereignRestClient {
//         async fn http_get(&self, query: &str) -> Result<Bytes, reqwest::Error>;
//         async fn http_post(&self, query: &str, json: &Value) -> Result<Bytes, reqwest::Error>;
//         async fn parse_response(&self, response: Response) -> Bytes;
//     }
// }

#[derive(Clone, Debug)]
pub(crate) struct SovereignRestClient {
    url: Url,
    client: Client,
}

trait HttpClient {
    async fn http_get(&self, query: &str) -> Result<Bytes, reqwest::Error>;
    async fn http_post(&self, query: &str, json: &Value) -> Result<Bytes, reqwest::Error>;
    async fn parse_response(&self, response: Response) -> Result<Bytes, reqwest::Error>;
}

impl HttpClient for SovereignRestClient {
    async fn http_get(&self, query: &str) -> Result<Bytes, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert("content-type", "application/json".parse().expect("Well-formed &str"));

        let response = self
            .client
            .get(format!("{}{}", &self.url, query))
            .headers(header_map)
            .send()
            .await?;

        let result = self.parse_response(response).await?;
        Ok(result)
    }

    async fn http_post(&self, query: &str, json: &Value) -> Result<Bytes, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert("content-type", "application/json".parse().expect("Well-formed &str"));

        let response = self
            .client
            .post(format!("{}{}", &self.url, query))
            .headers(header_map)
            .json(json)
            .send()
            .await?;

        let result = self.parse_response(response).await?;
        Ok(result)
    }

    async fn parse_response(&self, response: Response) -> Result<Bytes, reqwest::Error> {
        // todo - handle each case differently
        let response = match response.status() {
            StatusCode::OK => {
                // 200
                let response = response.bytes().await?;
                println!("200: pre-parse: {:?}\n", response);
                Ok(response)
            }
            StatusCode::BAD_REQUEST => {
                // 400
                let response = response.bytes().await?;
                println!("400: pre-parse: {:?}\n", response);
                Ok(response)
            }
            StatusCode::NOT_FOUND => {
                // 404
                let response = response.bytes().await?;
                println!("404: pre-parse: {:?}\n", response);
                Ok(response)
            }
            _ => {
                println!("undefined: pre-parse: {:?}\n", response);
                todo!()
            }
        };

        response
    }
}

impl SovereignRestClient {
    pub fn new(conf: &ConnectionConf) -> Self {
        SovereignRestClient {
            url: conf.url.clone(),
            client: Client::new(),
        }
    }

    pub async fn get_latest_slot(&self)  -> ChainResult<u32> {
        info!("get_slots_latest(&self)");
        
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _number: Option<u64>,
            hash: Option<String>,
            batch_range: Option<BatchRange>,
            _finality_status: Option<String>
        }

        #[derive(Clone, Debug, Deserialize)]
        struct BatchRange {
            _start: Option<u32>,
            end: Option<u32>,
        }

        // /ledger/slots/latest
        let query = "/ledger/slots/latest";

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        // println!("post-parse: {:?}\n", response);

        // todo: massive cleanup / mapping
        // let res = LogMeta {
        //     address: H256::default(),
        //     block_number: response.clone().data.unwrap().batch_range.unwrap().end.unwrap(),
        //     block_hash: H256::from_str(response.clone().data.unwrap().hash.unwrap().as_str()).unwrap(),
        //     transaction_id: H512::default(),
        //     transaction_index: u64::default(),
        //     log_index: U256::default()
        // };

        // todo!("return 'number'")
        Ok(response.clone().data.unwrap().batch_range.unwrap().end.unwrap())
    }

    pub async fn get_values_from_key(&self, key: &str) -> ChainResult<String> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _key: Option<String>,
            value: Option<Vec<String>>,
        }

        // /modules/accounts/state/credential-ids/items/{key}
        let query = format!("/modules/accounts/state/credential-ids/items/{}", key);
        info!("{:?}", query);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        if response.data.clone().unwrap().value.unwrap().is_empty() {
            Err(ChainCommunicationError::CustomError(format!("Received empty list")))
        } else {
            Ok(response.data.unwrap().value.unwrap()[0].clone())
        }
    }

    pub async fn get_nonce(&self, key: &str) -> ChainResult<u32>{
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _key: Option<String>,
            value: Option<u32>,
        }

        // /modules/nonces/state/nonces/items/{key}
        let query = format!("/modules/nonces/state/nonces/items/{}", key);
        info!("{:?}", query);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        Ok(response.data.unwrap().value.unwrap())
    }

    // @Provider - test working
    pub async fn get_block_by_hash(&self, tx_id: &H256) -> ChainResult<BlockInfo> {
        info!("get_block_by_hash(&self, tx_id: &H256) tx_id:{:?}", tx_id);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            #[serde(rename = "type")]
            _sovereign_type: Option<String>,
            number: Option<u64>,
            hash: Option<String>,
            _event_range: Option<EventRange>,
            _receipt: Option<Value>,
            _body: Option<String>,
            _events: Option<Value>,
            _batch_number: Option<u32>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct EventRange {
            _start: Option<u32>,
            _end: Option<u32>,
        }

        // /ledger/txs/{txId}
        let children = 0; // use 0 for compact and 1 for full
        let query = format!("/ledger/txs/{:?}?children={}", tx_id.clone(), children);
        println!("QUERY**********: {:#?}", query);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("post-parse: {:?}\n", response);

        let res = if let Some(response_data) = response.data {
            if let (Some(hash), Some(number)) = (response_data.hash, response_data.number) {
                Ok(BlockInfo {
                    hash: H256::from_str(hash.as_str())?,
                    timestamp: u64::default(),
                    number,
                })
            } else {
                Err(ChainCommunicationError::CustomError(format!("Bad response")))
            }
        } else {
            Err(ChainCommunicationError::CustomError(format!("Bad response")))
        };

        res
    }

    // @Provider - test working
    pub async fn get_txn_by_hash(&self, tx_hash: &H256) -> ChainResult<TxnInfo> {
        info!("get_txn_by_hash(&self, tx_hash: &H256) tx_hash:{:?}", tx_hash);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            id: Option<String>,
            _status: Option<String>,
        }

        // /sequencer/txs/{txHash}
        let query = format!("/sequencer/txs/{:?}", tx_hash);
        // let query = format!("/sequencer/txs/{}", "0x2959329517b31126012eb858e33ae5b66ed466d67e4b6e722f1ef87b6f805b4a");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        let res = TxnInfo {
            hash: H256::from_str(response.data.unwrap().id.unwrap().as_str())?,
            gas_limit: U256::default(),
            max_priority_fee_per_gas: Some(U256::default()),
            max_fee_per_gas: Some(U256::default()),
            gas_price: Some(U256::default()),
            nonce: u64::default(),
            sender: H256::default(),
            recipient: Some(H256::default()),
            receipt: Some(TxnReceiptInfo {
                gas_used: U256::default(),
                cumulative_gas_used: U256::default(),
                effective_gas_price: Some(U256::default()),
            }),
        };
        Ok(res)
    }

    // @Provider - test working, need to test all variants
    pub async fn is_contract(&self, key: &str) -> ChainResult<bool> {
        info!("is_contract(&self, key: &str) key:{:?}", key);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            key: Option<String>,
            _value: Option<String>,
        }

        // /modules/mailbox-hook-registry/state/registry/items/{key}
        // /modules/mailbox-ism-registry/state/registry/items/{key}
        // /modules/mailbox-recipient-registry/state/registry/items/{key}
        let _query = format!(
            "/modules/mailbox-hook-registry/state/registry/items/{}",
            key
        );
        let query = format!("/modules/mailbox-ism-registry/state/registry/items/{}", key);
        // let query = format!("/modules/mailbox-recipient-registry/state/registry/items/{}", key);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        match response.data {
            Some(response_data) => Ok(response_data.key.is_some()),
            None => Err(ChainCommunicationError::CustomError(String::from("Invalid response")))
        }
    }

    // @Provider - test working
    pub async fn get_balance(&self, token_id: &str, address: &str) -> ChainResult<U256> {
        info!("get_balance(&self, token_id: &str, address: &str) token_id:{:?} address:{:?}", token_id, address);
        let address = "sov1dnhqk4mdsj2kwv4xymt8a624xuahfx8906j9usdkx7ensfghndkq8p33f7";
        
        // /modules/bank/tokens/{token_id}/balances/{address}
        let query = format!("/modules/bank/tokens/{}/balances/{}", token_id, address);

        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _amount: Option<u128>,
            _token_id: Option<String>,
        }

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("PARSED RESPONSE: {:?}\n", response);

        // let response = U256::from(response);
        Ok(U256::default())
    }

    // @Provider - todo - mock only
    pub async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        info!("get_chain_metrics(&self)");

        // http://127.0.0.1:9845/metrics
        
        Ok(None)
    }

    // @Mailbox - test working
    pub async fn get_count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        info!(" get_count(&self, lag: Option<NonZeroU64>) lag:{:?}", lag);
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
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        let response = response
            .data
            .and_then(|data| data.value)
            .unwrap_or_default();
        // Ok(response.data.unwrap().value.unwrap())

        Ok(response)
    }

    // @Mailbox
    pub async fn get_delivered_status(&self, message_id: &str) -> ChainResult<bool> {
        info!("get_delivered_status(&self, message_id: &str) message_id{:?}", message_id);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _value: Option<u32>,
        }

        // /modules/mailbox/state/deliveries/items/{key}
        let query = format!("/modules/mailbox/state/deliveries/items/{}", message_id);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        Ok(bool::default())
    }

    // @Mailbox - test working
    pub async fn default_ism(&self) -> ChainResult<H256> {
        info!("default_ism(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<String>,
        }

        // /modules/mailbox/state/default-ism
        let query = "/modules/mailbox/state/default-ism";

        let response = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
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
        info!("recipient_ism(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            #[serde(rename = "type")]
            _sovereign_type: Option<String>,
            _namespace: Option<String>,
            prefix: Option<String>,
        }

        // /modules/mailbox-ism-registry/state/registry
        let query = "/modules/mailbox-ism-registry/state/registry";

        let response = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("PARSED RESPONSE {:?}\n", response);

        let res = response.data.unwrap().prefix.unwrap();
        println!("{:?}", res);

        let res = H256::from_str(&res)?;
        // smaller result is working, but large one panics
        // let res = H256::from_str("0x736f765f686c5f69736d5f72656769737472792f49736d52656769737472792f72656769737472792f").unwrap();
        // let res = H256::from_str("0x27f470568d73f168b248a82791da54e90f9aebea4489257bd5e04b1828e4e9a2").unwrap();
        println!("{:?}", res);

        Ok(res)
    }

    // @Mailbox - test working
    pub async fn process(&self) -> ChainResult<TxOutcome> {
        info!("process(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _id: Option<String>,
            _status: Option<String>,
        }

        // /sequencer/txs
        let query = "/sequencer/txs";

        let json = json!({"body":""});
        println!("JSON: {:?}\n", json);

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("Response(parsed): {:?}\n", response);

        let res = TxOutcome {
            transaction_id: H512::default(),
            executed: bool::default(),
            gas_used: U256::default(),
            gas_price: FixedPointNumber::default(),
        };

        Ok(res)
    }

    // @Mailbox - test working
    pub async fn process_estimate_costs(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> ChainResult<TxCostEstimate> {
        info!("process_estimate_costs(&self, message: &HyperlaneMessage, _metadata: &[u8]) {:?} {:?}", message, metadata);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _apply_tx_result: Option<ApplyTxResult>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct ApplyTxResult {
            _receipt: Option<Receipt>,
            _transaction_consumption: Option<TransactionConsumption>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Receipt {
            _events: Option<Vec<Events>>,
            _receipt: Option<SubReceipt>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct Events {
            _key: Option<String>,
            _value: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct SubReceipt {
            _content: Option<String>,
            _outcome: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct TransactionConsumption {
            _base_fee: Option<Vec<u32>>,
            _gas_price: Option<Vec<u32>>,
            _priority_fee: Option<u32>,
            _remaining_funds: Option<u32>,
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
                    "encoded_call_message":message.body,
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
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("Response(parsed): {:?}\n", response);

        let res = TxCostEstimate {
            gas_limit: U256::default(),
            gas_price: FixedPointNumber::default(),
            l2_gas_limit: None,
        };

        Ok(res)
    }

    // @Mailbox - todo - mock only
    pub fn process_calldata(&self) -> Vec<u8> {
        info!("process_calldata(&self)");
        todo!()
    }

    // @ISM
    pub async fn dry_run(&self) -> ChainResult<Option<U256>> {
        info!("dry_run(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _data: Option<Value>,
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
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("Response(parsed): {:?}\n", response);

        Ok(None)
    }

    // @ISM - test working
    pub async fn module_type(&self, ism_id: &str) -> ChainResult<ModuleType> {
        info!(" module_type(&self, ism_id: &str) ism_id:{:?}", ism_id);
        // /modules/mailbox-ism-registry/{ism_id}/module_type/
        let query = format!("/modules/mailbox-ism-registry/{}/module_type/", ism_id);

        #[derive(Debug, Deserialize, Clone)]
        struct Data {
            data: Option<u32>,
        }

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        // let's not return "default" here, but rather, should error out due to no value
        let data = response
            .data
            .and_then(|f| f.data)
            .unwrap_or_default()
            ;

        match data {
            0 => Ok(ModuleType::Unused),
            1 => Ok(ModuleType::Routing),
            2 => Ok(ModuleType::Aggregation),
            3 => Ok(ModuleType::LegacyMultisig),
            4 => Ok(ModuleType::MerkleRootMultisig),
            5 => Ok(ModuleType::MessageIdMultisig),
            6 => Ok(ModuleType::Null),
            7 => Ok(ModuleType::CcipRead),
            _ => Err(ChainCommunicationError::CustomError(String::from(
                "Unknown ModuleType returned",
            ))),
        }
    }

    // @Merkle Tree Hook
    pub async fn tree(
        &self,
        hook_id: &str,
        lag: Option<NonZeroU64>,
    ) -> ChainResult<IncrementalMerkle> {
        info!("tree(&self, hook_id: &str, lag: Option<NonZeroU64>, hook_id:{:?} lag:{:?}", hook_id, lag);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            count: Option<usize>,
            branch: Option<Vec<String>>,
        }

        // /mailbox-hook-merkle-tree/{hook_id}/tree
        let query = match lag {
            Some(lag) => {
                format!(
                    "modules/mailbox-hook-merkle-tree/{}/tree?rollup_height={}",
                    hook_id, lag
                )
            }
            None => {
                format!("modules/mailbox-hook-merkle-tree/{}/tree", hook_id)
            }
        };
        println!("query: {:?}", query);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("post-parse:{:?}", response);

        let mut incremental_merkle = IncrementalMerkle {
            count: response.clone().data.unwrap().count.unwrap(),
            ..Default::default()
        };
        response
            .data
            .unwrap()
            .branch
            .unwrap()
            .into_iter()
            .enumerate()
            .for_each(|(i, f)| incremental_merkle.branch[i] = H256::from_str(&f).unwrap());
            // .for_each(|(i, f)| println!("i:{:?} f:{:?} ", i, f));

        println!("count: {:?}", incremental_merkle.count);

        Ok(incremental_merkle)
    }

    // @Merkle Tree Hook - test working, need to find better test condition
    pub async fn latest_checkpoint(
        &self,
        hook_id: &str,
        lag: Option<NonZeroU64>,
    ) -> ChainResult<Checkpoint> {
        info!("latest_checkpoint(&self, hook_id: &str, lag: Option<NonZeroU64>, hook_id:{:?} lag:{:?}", hook_id, lag);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            count: Option<usize>,
            tree: Option<String>,
        }

        // /mailbox-hook-merkle-tree/{hook_id}/checkpoint
        let query = match lag {
            Some(lag) => {
                format!(
                    "/mailbox-hook-merkle-tree/{}/checkpoint?rollup_height={}",
                    hook_id, lag
                )
            }
            None => {
                format!("/mailbox-hook-merkle-tree/{}/checkpoint", hook_id)
            }
        };

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        let response = Checkpoint {
            merkle_tree_hook_address: H256::default(),
            mailbox_domain: u32::default(),
            root: H256::from_str(&response.data.clone().unwrap().tree.unwrap())?,
            index: response.data.unwrap().count.unwrap() as u32,
        };

        Ok(response)
    }

    // @MultiSig ISM -  TBD
    pub async fn _validators_and_threshold(&self) -> ChainResult<(Vec<H256>, u8)> {
        todo!()
    }

    // @Routing ISM - TBD
    pub async fn _route(&self) -> ChainResult<H256> {
        todo!()
    }

    // @Validator Announce - TBD
    pub async fn get_announced_storage_locations(&self) -> ChainResult<Vec<Vec<String>>> {
        todo!()
    }

    // @Validator Announce - TBD
    pub async fn _announce(&self) -> ChainResult<TxOutcome> {
        todo!()
    }

    // @Validator Announce - TBD
    pub async fn _announce_tokens_needed(&self) -> Option<U256> {
        todo!()
    }
}
