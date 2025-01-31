use crate::ConnectionConf;
use base64::prelude::*;
use bech32::{Bech32m, Hrp};
use borsh;
use bytes::Bytes;
use demo_hl_rollup_client::MyClient;
use demo_stf;
use demo_stf::runtime::RuntimeCall;
use hyperlane_core::RawHyperlaneMessage;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, Announcement, BlockInfo, ChainCommunicationError,
    ChainInfo, ChainResult, Checkpoint, FixedPointNumber, HyperlaneMessage, ModuleType, SignedType,
    TxCostEstimate, TxOutcome, TxnInfo, TxnReceiptInfo, H160, H256, H512, U256,
};
use reqwest::StatusCode;
use reqwest::{header::HeaderMap, Client, Response};
use serde::Deserialize;
use serde_json::{json, Value};
use sov_address::MultiAddressEvm;
use sov_hyperlane::mailbox::CallMessage as MailboxCallMessage;
use sov_hyperlane::types::Message;
use sov_hyperlane::validator_announce::CallMessage as ValidatorAnnounceCallMessage;
use sov_modules_api::prelude::tracing;
use sov_modules_api::SizedSafeString;
use sov_modules_api::{
    configurable_spec::ConfigurableSpec,
    execution_mode::Native,
    transaction::{PriorityFeeBips, TxDetails},
};
use sov_rollup_interface::common::{HexHash, HexString};
use sov_test_utils::{MockDaSpec, MockZkvm, MockZkvmCryptoSpec};
use std::{fmt::Debug, num::NonZeroU64, str::FromStr};
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
    let hrp = Hrp::parse("sov")
        .map_err(|e| ChainCommunicationError::CustomError(format!("Failed to parse Hrp: {e:?}")))?;
    let mut bech32_address = String::new();
    let addr = input.as_ref();

    match addr.len() {
        28 => {
            bech32::encode_to_fmt::<Bech32m, String>(&mut bech32_address, hrp, addr).map_err(
                |e| ChainCommunicationError::CustomError(format!("bech32 encoding error: {e:?}")),
            )?;

            Ok(bech32_address)
        }
        32 if addr[..4] == [0, 0, 0, 0] => {
            bech32::encode_to_fmt::<Bech32m, String>(&mut bech32_address, hrp, &addr[4..])
                .map_err(|e| {
                    ChainCommunicationError::CustomError(format!("bech32 encoding error: {e:?}"))
                })?;

            Ok(bech32_address)
        }
        _ => Err(ChainCommunicationError::CustomError(format!(
            "bech_32 encoding error: Address must be 28 bytes, received {addr:?}"
        ))),
    }
}

fn from_bech32(input: &str) -> ChainResult<H256> {
    let (_, slice) = bech32::decode(input).map_err(|e| {
        ChainCommunicationError::CustomError(format!("bech32 decoding error: {e:?}"))
    })?;

    match slice.len() {
        28 => {
            let mut array = [0u8; 32];
            array[4..].copy_from_slice(slice.as_ref());
            Ok(H256::from_slice(&array))
        }
        _ => Err(ChainCommunicationError::CustomError(format!(
            "bech_32 encoding error: Address must be 28 bytes, received {slice:?}"
        ))),
    }
}

