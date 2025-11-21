use crate::rpc::conversion::FromRpc;
use crate::rpc::CardanoRpc;
use crate::{CardanoMailbox, ConnectionConf};
use async_trait::async_trait;
use hyperlane_core::{
    ChainCommunicationError, ChainResult, ContractLocator, HyperlaneMessage, Indexed, Indexer,
    LogMeta, SequenceAwareIndexer, H256, H512, U256,
};
use std::ops::RangeInclusive;

#[derive(Debug)]
pub struct CardanoMailboxIndexer {
    cardano_rpc: CardanoRpc,
    mailbox: CardanoMailbox,
}

impl CardanoMailboxIndexer {
    pub fn new(conf: &ConnectionConf, locator: ContractLocator) -> ChainResult<Self> {
        let cardano_rpc = CardanoRpc::new(&conf.url);
        let mailbox = CardanoMailbox::new(conf, locator, None)?;
        Ok(Self {
            cardano_rpc,
            mailbox,
        })
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        self.mailbox.finalized_block_number().await
    }
}

#[async_trait]
impl Indexer<HyperlaneMessage> for CardanoMailboxIndexer {
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<HyperlaneMessage>, LogMeta)>> {
        let from = *range.start();
        let to = *range.end();

        tracing::info!(
            "Fetching Cardano HyperlaneMessage logs from {} to {}",
            from,
            to
        );

        let response = self
            .cardano_rpc
            .get_messages_by_block_range(from, to)
            .await
            .map_err(ChainCommunicationError::from_other)?;

        let messages = response.messages;
        let mut result = Vec::new();

        for m in messages {
            // Parse the message from RPC format with proper error handling
            let message = HyperlaneMessage::from_rpc(m.message.as_ref())
                .map_err(|e| ChainCommunicationError::from_other_str(&format!(
                    "Failed to parse message at block {}: {}", m.block, e
                )))?;

            result.push((
                Indexed::new(message),
                LogMeta {
                    address: self.mailbox.outbox,
                    block_number: m.block as u64,
                    // Currently the RPC doesn't provide block_hash, transaction_id, transaction_index, or log_index
                    // These would need to be added to the messages_by_block_range RPC endpoint response
                    // For now, using placeholder values as these fields are not critical for basic operation
                    block_hash: H256::zero(),
                    transaction_id: H512::zero(),
                    transaction_index: 0,
                    log_index: U256::zero(),
                },
            ));
        }

        Ok(result)
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        self.get_finalized_block_number().await
    }
}

#[async_trait]
impl SequenceAwareIndexer<HyperlaneMessage> for CardanoMailboxIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        self.mailbox
            .tree_and_tip(None)
            .await
            .map(|(tree, tip)| (Some(tree.count() as u32), tip))
    }
}

// H256 indexer is used by the scraper agent to index delivered message IDs
// This would require an RPC endpoint like `get_delivered_messages_by_block_range`
// that returns message IDs that were delivered (processed) on Cardano in the given range.
// Since this endpoint doesn't currently exist in the RPC API, we return empty results.
#[async_trait]
impl Indexer<H256> for CardanoMailboxIndexer {
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<H256>, LogMeta)>> {
        let from = *range.start();
        let to = *range.end();

        tracing::debug!(
            "Cardano delivered message indexing not yet implemented (blocks {} to {}). \
            This requires an RPC endpoint to fetch delivered message IDs by block range.",
            from,
            to
        );

        // Return empty vector until RPC endpoint is available
        Ok(vec![])
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        self.get_finalized_block_number().await
    }
}

#[async_trait]
impl SequenceAwareIndexer<H256> for CardanoMailboxIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        // Cardano delivery indexing not yet fully implemented
        // Return None for sequence count and current block tip
        let tip = self.get_finalized_block_number().await?;
        Ok((None, tip))
    }
}
