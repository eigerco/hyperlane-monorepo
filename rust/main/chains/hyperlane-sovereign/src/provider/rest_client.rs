use crate::ConnectionConf;
use base64::prelude::*;
use bech32::{Bech32m, Hrp};
use borsh;
use bytes::Bytes;
use demo_hl_rollup_client::MyClient;
use demo_stf;
use demo_stf::runtime::RuntimeCall;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, BlockInfo, ChainCommunicationError, ChainInfo,
    ChainResult, Checkpoint, FixedPointNumber, HyperlaneMessage, ModuleType, TxCostEstimate,
    TxOutcome, TxnInfo, TxnReceiptInfo, H256, H512, U256,
};
use reqwest::StatusCode;
use reqwest::{header::HeaderMap, Client, Response};
use serde::Deserialize;
use serde_json::{json, Value};
use sov_address::MultiAddressEvm;
use sov_hyperlane::mailbox::CallMessage as MailboxCallMessage;
use sov_hyperlane::types::Message;
use sov_modules_api::prelude::tracing;
use sov_modules_api::{
    configurable_spec::ConfigurableSpec,
    execution_mode::Native,
    transaction::{PriorityFeeBips, TxDetails},
};
use sov_rollup_interface::common::{HexHash, HexString};
use sov_test_utils::{MockDaSpec, MockZkvm, MockZkvmCryptoSpec};
use std::env;
use std::{fmt::Debug, num::NonZeroU64, str::FromStr};
use tracing::info;
use url::Url;

type S =
    ConfigurableSpec<MockDaSpec, MockZkvm, MockZkvm, MockZkvmCryptoSpec, MultiAddressEvm, Native>;

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

pub fn to_bech32(input: H256) -> ChainResult<String> {
    let hrp = Hrp::parse("sov").expect("valid hrp"); // todo: put in config?
    let mut bech32_address = String::new();
    let addr = input.as_ref();

    match addr.len() {
        28 => {
            bech32::encode_to_fmt::<Bech32m, String>(&mut bech32_address, hrp, addr).map_err(
                |e| ChainCommunicationError::CustomError(format!("bech32 encoding error: {:?}", e)),
            )?;

            Ok(bech32_address)
        }
        32 if addr[..4] == [0, 0, 0, 0] => {
            bech32::encode_to_fmt::<Bech32m, String>(&mut bech32_address, hrp, &addr[4..])
                .map_err(|e| {
                    ChainCommunicationError::CustomError(format!("bech32 encoding error: {:?}", e))
                })?;

            Ok(bech32_address)
        }
        _ => Err(ChainCommunicationError::CustomError(format!(
            "bech_32 encoding error: Address must be 28 bytes, received {:?}",
            addr
        ))),
    }
}

fn from_bech32(input: String) -> ChainResult<H256> {
    let (_, slice) = bech32::decode(&input).map_err(|e| {
        ChainCommunicationError::CustomError(format!("bech32 decoding error: {:?}", e))
    })?;

    match slice.len() {
        28 => {
            let mut array = [0u8; 32];
            array[4..].copy_from_slice(slice.as_ref());
            Ok(H256::from_slice(&array))
        }
        _ => Err(ChainCommunicationError::CustomError(format!(
            "bech_32 encoding error: Address must be 28 bytes, received {:?}",
            slice
        ))),
    }
}

#[derive(Clone, Debug)]
pub(crate) struct SovereignRestClient {
    url: Url,
    client: Client,
}