fn try_h256_to_string(input: H256) -> ChainResult<String> {
    if input[..12].iter().any(|&byte| byte != 0) {
        return Err(ChainCommunicationError::CustomError(
            "Input value exceeds size of H160".to_string(),
        ));
    }

    Ok(format!("{:?}", H160::from(input)))
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
        match response.status() {
            StatusCode::OK => {
                // 200
                let response = response.bytes().await?;
                Ok(response)
            }
            StatusCode::BAD_REQUEST => {
                // 400
                let response = response.bytes().await?;
                Ok(response)
            }
            StatusCode::NOT_FOUND => {
                // 404
                let response = response.bytes().await?;
                Ok(response)
            }
            _ => {
                response.error_for_status_ref()?;
                let bytes = response.bytes().await?; // Extract the body as Bytes
                Ok(bytes)
            }
        }
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
        let query = format!("/modules/accounts/state/credential-ids/items/{key}");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let response = response.data.clone().and_then(|d| d.value).ok_or_else(|| {
            ChainCommunicationError::CustomError(String::from("Data contained None"))
        })?;

        if response.is_empty() {
            Err(ChainCommunicationError::CustomError(String::from(
                "Received empty list",
            )))
        } else {
            Ok(response
                .first()
                .ok_or(ChainCommunicationError::CustomError(String::from(
                    "Failed to get first item",
                )))?
                .clone())
        }
    }

    pub async fn get_nonce(&self, key: &str) -> ChainResult<u32> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _key: Option<String>,
            value: Option<u32>,
        }

        // /modules/nonces/state/nonces/items/{key}
        let query = format!("/modules/nonces/state/nonces/items/{key}");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let response = response.data.and_then(|d| d.value).ok_or_else(|| {
            ChainCommunicationError::CustomError(String::from("Data contained None"))
        })?;
        Ok(response)
    }

    // @Provider - test working
    pub async fn get_block_by_hash(&self, tx_id: &H256) -> ChainResult<BlockInfo> {
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
        let children = 0;
        let query = format!("/ledger/txs/{:?}?children={}", tx_id.clone(), children);

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        if let Some(response_data) = response.data {
            if let (Some(hash), Some(number)) = (response_data.hash, response_data.number) {
                Ok(BlockInfo {
                    hash: H256::from_str(hash.as_str())?,
                    timestamp: u64::default(),
                    number,
                })
            } else {
                Err(ChainCommunicationError::CustomError(String::from(
                    "Bad response",
                )))
            }
        } else {
            Err(ChainCommunicationError::CustomError(String::from(
                "Bad response",
            )))
        }
    }

    // @Provider - test working
    pub async fn get_txn_by_hash(&self, tx_hash: &H256) -> ChainResult<TxnInfo> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            id: Option<String>,
            _status: Option<String>,
        }

        // /sequencer/txs/{txHash}
        let query = format!("/sequencer/txs/{tx_hash:?}");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let res = TxnInfo {
            hash: H256::from_str(
                response
                    .data
                    .and_then(|d| d.id)
                    .ok_or(ChainCommunicationError::CustomError(
                        "Invalid response".to_string(),
                    ))?
                    .as_str(),
            )?,
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
        let query = format!("/ledger/batches/{batch}?children=1");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Batch> = serde_json::from_slice(&response)?;

        response.data.ok_or_else(|| {
            ChainCommunicationError::CustomError(
                "Invalid response: missing batch field".to_string(),
            )
        })
    }

    pub async fn get_tx_by_hash(&self, tx_id: String) -> ChainResult<Tx> {
        let query = format!("/ledger/txs/{tx_id}?children=1");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Tx> = serde_json::from_slice(&response)?;

        response.data.ok_or_else(|| {
            ChainCommunicationError::CustomError("Invalid response: missing tx field".to_string())
        })
    }

    // Return the latest slot, and the highest committed batch number in that slot.
    pub async fn get_latest_slot(&self) -> ChainResult<(u32, Option<u32>)> {
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
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let data = response.data.ok_or(ChainCommunicationError::CustomError(
            "Invalid response".to_string(),
        ))?;

        // bach_range.end is exclusive - it's one above the last committed batch number
        let last_batch = data.batch_range.end.checked_sub(1);

        Ok((data.number, last_batch))
    }

    // @Provider - test working, need to test all variants
    pub async fn is_contract(&self, key: H256) -> ChainResult<bool> {
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
                ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}"))
            })?;
            let response: Schema<Data> = serde_json::from_slice(&response)?;

            if response.data.and_then(|data| data.key).is_some() {
                return Ok(true);
            }
        }
        Ok(false)
    }

    // @Provider
    pub fn get_balance(&self, _token_id: &str, _address: &str) -> ChainResult<U256> {
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

        // let response = U256::from(response);
        Ok(U256::default())
    }

    // @Provider
    pub fn _get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        todo!("Not yet implemented")
    }

    // @Mailbox - test working
    pub async fn get_count(&self, at_height: Option<NonZeroU64>) -> ChainResult<u32> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<u32>,
        }

        // /modules/mailbox/state/nonce
        let query = match at_height {
            Some(lag) => format!("/modules/mailbox/state/nonce?rollup_height={lag}"),
            None => "/modules/mailbox/state/nonce".to_owned(),
        };

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let response = response
            .data
            .and_then(|data| data.value)
            .unwrap_or_default();

        Ok(response)
    }

    // @Mailbox
    pub async fn get_delivered_status(&self, message_id: H256) -> ChainResult<bool> {
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
        let query = format!("/modules/mailbox/state/deliveries/items/{message_id:?}");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        Ok(response.data.is_some())
    }

    // @Mailbox - test working
    pub async fn default_ism(&self) -> ChainResult<H256> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            value: Option<String>,
        }

        let query = "/modules/mailbox/state/default-ism";

        let response = self
            .http_get(query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let addr_bech32 = response.data.and_then(|d| d.value).ok_or_else(|| {
            ChainCommunicationError::CustomError(String::from("Data contained None"))
        })?;
        from_bech32(&addr_bech32)
    }

    // @Mailbox
    pub async fn recipient_ism(&self, recipient_id: H256) -> ChainResult<H256> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            address: Option<String>,
        }

        let recipient_bech32 = to_bech32(recipient_id)?;

        let query = format!("/modules/mailbox-recipient-registry/{recipient_bech32}/ism");

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let addr_bech32 = response.data.and_then(|d| d.address).ok_or_else(|| {
            ChainCommunicationError::CustomError(String::from("Data contained None"))
        })?;
        from_bech32(&addr_bech32)
    }

    // @Mailbox - test working
    pub async fn process(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
        _tx_gas_limit: Option<U256>,
    ) -> ChainResult<TxOutcome> {
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

        // /sequencer/txs
        let query = "/sequencer/txs";

        let body = get_submit_body_string(message, metadata, self.url.as_str()).await?;
        let json = json!({"body":body});
        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {e}")))?;
        let response: Schema<TxData> = serde_json::from_slice(&response)?;

        let result = match response.data.and_then(|d| d.status) {
            Some(s) => s == *"submitted",
            None => false,
        };

        // /sequencer/batches
        let query = "/sequencer/batches";

        let json = json!(
            {
                "transactions":[body]
            }
        );
        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {e}")))?;

        let _response: Schema<BatchData> = serde_json::from_slice(&response)?;

        let res = TxOutcome {
            transaction_id: H512::default(),
            executed: result,
            gas_used: U256::default(),
            gas_price: FixedPointNumber::default(),
        };

        Ok(res)
    }

    // @Mailbox
    pub async fn process_estimate_costs(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> ChainResult<TxCostEstimate> {
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

        let json = get_simulate_json_query(message, metadata)?;

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let gas_price = FixedPointNumber::from(
            response
                .clone()
                .data
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from("data contained None"))
                })?
                .apply_tx_result
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from(
                        "apply_tx_result contained None",
                    ))
                })?
                .transaction_consumption
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from(
                        "transaction_consumption contained None",
                    ))
                })?
                .gas_price
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from("gas_price contained None"))
                })?
                .first()
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from("Failed to get item(0)"))
                })?,
        );

        let gas_limit = U256::from(
            *response
                .data
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from("data contained None"))
                })?
                .apply_tx_result
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from(
                        "apply_tx_result contained None",
                    ))
                })?
                .transaction_consumption
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from(
                        "transaction_consumption contained None",
                    ))
                })?
                .base_fee
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from("base_fee contained None"))
                })?
                .first()
                .ok_or_else(|| {
                    ChainCommunicationError::CustomError(String::from("Failed to get item(0)"))
                })?,
        );

        let res = TxCostEstimate {
            gas_limit,
            gas_price,
            l2_gas_limit: None,
        };

        Ok(res)
    }

    // @Mailbox
    pub fn _process_calldata(&self) -> Vec<u8> {
        todo!("Not yet implemented")
    }

    // @ISM
    pub async fn dry_run(&self) -> ChainResult<Option<U256>> {
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

        let response = self
            .http_post(query, &json)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Error: {e}")))?;
        let _response: Schema<Data> = serde_json::from_slice(&response)?;

        Ok(None)
    }

    // @ISM - test working
    pub async fn module_type(&self, ism_id: H256) -> ChainResult<ModuleType> {
        let query = format!(
            "/modules/mailbox-ism-registry/{}/module_type/",
            to_bech32(ism_id)?
        );

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<u32> = serde_json::from_slice(&response)?;

        match response.data.ok_or_else(|| {
            ChainCommunicationError::CustomError(String::from("Data contained None"))
        })? {
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
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            count: Option<usize>,
            branch: Option<Vec<String>>,
        }

        // /mailbox-hook-merkle-tree/{hook_id}/tree
        let query = match slot {
            Some(lag) => {
                format!("modules/mailbox-hook-merkle-tree/{hook_id}/tree?rollup_height={lag}")
            }
            None => {
                format!("modules/mailbox-hook-merkle-tree/{hook_id}/tree")
            }
        };

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let mut incremental_merkle = IncrementalMerkle {
            count: response.clone().data.and_then(|d| d.count).ok_or_else(|| {
                ChainCommunicationError::ParseError {
                    msg: String::from("Empty field"),
                }
            })?,
            ..Default::default()
        };
        response
            .data
            .and_then(|d| d.branch)
            .ok_or_else(|| {
                ChainCommunicationError::CustomError(String::from("Data contained None"))
            })?
            .into_iter()
            .enumerate()
            .for_each(|(i, f)| incremental_merkle.branch[i] = H256::from_str(&f).unwrap());

        Ok(incremental_merkle)
    }

    // @Merkle Tree Hook - test working, need to find better test condition
    pub async fn latest_checkpoint(
        &self,
        hook_id: &str,
        lag: Option<NonZeroU64>,
    ) -> ChainResult<Checkpoint> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            index: Option<u32>,
            root: Option<String>,
        }

        // /mailbox-hook-merkle-tree/{hook_id}/checkpoint
        let query = match lag {
            Some(lag) => {
                format!("modules/mailbox-hook-merkle-tree/{hook_id}/checkpoint?rollup_height={lag}")
            }
            None => {
                format!("modules/mailbox-hook-merkle-tree/{hook_id}/checkpoint")
            }
        };

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let response = Checkpoint {
            merkle_tree_hook_address: from_bech32(hook_id)?,
            mailbox_domain: 4321,
            root: H256::from_str(&response.data.clone().and_then(|d| d.root).ok_or_else(
                || ChainCommunicationError::ParseError {
                    msg: String::from("Empty field"),
                },
            )?)?,
            index: response.data.clone().and_then(|d| d.index).ok_or_else(|| {
                ChainCommunicationError::ParseError {
                    msg: String::from("Empty field"),
                }
            })?,
        };

        Ok(response)
    }

    // @MultiSig ISM
    pub async fn validators_and_threshold(
        &self,
        message: &HyperlaneMessage,
    ) -> ChainResult<(Vec<H256>, u8)> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            validators: Option<Vec<String>>,
            threshold: Option<u8>,
        }

        let ism_id = self.recipient_ism(message.recipient).await?;
        let ism_id = to_bech32(ism_id)?;

        let message = hex::encode(RawHyperlaneMessage::from(message));
        let message = format!("0x{message}");

        // /modules/mailbox-ism-registry/{ism_id}/validators_and_threshold
        let query = format!(
            "/modules/mailbox-ism-registry/{ism_id}/validators_and_threshold?data={message}"
        );

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let threshold = response.data.clone().and_then(|d| d.threshold).ok_or(
            ChainCommunicationError::CustomError(String::from("Threshold contained None")),
        )?;
        let mut validators: Vec<H256> = Vec::new();
        response
            .data
            .and_then(|d| d.validators)
            .ok_or(ChainCommunicationError::CustomError(String::from(
                "Threshold contained None",
            )))?
            .iter()
            .for_each(|v| {
                let address =
                    H256::from_str(&format!("0x{:0>64}", v.trim_start_matches("0x"))).unwrap();
                validators.push(address);
            });

        let res = (validators, threshold);

        Ok(res)
    }

    // @Routing ISM
    pub fn _route(&self) -> ChainResult<H256> {
        todo!("Not yet implemented")
    }

    // @Validator Announce
    pub async fn get_announced_storage_locations(
        &self,
        validators: &[H256],
    ) -> ChainResult<Vec<Vec<String>>> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _key: Option<String>,
            value: Option<Vec<String>>,
        }

        // /modules/mailbox-va/state/storage-locations/items/{key}
        let mut res = Vec::new();

        for (i, v) in validators.iter().enumerate() {
            res.push(vec![]);
            let validator = try_h256_to_string(*v)?;

            let query = format!("/modules/mailbox-va/state/storage-locations/items/{validator}");

            let response = self.http_get(&query).await.map_err(|e| {
                ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}"))
            })?;
            let response: Schema<Data> = serde_json::from_slice(&response)?;

            if let Some(data) = response.data {
                res[i].push(String::new());
                if let Some(storage_locations) = data.value {
                    storage_locations
                        .into_iter()
                        .enumerate()
                        .for_each(|(j, storage_location)| {
                            res[i][j] = storage_location;
                        });
                }
            }
        }

        Ok(res)
    }

    // @Validator Announce
    pub async fn announce(&self, announcement: SignedType<Announcement>) -> ChainResult<TxOutcome> {
        #[derive(Clone, Debug, Deserialize)]
        struct Data {
            _key: Option<String>,
            _value: Option<Vec<String>>,
        }

        // /modules/mailbox-va/state/storage-locations/items/{key}
        // check if already registered
        let query = format!(
            "/modules/mailbox-va/state/storage-locations/items/{:?}",
            announcement.value.validator
        );

        let response = self
            .http_get(&query)
            .await
            .map_err(|e| ChainCommunicationError::CustomError(format!("HTTP Get Error: {e}")))?;
        let response: Schema<Data> = serde_json::from_slice(&response)?;

        let mut tx_outcome = TxOutcome {
            transaction_id: H512::default(),
            executed: bool::default(),
            gas_used: U256::default(),
            gas_price: FixedPointNumber::default(),
        };
        if response.data.is_none() {
            let res = announce_validator(announcement, self.url.as_str()).await?;
            tx_outcome.executed = true;
            let tx_id = &format!("0x{:0>128}", res.trim_start_matches("0x"));
            tx_outcome.transaction_id = H512::from_str(tx_id)?;
        };

        Ok(tx_outcome)
    }

    // @Validator Announce
    pub fn _announce_tokens_needed(&self) -> Option<U256> {
        todo!("Not yet implemented")
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
        body: HexString::new(message.body.clone()),
    }
}

