use hyperlane_core::H256;
use serde::Deserialize;
use serde_json::Value;

/// A Sovereign Rest response payload.
#[derive(Clone, Debug, Deserialize)]
pub struct TxEvent {
    pub key: String,
    pub value: Value,
    pub number: u64,
}

/// A Sovereign Rest response payload.
#[derive(Clone, Debug, Deserialize)]
pub struct Tx {
    pub number: u64,
    pub hash: H256,
    pub events: Vec<TxEvent>,
    pub batch_number: u64,
    pub receipt: Receipt,
}

/// A Sovereign Rest response payload.
#[derive(Clone, Debug, Deserialize)]
pub struct Receipt {
    pub result: String,
    pub data: TxData,
}

/// A Sovereign Rest response payload.
#[derive(Clone, Debug, Deserialize)]
pub struct TxData {
    pub gas_used: Vec<u32>,
}

/// A Sovereign Rest response payload.
#[derive(Clone, Debug, Deserialize)]
pub struct Batch {
    pub number: u64,
    pub hash: H256,
    pub txs: Vec<Tx>,
    pub slot_number: u64,
}

/// A Sovereign Rest response payload.
#[derive(Clone, Debug, Deserialize)]
pub struct Slot {
    pub number: u64,
    pub hash: H256,
    pub batches: Vec<Batch>,
}

/// Collection of transaction statuses.
#[derive(Deserialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum TxStatus {
    Unknown,
    Dropped,
    Submitted,
    Published,
    Processed,
    Finalized,
}

/// Transaction information.
#[derive(Deserialize, Debug)]
pub struct TxInfo {
    pub id: String,
    pub status: TxStatus,
}
