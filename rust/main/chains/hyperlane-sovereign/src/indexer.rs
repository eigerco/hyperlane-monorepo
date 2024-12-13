use crate::rest_client::{self, Tx, TxEvent};
use core::ops::RangeInclusive;
use hex;
use hyperlane_core::{
    ChainCommunicationError, ChainResult, Indexed, Indexer, LogMeta, SequenceAwareIndexer, H256,
    H512,
};
use std::{fmt::Debug, num::NonZeroU64};
use tracing::info;

// SovIndexer is a trait that contains default implementations for indexing
// various different event types on the Sovereign chain to reduce code duplication in
// e.g. SovereignMailboxIndexer, SovereignInterchainGasPaymasterIndexer, etc.
pub trait SovIndexer<T>: Indexer<T> + SequenceAwareIndexer<T>
where
    T: Into<Indexed<T>> + Debug + Clone,
{
    // These are the guys that need to be implemented by the concrete indexer
    fn client(&self) -> &rest_client::SovereignRestClient;
    fn decode_event(&self, event: &TxEvent) -> ChainResult<T>;
    const EVENT_KEY: &'static str;

    // Default implementation of Indexer<T>
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<T>, LogMeta)>> {
        info!("Fetching {} logs in range: {:?}", Self::EVENT_KEY, range);

        let mut results = Vec::new();

        for batch_num in range {
            let batch = self.client().get_batch(batch_num as u64).await?;
            let batch_hash = parse_hex_to_h256(&batch.hash, "invalid block hash")?;
            for tx in batch.txs.iter() {
                let events = self.process_tx(tx, batch_hash)?;
                results.extend(events);
            }
        }

        Ok(results)
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        info!(
            "sov_indexer ({}): get_finalized_block_number",
            Self::EVENT_KEY
        );
        let (_latest_slot, latest_batch) = self.client().get_latest_slot().await?;
        Ok(latest_batch.unwrap_or_default())
    }

    async fn fetch_logs_by_tx_hash(
        &self,
        tx_hash: H512,
    ) -> ChainResult<Vec<(Indexed<T>, LogMeta)>> {
        let tx_hash = format!("0x{}", tx_hash);
        let tx = self.client().get_tx_by_hash(tx_hash).await?;
        let batch = self.client().get_batch(tx.batch_number).await?;
        let batch_hash = parse_hex_to_h256(&batch.hash, "invalid block hash")?;
        self.process_tx(&tx, batch_hash)
    }

    // Default implementation of SequenceAwareIndexer<T>
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        let (latest_slot, latest_batch) = self.client().get_latest_slot().await?;
        let sequence = self
            .client()
            .get_count(NonZeroU64::new(latest_slot as u64))
            .await?;

        Ok((Some(sequence), latest_batch.unwrap_or_default()))
    }

    // Helper function to process a single transaction
    fn process_tx(&self, tx: &Tx, batch_hash: H256) -> ChainResult<Vec<(Indexed<T>, LogMeta)>> {
        let mut results = Vec::new();

        tx.events
            .iter()
            .filter(|e| e.key == Self::EVENT_KEY)
            .try_for_each(|e| -> ChainResult<()> {
                let (indexed_msg, meta) = self.process_event(tx, e, tx.batch_number, batch_hash)?;
                info!(
                    "Processed {} event : {:?} - Meta: {:?}",
                    Self::EVENT_KEY,
                    indexed_msg,
                    meta
                );
                results.push((indexed_msg, meta));
                Ok(())
            })?;
        Ok(results)
    }

    // Helper function to process a single event
    fn process_event(
        &self,
        tx: &Tx,
        event: &TxEvent,
        batch_num: u64,
        batch_hash: H256,
    ) -> ChainResult<(Indexed<T>, LogMeta)> {
        let tx_hash = parse_hex_to_h256(&tx.hash, "invalid tx hash")?;
        let thingy = self.decode_event(event)?;

        let meta = LogMeta {
            address: batch_hash, //TODO!!! this is wrong
            block_number: batch_num,
            block_hash: batch_hash,
            transaction_id: tx_hash.into(),
            transaction_index: tx.number as u64,
            log_index: event.number.into(),
        };

        Ok((thingy.into(), meta))
    }
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