fn get_encoded_call_message(built_message: &Message, metadata: &[u8]) -> ChainResult<String> {
    let runtime_call: RuntimeCall<S> = RuntimeCall::Mailbox(MailboxCallMessage::Process {
        metadata: HexString::new(metadata.into()),
        message: built_message.into(),
    });

    match borsh::to_vec(&runtime_call) {
        Ok(ecm) => Ok(format!("{ecm:?}")),
        Err(e) => Err(ChainCommunicationError::CustomError(format!(
            "Failed to encode to borsh vector: {e:?}"
        ))),
    }
}

async fn submit_va_tx(
    built_message: &Message,
    announcement: SignedType<Announcement>,
    api_url: &str,
) -> ChainResult<String> {
    let storage_location_new = announcement.value.storage_location;
    let storage_location_new = SizedSafeString::from_str(&storage_location_new).map_err(|e| {
        ChainCommunicationError::CustomError(format!("Failed to parse storage location: {e:?}"))
    })?;

    let eth_hyperlane: hyperlane_core::H160 = announcement.value.validator;
    let eth_bytes: [u8; 20] = eth_hyperlane.into();
    let validator_address_new: sov_hyperlane::crypto::EthAddr = eth_bytes.into();

    let sig_hyperlane = announcement.signature;

    let sig_bytes: [u8; 65] = sig_hyperlane.into();
    let signature_new: sov_hyperlane::types::RecoverableSignature = sig_bytes.as_ref().into();

    let validator_announce_call_message: ValidatorAnnounceCallMessage =
        ValidatorAnnounceCallMessage::Announce {
            validator_address: validator_address_new,
            storage_location: storage_location_new,
            signature: signature_new,
        };

    let client = get_client(api_url).await?;
    let tx_details = get_tx_details(u64::from(built_message.dest_domain));

    let tx = client
        .build_tx::<sov_hyperlane::validator_announce::ValidatorAnnounce<S>>(
            validator_announce_call_message,
            tx_details,
        )
        .await
        .map_err(|e| ChainCommunicationError::CustomError(format!("{e:?}")))?;

    let tx_hash = client
        .submit_tx(tx)
        .await
        .map_err(|e| ChainCommunicationError::CustomError(format!("{e:?}")))?;
    let res = format!("{tx_hash}");

    Ok(res)
}

