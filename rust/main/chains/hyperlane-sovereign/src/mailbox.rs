use crate::{
    rest_client::{Tx, TxEvent},
    ConnectionConf, Signer, SovereignProvider,
};
use async_trait::async_trait;
use core::ops::RangeInclusive;
use hex;
use hyperlane_core::{
    ChainCommunicationError, ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract,
    HyperlaneDomain, HyperlaneMessage, HyperlaneProvider, Indexed, Indexer, LogMeta, Mailbox,
    RawHyperlaneMessage, SequenceAwareIndexer, TxCostEstimate, TxOutcome, H256, H512, U256,
};
use serde::Deserialize;
use std::{fmt::Debug, num::NonZeroU64};
use tracing::info;

/// Struct that retrieves event data for a Cosmos Mailbox contract
#[derive(Debug, Clone)]
pub struct SovereignMailboxIndexer {
    mailbox: SovereignMailbox,
    provider: Box<SovereignProvider>,
}

impl SovereignMailboxIndexer {
    pub async fn new(
        conf: ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let mailbox = SovereignMailbox::new(&conf, locator.clone(), signer).await?;
        let provider = SovereignProvider::new(locator.domain.clone(), &conf, None).await;

        Ok(SovereignMailboxIndexer {
            mailbox,
            provider: Box::new(provider),
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct DispatchEvent {
    dispatch: DispatchEventInner,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DispatchEventInner {
    message: String,
}

fn parse_hex_to_h256(hex: &String, error_msg: &str) -> Result<H256, ChainCommunicationError> {
    hex_to_h256(hex).ok_or(ChainCommunicationError::ParseError {
        msg: error_msg.to_string(),
    })
}

fn hex_to_h256(hex: &String) -> Option<H256> {
    hex.strip_prefix("0x")
        .and_then(|h| hex::decode(h).ok())
        .and_then(|bytes| bytes.try_into().ok())
        .map(|array: [u8; 32]| H256::from_slice(&array))
}

// Helper function to process a single event
fn process_event(
    tx: &Tx,
    event: &TxEvent,
    batch_num: u64,
    batch_hash: H256,
) -> ChainResult<(Indexed<HyperlaneMessage>, LogMeta)> {
    let tx_hash = parse_hex_to_h256(&tx.hash, "invalid tx hash")?;
    let inner_event: DispatchEvent = serde_json::from_value(event.value.clone())?;
    let hex_msg = inner_event
        .dispatch
        .message
        .strip_prefix("0x")
        .ok_or_else(|| ChainCommunicationError::ParseError {
            msg: "expected '0x' prefix in message".to_string(),
        })?;
    let raw_msg: RawHyperlaneMessage = hex::decode(hex_msg)?;
    let message: HyperlaneMessage = raw_msg.into();

    let meta = LogMeta {
        address: message.sender,
        block_number: batch_num,
        block_hash: batch_hash,
        transaction_id: tx_hash.into(),
        transaction_index: tx.number as u64,
        log_index: event.number.into(),
    };

    Ok((message.into(), meta))
}

fn process_tx(tx: &Tx, batch_hash: H256) -> ChainResult<Vec<(Indexed<HyperlaneMessage>, LogMeta)>> {
    let mut results = Vec::new();

    tx.events
        .iter()
        .filter(|e| e.key == "Mailbox/Dispatch")
        .try_for_each(|e| -> ChainResult<()> {
            let (indexed_msg, meta) = process_event(tx, e, tx.batch_number, batch_hash)?;
            info!(
                "Processed mailbox dispatch: {:?} - Meta: {:?}",
                indexed_msg, meta
            );
            results.push((indexed_msg, meta));
            Ok(())
        })?;
    Ok(results)
}

#[async_trait]
impl Indexer<HyperlaneMessage> for SovereignMailboxIndexer {
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<HyperlaneMessage>, LogMeta)>> {
        info!("Fetching mailbox logs in range: {:?}", range);

        let mut results = Vec::new();

        for batch_num in range {
            let batch = self.provider.client().get_batch(batch_num as u64).await?;
            let batch_hash = parse_hex_to_h256(&batch.hash, "invalid block hash")?;
            for tx in batch.txs.iter() {
                let events = process_tx(tx, batch_hash)?;
                results.extend(events);
            }
        }

        Ok(results)
    }

    async fn fetch_logs_by_tx_hash(
        &self,
        tx_hash: H512,
    ) -> ChainResult<Vec<(Indexed<HyperlaneMessage>, LogMeta)>> {
        let tx_hash = format!("0x{}", tx_hash);
        let tx = self.provider.client().get_tx_by_hash(tx_hash).await?;
        let batch = self.provider.client().get_batch(tx.batch_number).await?;
        let batch_hash = parse_hex_to_h256(&batch.hash, "invalid block hash")?;
        process_tx(&tx, batch_hash)
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        info!("mailbox: get_finalized_block_number");
        let (_latest_slot, latest_batch) = self.provider.client().get_latest_slot().await?;
        Ok(latest_batch.unwrap_or_default())
    }
}

#[async_trait]
impl SequenceAwareIndexer<HyperlaneMessage> for SovereignMailboxIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        let (latest_slot, latest_batch) = self.provider.client().get_latest_slot().await?;
        let sequence = self
            .provider
            .client()
            .get_count(NonZeroU64::new(latest_slot as u64))
            .await?;

        Ok((Some(sequence), latest_batch.unwrap_or_default()))
    }
}

/// A reference to a Mailbox contract on some Sovereign chain.
#[derive(Clone, Debug)]
pub struct SovereignMailbox {
    provider: SovereignProvider,
    domain: HyperlaneDomain,
    #[allow(dead_code)]
    config: ConnectionConf,
    address: H256,
}

impl SovereignMailbox {
    /// Create a new sovereign mailbox
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let sovereign_provider =
            SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await;

        Ok(SovereignMailbox {
            provider: sovereign_provider,
            domain: locator.domain.clone(),
            config: conf.clone(),
            address: H256::default(),
        })
    }
}

impl HyperlaneContract for SovereignMailbox {
    fn address(&self) -> H256 {
        self.address
    }
}

impl HyperlaneChain for SovereignMailbox {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

#[async_trait]
impl Mailbox for SovereignMailbox {
    async fn count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let count = self.provider.client().get_count(lag).await?;

        Ok(count)
    }

    async fn delivered(&self, _id: H256) -> ChainResult<bool> {
        let delivered = self
            .provider
            .client()
            .get_delivered_status("message_id")
            .await?;

        Ok(delivered)
    }

    async fn default_ism(&self) -> ChainResult<H256> {
        let ism = self.provider.client().default_ism().await?;

        Ok(ism)
    }

    async fn recipient_ism(&self, _recipient: H256) -> ChainResult<H256> {
        let ism = self.provider.client().recipient_ism().await?;

        Ok(ism)
    }

    async fn process(
        &self,
        _message: &HyperlaneMessage,
        _metadata: &[u8],
        _tx_gas_limit: Option<U256>,
    ) -> ChainResult<TxOutcome> {
        let result = self.provider.client().process().await?;

        Ok(result)
    }

    async fn process_estimate_costs(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> ChainResult<TxCostEstimate> {
        let costs = self
            .provider
            .client()
            .process_estimate_costs(message, metadata)
            .await?;

        Ok(costs)
    }

    fn process_calldata(&self, _message: &HyperlaneMessage, _metadata: &[u8]) -> Vec<u8> {
        let calldata = self.provider.client().process_calldata();

        calldata
    }
}