// pub trait Event: DeserializeOwned + Debug + Clone {
//     const EVENT_KEY: &'static str;
// }
#[derive(Clone, Debug, Deserialize)]
pub struct TxEvent {
    pub key: String,
    pub value: serde_json::Value,
    pub number: u64,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Tx {
    pub number: u64,
    pub hash: String,
    pub events: Vec<TxEvent>,
    pub batch_number: u64,
}

#[derive(Clone, Debug, Deserialize)]
pub struct Batch {
    pub number: u64,
    pub hash: String,
    pub txs: Vec<Tx>,
}
trait HttpClient {
    async fn http_get(&self, query: &str) -> Result<Bytes, reqwest::Error>;
    async fn http_post(&self, query: &str, json: &Value) -> Result<Bytes, reqwest::Error>;
    async fn parse_response(&self, response: Response) -> Result<Bytes, reqwest::Error>;
}

impl HttpClient for SovereignRestClient {
    async fn http_get(&self, query: &str) -> Result<Bytes, reqwest::Error> {
        let mut header_map = HeaderMap::default();
        header_map.insert(
            "content-type",
            "application/json".parse().expect("Well-formed &str"),
        );

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
        header_map.insert(
            "content-type",
            "application/json".parse().expect("Well-formed &str"),
        );

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
                response.error_for_status_ref()?;
                let bytes = response.bytes().await?; // Extract the body as Bytes
                println!("undefined: pre-parse: {:?}\n", bytes);
                Ok(bytes)

                // todo!()
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
            Err(ChainCommunicationError::CustomError(format!(
                "Received empty list"
            )))
        } else {
            Ok(response.data.unwrap().value.unwrap()[0].clone())
        }
    }