async fn get_client(api_url: &str) -> ChainResult<MyClient<S>> {
    MyClient::<S>::new(
        api_url,
        "/root/sov-hyperlane/examples/test-data/keys/token_deployer_private_key.json",
    )
    .await
    .map_err(|e| {
        ChainCommunicationError::CustomError(format!(
            "Failed to locate token_deployer_private_key.json: {e:?}"
        ))
    })
}

fn get_tx_details(chain_id: u64) -> TxDetails<S> {
    TxDetails::<S> {
        max_priority_fee_bips: PriorityFeeBips::from(100),
        max_fee: 100_000_000,
        gas_limit: None,
        chain_id,
    }
}

async fn submit_tx(built_message: &Message, metadata: &[u8], api_url: &str) -> ChainResult<String> {
    let mailbox_call_message: MailboxCallMessage<S> = MailboxCallMessage::Process {
        metadata: HexString::new(metadata.into()),
        message: built_message.into(),
    };

    let client = get_client(api_url).await?;
    let tx_details = get_tx_details(u64::from(built_message.dest_domain));

    let tx = client
        .build_tx::<sov_hyperlane::mailbox::Mailbox<S>>(mailbox_call_message, tx_details)
        .await
        .map_err(|e| ChainCommunicationError::CustomError(format!("{e:?}")))?;

    match borsh::to_vec(&tx) {
        Ok(tx_bytes) => Ok(BASE64_STANDARD.encode(&tx_bytes)),
        Err(e) => Err(ChainCommunicationError::CustomError(format!(
            "Failed to encode to borsh vector: {e:?}"
        ))),
    }
}

fn get_simulate_json_query(message: &HyperlaneMessage, metadata: &[u8]) -> ChainResult<Value> {
    let built_message = package_message(message);
    let encoded_call_message = get_encoded_call_message(&built_message, metadata)?;

    let res = json!(
        {
            "body":{
                "details":{
                    "chain_id":message.destination,
                    "max_fee":100_000_000,
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
    api_url: &str,
) -> ChainResult<String> {
    let built_message = package_message(message);
    submit_tx(&built_message, metadata, api_url).await
}

async fn announce_validator(
    announcement: SignedType<Announcement>,
    api_url: &str,
) -> ChainResult<String> {
    let message = HyperlaneMessage {
        destination: announcement.value.mailbox_domain,
        ..Default::default()
    };

    let built_message = package_message(&message);
    submit_va_tx(&built_message, announcement, api_url).await
}

#[cfg(test)]
mod test {
    use super::*;
    use hyperlane_core::config::OperationBatchConfig;

    const ISM_ADDRESS: &str = "sov1kljj6q26lwdm2mqej4tjp9j0rf5tr2afdfafg4z89ynmu0t74wc";
    const MERKLE_TREE_HOOK_ADDRESS: &str =
        "sov1ec9z5gpln6htpyh8f5whhvp65was8vrwac5jw5mh9ec9g07rrad";

    fn setup() -> ConnectionConf {
        let conf = ConnectionConf {
            operation_batch: OperationBatchConfig::default(),
            url: Url::parse("http://127.0.0.1:12346").unwrap(),
        };

        conf
    }

    #[test]
    fn test_try_h256_to_string() {
        let input =
            H256::from_str("0x00000000000000000000000014dc79964da2c08b23698b3d3cc7ca32193d9955")
                .unwrap();
        let res = try_h256_to_string(input).unwrap();
        assert_eq!(
            String::from("0x14dc79964da2c08b23698b3d3cc7ca32193d9955"),
            res
        );
    }

    #[test]
    fn test_try_h256_to_string_too_short() {
        let input =
            H256::from_str("0x000000000000000000000000000000000000000000000000000000000000beef")
                .unwrap();
        let res = try_h256_to_string(input).unwrap();
        assert_eq!(
            String::from("0x000000000000000000000000000000000000beef"),
            res
        );
    }

    #[test]
    fn test_try_h256_to_string_too_long() {
        let input =
            H256::from_str("000000000e0a2a203f9eaeb092e74d1d7bb03aa3bb03b06eee292753772e7054")
                .unwrap();
        let res = try_h256_to_string(input);
        if res.is_err() {
            assert!(true)
        }
    }

    #[test]
    fn test_package_message() {
        let message = HyperlaneMessage::default();
        let res = package_message(&message);
        let message = Message {
            version: 3,
            nonce: u32::default(),
            origin_domain: u32::default(),
            dest_domain: u32::default(),
            sender: HexHash::new(H256::zero().into()),
            recipient: HexHash::new(H256::zero().into()),
            body: HexString::new(vec![]),
        };
        assert_eq!(message, res)
    }

    #[test]
    fn test_get_tx_details() {
        let chain_id = 54321;
        let res = get_tx_details(chain_id);
        let xxx = TxDetails::<S> {
            max_priority_fee_bips: PriorityFeeBips::from(100),
            max_fee: 100_000_000,
            gas_limit: None,
            chain_id,
        };
        assert_eq!(xxx, res);
    }

    #[test]
    fn test_to_bech32_left_padded_ok() {
        let address =
            H256::from_str("0x00000000b7e52d015afb9bb56c19955720964f1a68b1aba96a7a9454472927be")
                .unwrap();
        let res = to_bech32(address).unwrap();
        let address = String::from(ISM_ADDRESS);
        assert_eq!(address, res)
    }

    #[test]
    fn test_to_bech32_right_padded_err() {
        let address =
            H256::from_str("0xb7e52d015afb9bb56c19955720964f1a68b1aba96a7a9454472927be00000000")
                .unwrap();
        assert!(to_bech32(address).is_err())
    }

    #[test]
    fn test_from_bech32() {
        let res = from_bech32(ISM_ADDRESS).unwrap();
        let address =
            H256::from_str("0x00000000b7e52d015afb9bb56c19955720964f1a68b1aba96a7a9454472927be")
                .unwrap();
        assert_eq!(address, res)
    }

    #[test]
    fn test_from_bech32_err() {
        let incorrect_address = "sov1kljj6q26lwdm2mqej4tyuiuhjp9j0rf5tr2afdfafg4z89ynmu0t74wc";
        assert!(from_bech32(incorrect_address).is_err())
    }

    #[tokio::test]
    async fn test_is_contract_true() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let address = from_bech32(ISM_ADDRESS).unwrap();
        let res = xxx.is_contract(address).await.unwrap();
        assert_eq!(true, res)
    }

    #[tokio::test]
    async fn test_get_batch() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let batch = 0;
        let res = xxx.get_batch(batch).await.unwrap();
        assert_eq!(0, res.number);
        assert_eq!(
            "0xb7e4ebbd30cc52da1755ceefa6ac2426d2f4e96b83e3acbe3122639d189de1af",
            res.hash
        )
    }

    #[tokio::test]
    async fn test_get_latest_slot() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let res = xxx.get_latest_slot().await.unwrap();
        assert_ne!(0, res.0)
    }

    #[tokio::test]
    async fn test_is_contract_false() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let address =
            H256::from_str("0x00000000000000000000000000000000000000000000000000000000deadbeef")
                .unwrap();
        let res = xxx.is_contract(address).await.unwrap();
        assert_eq!(false, res)
    }

    #[tokio::test]
    async fn test_get_tx_by_hash() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let tx_id =
            String::from("0xe2c30a5b24c2e44466bb98af2321bf9e46caf0d31b5acac510915c8af688247e");
        let res = xxx.get_tx_by_hash(tx_id).await.unwrap();
        assert_eq!(
            String::from("0xe2c30a5b24c2e44466bb98af2321bf9e46caf0d31b5acac510915c8af688247e"),
            res.hash
        )
    }

    #[tokio::test]
    async fn test_latest_checkpoint() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let res = xxx
            .latest_checkpoint(MERKLE_TREE_HOOK_ADDRESS, None)
            .await
            .unwrap();
        let address =
            H256::from_str("0x1e5a517c45fd07e4d34a0c3cb8853cb73bf99123e72e52d30bb842ff4357ede2")
                .unwrap();
        assert_eq!(0, res.index);
        assert_eq!(address, res.root)
    }

    #[tokio::test]
    async fn test_get_count() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let at_height = Some(NonZeroU64::new(60941).unwrap());
        let res = xxx.get_count(at_height).await.unwrap();
        assert_eq!(0, res)
    }

    #[ignore]
    #[tokio::test]
    async fn test_get_delivered_status_true() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let message_id =
            H256::from_str("0x066e3ab5daa10c0583bd2ff2c05fe5f35a4efc2f9854ba27be11bda48d1e7bd2")
                .unwrap();
        let res = xxx.get_delivered_status(message_id).await.unwrap();
        assert_eq!(true, res)
    }

    #[tokio::test]
    async fn test_get_delivered_status_false() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let message_id = H256::default();
        let res = xxx.get_delivered_status(message_id).await.unwrap();
        assert_eq!(false, res)
    }

    #[tokio::test]
    async fn test_process() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let message = &HyperlaneMessage {
            version: 3,
            nonce: u32::default(),
            origin: 54321,
            destination: 54321,
            recipient: H256::from_str(
                "0x000000003e734a45a54c76add3ce38070db1c6eb29af168effa59dc239e90d50",
            )
            .unwrap(),
            sender: H256::from_str(
                "0x00000000fea6ac5b8751120fb62fff67b54d2eac66aef307c7dde1d394dea1e0",
            )
            .unwrap(),
            body: hex::decode("30786465616462656566").unwrap(),
        };
        let metadata = vec![
            0, 0, 0, 0, 206, 10, 42, 32, 63, 158, 174, 176, 146, 231, 77, 29, 123, 176, 58, 163,
            187, 3, 176, 110, 238, 41, 39, 83, 119, 46, 112, 84, 30, 90, 81, 124, 69, 253, 7, 228,
            211, 74, 12, 60, 184, 133, 60, 183, 59, 249, 145, 35, 231, 46, 82, 211, 11, 184, 66,
            255, 67, 87, 237, 226, 0, 0, 0, 0, 207, 176, 56, 106, 99, 85, 44, 121, 232, 24, 125,
            17, 144, 253, 99, 68, 50, 254, 4, 84, 195, 0, 43, 158, 122, 238, 101, 161, 85, 95, 32,
            90, 3, 216, 125, 183, 99, 127, 119, 130, 219, 67, 194, 155, 3, 53, 132, 243, 141, 209,
            10, 251, 167, 237, 253, 116, 118, 51, 79, 18, 199, 145, 65, 72, 27, 222, 20, 48, 81,
            159, 179, 125, 65, 12, 217, 86, 26, 65, 83, 168, 229, 170, 209, 81, 31, 154, 137, 151,
            93, 126, 65, 62, 94, 3, 150, 30, 94, 2, 24, 225, 212, 218, 146, 59, 30, 209, 38, 94,
            29, 116, 32, 7, 48, 175, 177, 84, 104, 183, 115, 171, 201, 77, 216, 138, 211, 39, 198,
            27, 137, 28,
        ];
        let tx_gas_limit = Some(U256::from(269));
        let res = xxx.process(message, &metadata, tx_gas_limit).await.unwrap();
        println!("res: {res:?}");
        assert_eq!(true, res.executed)
    }

    #[tokio::test]
    async fn test_process_estimate_costs() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let message = &HyperlaneMessage::default();
        let metadata = [0, 0];
        let res = xxx
            .process_estimate_costs(message, &metadata)
            .await
            .unwrap();
        println!("res: {res:?}");
        assert_eq!(U256::from(5), res.gas_limit);
        assert_eq!(FixedPointNumber::from(7), res.gas_price)
    }

    #[tokio::test]
    async fn test_default_ism() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let res = xxx.default_ism().await.unwrap();
        let address = from_bech32(ISM_ADDRESS).unwrap();
        assert_eq!(address, res)
    }

    #[tokio::test]
    async fn test_recipient_ism() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let recipient_id =
            H256::from_str("0x000000003e734a45a54c76add3ce38070db1c6eb29af168effa59dc239e90d50")
                .unwrap();
        let res = xxx.recipient_ism(recipient_id).await.unwrap();
        let address =
            from_bech32("sov15wl544kq5qf6rrpw3d7xg40k7gtjsnwn5kyqx2ar5axdcwexn30").unwrap();
        assert_eq!(address, res)
    }

    #[tokio::test]
    async fn test_dry_run() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let res = xxx.dry_run().await.unwrap();
        assert_eq!(None, res)
    }

    #[tokio::test]
    async fn test_tree() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let res = xxx.tree(MERKLE_TREE_HOOK_ADDRESS, None).await.unwrap();
        assert_eq!(1, res.count)
    }

    #[tokio::test]
    async fn test_module_type() {
        let conf = setup();
        let xxx = SovereignRestClient::new(&conf);
        let address =
            from_bech32("sov15wl544kq5qf6rrpw3d7xg40k7gtjsnwn5kyqx2ar5axdcwexn30").unwrap(); // ISM Address
        let res = xxx.module_type(address).await.unwrap();
        assert_eq!(ModuleType::MessageIdMultisig, res)
    }

    #[ignore]
    #[tokio::test]
    async fn validators_and_threshold() {}

    #[ignore]
    #[tokio::test]
    async fn get_announced_storage_locations() {}

    #[ignore]
    #[tokio::test]
    async fn announce() {}
}