    pub async fn get_nonce(&self, key: &str) -> ChainResult<u32> {
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
                Err(ChainCommunicationError::CustomError(format!(
                    "Bad response"
                )))
            }
        } else {
            Err(ChainCommunicationError::CustomError(format!(
                "Bad response"
            )))
        };

        res
    }

    // @Provider - test working
    pub async fn get_txn_by_hash(&self, tx_hash: &H256) -> ChainResult<TxnInfo> {
        info!(
            "get_txn_by_hash(&self, tx_hash: &H256) tx_hash:{:?}",
            tx_hash
        );
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

    pub async fn get_batch(&self, batch: u64) -> ChainResult<Batch> {
        info!("get_batch_tx_event(&self, batch: u64) batch:{:?}", batch);
        let query = format!("/ledger/batches/{}?children=1", batch);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Batch> = serde_json::from_slice(&response)?;
        let data = response.data.ok_or(ChainCommunicationError::CustomError(
            "Invalid response".to_string(),
        ))?;
        Ok(data)
    }

    pub async fn get_tx_by_hash(&self, tx_id: String) -> ChainResult<Tx> {
        info!("get_tx_by_hash(&self, tx_id: String) tx_id:{:?}", tx_id);
        let query = format!("/ledger/txs/{}?children=1", tx_id);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Tx> = serde_json::from_slice(&response)?;
        let data = response.data.ok_or(ChainCommunicationError::CustomError(
            "Invalid response".to_string(),
        ))?;
        Ok(data)
    }

    // Return the latest slot, and the highest committed batch number in that slot.
    pub async fn get_latest_slot(&self) -> ChainResult<(u32, Option<u32>)> {
        info!("get_latest_slot(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct BatchRange {
            // start: u32,
            end: u32,
        }
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            batch_range: BatchRange,
            number: u32,
        }

        let query = "/ledger/slots/latest?children=0";
        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        let data = response.data.ok_or(ChainCommunicationError::CustomError(
            "Invalid response".to_string(),
        ))?;

        // bach_range.end is exclusive - it's one above the last committed batch number
        let last_batch = if data.batch_range.end > 0 {
            Some(data.batch_range.end - 1)
        } else {
            None
        };

        Ok((data.number, last_batch))
    }

    // @Provider - test working, need to test all variants
    pub async fn is_contract(&self, key: H256) -> ChainResult<bool> {
        info!("is_contract(&self, key: &str) key:{:?}", key);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            key: Option<String>,
            _value: Option<String>,
        }

        for module in [
            "mailbox-hook-registry",
            "mailbox-ism-registry",
            "mailbox-recipient-registry",
        ] {
            let query = format!(
                "/modules/{}/state/registry/items/{}",
                module,
                to_bech32(key)?
            );

            let response = self.http_get(&query).await.map_err(|e| {
                ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e))
            })?;
            let response: Schema<Data> = serde_json::from_slice(&response)?;
            println!("{:?}", response);

            if let Some(data) = response.data {
                return Ok(data.key.is_some());
            }
        }
        Ok(false)
    }

    // @Provider - test working
    pub async fn get_balance(&self, token_id: &str, address: &str) -> ChainResult<U256> {
        info!(
            "get_balance(&self, token_id: &str, address: &str) token_id:{:?} address:{:?}",
            token_id, address
        );

        // // /modules/bank/tokens/{token_id}/balances/{address}
        // let query = format!("/modules/bank/tokens/{}/balances/{}", token_id, address);

        // #[derive(Clone, Debug, Deserialize)]
        // struct Data {
        //     _amount: Option<u128>,
        //     _token_id: Option<String>,
        // }

        // let response = self
        //     .http_get(&query)
        //     .await
        //     .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        // let response: Schema<Data> = serde_json::from_slice(&response)?;
        // println!("PARSED RESPONSE: {:?}\n", response);

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
    pub async fn get_count(&self, at_height: Option<NonZeroU64>) -> ChainResult<u32> {
        info!(
            " get_count(&self, lag: Option<NonZeroU64>) lag:{:?}",
            at_height
        );
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<u32>,
        }

        // /modules/mailbox/state/nonce
        let query = match at_height {
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
    pub async fn get_delivered_status(&self, message_id: H256) -> ChainResult<bool> {
        println!(
            "get_delivered_status(&self, message_id: &str) message_id{:?}",
            message_id
        );
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _value: Option<StateMap>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct StateMap {
            _sender: Option<String>,
            _block_number: Option<u32>,
        }

        // /modules/mailbox/state/deliveries/items/{key}
        let query = format!("/modules/mailbox/state/deliveries/items/{:?}", message_id);
        println!("message_id: {:?}", message_id);
        println!("query: {:?}", query);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("response: {:?}", response);

        match response.data {
            Some(d) => {
                println!("response: {:?}", d);
                Ok(true)
            }
            None => Ok(false),
        }
    }

    // @Mailbox - test working
    pub async fn default_ism(&self) -> ChainResult<H256> {
        info!("default_ism(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<String>,
        }

        let query = "/modules/mailbox/state/default-ism";

        let response = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        let addr_bech32 = response.data.unwrap().value.unwrap();
        let addr_h256 = from_bech32(addr_bech32)?;
        Ok(addr_h256)
    }

    // @Mailbox
    pub async fn recipient_ism(&self, recipient_id: H256) -> ChainResult<H256> {
        info!("recipient_ism(&self) {:?}", recipient_id);
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            address: Option<String>,
        }

        let recipient_bech32 = to_bech32(recipient_id)?;

        let query = format!(
            "/modules/mailbox-recipient-registry/{}/ism",
            recipient_bech32
        );

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let addr_bech32 = response.data.unwrap().address.unwrap();
        let addr_h256 = from_bech32(addr_bech32)?;
        Ok(addr_h256)
    }

    // @Mailbox - test working
    pub async fn process(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
        tx_gas_limit: Option<U256>,
    ) -> ChainResult<TxOutcome> {
        info!("process(&self)");
        #[derive(Clone, Debug, Deserialize)]
        struct TxData {
            _id: Option<String>,
            status: Option<String>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct BatchData {
            _blob_hash: Option<String>,
            _da_transaction_id: Option<Vec<u8>>,
            _tx_hashes: Option<Vec<String>>,
        }

        println!("message: {:?}", message);
        println!("metadata: {:?}", metadata);
        println!("tx_gas_limit: {:?}", tx_gas_limit);

        // /sequencer/txs
        let query = "/sequencer/txs";

        let body = get_submit_body_string(message, metadata).await?;
        println!("body: {:?}", body);
        let json = json!({"body":body});
        println!("JSON: {:?}\n", json);
        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;
        let response: Schema<TxData> = serde_json::from_slice(&response)?;
        println!("Response 1(parsed): {:?}\n", response);

        let result = match response.data.unwrap().status {
            Some(s) => {
                if s == String::from("submitted") {
                    true
                } else {
                    false
                }
            }
            None => false,
        };

        // /sequencer/batches
        let query = "/sequencer/batches";
        println!("body: {:?}", body);
        let json = json!(
            {
                "transactions":[body]
            }
        );
        println!("JSON: {:?}\n", json);
        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;

        let response: Schema<BatchData> = serde_json::from_slice(&response)?;
        println!("$$$$Response 2(parsed): {:?}\n", response);

        let res = TxOutcome {
            transaction_id: H512::default(),
            executed: result,
            gas_used: U256::default(),
            gas_price: FixedPointNumber::default(),
        };

        println!("res: {:?}", res);

        Ok(res)
    }

    // @Mailbox
    pub async fn process_estimate_costs(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> ChainResult<TxCostEstimate> {
        info!(
            "process_estimate_costs(&self, message: &HyperlaneMessage, metadata: &[u8]) {:?} {:?}",
            message, metadata
        );
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            apply_tx_result: Option<ApplyTxResult>,
        }

        #[derive(Clone, Debug, Deserialize)]
        struct ApplyTxResult {
            _receipt: Option<Receipt>,
            transaction_consumption: Option<TransactionConsumption>,
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
            base_fee: Option<Vec<u32>>,
            gas_price: Option<Vec<u32>>,
            _priority_fee: Option<u32>,
            _remaining_funds: Option<u32>,
        }

        // /rollup/simulate
        let query = "/rollup/simulate";
        let json = get_simulate_json_query(message, metadata).await?;

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let gas_price = FixedPointNumber::from(
            response
                .clone()
                .data
                .unwrap()
                .apply_tx_result
                .unwrap()
                .transaction_consumption
                .unwrap()
                .gas_price
                .unwrap()
                .get(0)
                .unwrap(),
        );

        let gas_limit = U256::from(
            *response
                .data
                .unwrap()
                .apply_tx_result
                .unwrap()
                .transaction_consumption
                .unwrap()
                .base_fee
                .unwrap()
                .get(0)
                .unwrap(),
        );

        let res = TxCostEstimate {
            gas_limit: gas_limit,
            gas_price: gas_price,
            l2_gas_limit: None,
        };

        Ok(res)
    }

    // @Mailbox - mock only
    pub fn _process_calldata(&self) -> Vec<u8> {
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
    pub async fn module_type(&self, ism_id: H256) -> ChainResult<ModuleType> {
        info!(" module_type(&self, ism_id: &str) ism_id:{:?}", ism_id);

        let query = format!(
            "/modules/mailbox-ism-registry/{}/module_type/",
            to_bech32(ism_id)?
        );

        // #[derive(Debug, Deserialize, Clone)]
        // struct Data {
        //     data: Option<u32>,
        // }

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<u32> = serde_json::from_slice(&response)?;
        println!("{:?}", response);

        // let's not return "default" here, but rather, should error out due to no value
        let data = response.data.unwrap_or_default();

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
        slot: Option<NonZeroU64>,
    ) -> ChainResult<IncrementalMerkle> {
        info!(
            "tree(&self, hook_id: &str, lag: Option<NonZeroU64>, hook_id:{:?} lag:{:?}",
            hook_id, slot
        );
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            count: Option<usize>,
            branch: Option<Vec<String>>,
        }

        // /mailbox-hook-merkle-tree/{hook_id}/tree
        let query = match slot {
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
            index: Option<u32>,
            root: Option<String>,
        }

        // /mailbox-hook-merkle-tree/{hook_id}/checkpoint
        let query = match lag {
            Some(lag) => {
                format!(
                    "modules/mailbox-hook-merkle-tree/{}/checkpoint?rollup_height={}",
                    hook_id, lag
                )
            }
            None => {
                format!("modules/mailbox-hook-merkle-tree/{}/checkpoint", hook_id)
            }
        };

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {}", e)))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;
        println!("response: {:?}", response);

        let response = Checkpoint {
            merkle_tree_hook_address: from_bech32(String::from(hook_id))?,
            mailbox_domain: 4321, // todo...obviously
            root: H256::from_str(&response.data.clone().unwrap().root.unwrap())?,
            index: response.data.clone().unwrap().index.unwrap(),
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

    // @Validator Announce
    pub async fn get_announced_storage_locations(
        &self,
        _validators: &[H256],
    ) -> ChainResult<Vec<Vec<String>>> {
        // todo: impl for POC / local db. make more dynamic for S3 and GCS
        let key = "VALIDATOR_SIGNATURES_DIR";

        match env::var(key) {
            Ok(v) => {
                let path = format!("file://{}", v);
                info!("validator signatures path: {:?}", path);
                Ok(vec![vec![path]])
            }
            Err(_) => Err(ChainCommunicationError::CustomError(String::from(
                "env variable VALIDATOR_SIGNATURES_DIR not found",
            ))),
        }
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

fn package_message(message: &HyperlaneMessage) -> Message {
    Message {
        version: message.version,
        nonce: message.nonce,
        origin_domain: message.origin,
        dest_domain: message.destination,
        sender: HexHash::new(message.sender.into()),
        recipient: HexHash::new(message.recipient.into()),
        body: HexString::new(message.body.clone().into()),
    }
}

fn get_encoded_call_message(built_message: &Message, metadata: &[u8]) -> String {
    let foo: RuntimeCall<S> = RuntimeCall::Mailbox(MailboxCallMessage::Process {
        metadata: HexString::new(metadata.into()),
        message: built_message.into(),
    });

    let ecm = borsh::to_vec(&foo).unwrap();
    format!("{:?}", ecm)
}

async fn submit_tx(built_message: &Message, metadata: &[u8]) -> String {
    let foo: MailboxCallMessage<S> = MailboxCallMessage::Process {
        metadata: HexString::new(metadata.into()),
        message: built_message.into(),
    };

    let client = MyClient::<S>::new(
        "http://localhost:12346",
        "/root/sov-hyperlane/examples/test-data/keys/token_deployer_private_key.json",
    )
    .await
    .unwrap();

    // todo don't use hard coded values
    let tx_details = TxDetails::<S> {
        max_priority_fee_bips: PriorityFeeBips::from(100),
        max_fee: 100000000,
        gas_limit: None,
        chain_id: built_message.dest_domain as u64,
    };

    let tx = client
        .build_tx::<sov_hyperlane::mailbox::Mailbox<S>>(foo, tx_details)
        .await
        .unwrap();
    let tx_bytes = borsh::to_vec(&tx).unwrap();

    BASE64_STANDARD.encode(&tx_bytes)
}

async fn get_simulate_json_query(
    message: &HyperlaneMessage,
    metadata: &[u8],
) -> ChainResult<Value> {
    let built_message = package_message(message);
    let encoded_call_message = get_encoded_call_message(&built_message, metadata);

    let res = json!(
        {
            "body":{
                "details":{
                    "chain_id":message.destination,
                    "max_fee":100000000,
                    "max_priority_fee_bips":0
                },
                "encoded_call_message":encoded_call_message,
                "nonce":message.nonce,
                "sender_pub_key": "\"f8ad2437a279e1c8932c07358c91dc4fe34864a98c6c25f298e2a0199c1509ff\""
            }
        }
    );

    Ok(res)
}

async fn get_submit_body_string(
    message: &HyperlaneMessage,
    metadata: &[u8],
) -> ChainResult<String> {
    let built_message = package_message(message);
    let res = submit_tx(&built_message, metadata).await;

    Ok(res)
}
