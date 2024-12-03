use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use hyperlane_core::{
    SequenceAwareIndexer, MerkleTreeInsertion, Indexer, LogMeta, Indexed,
    accumulator::incremental::IncrementalMerkle, ChainResult, Checkpoint, ContractLocator,
    HyperlaneChain, HyperlaneContract, HyperlaneDomain, HyperlaneProvider, MerkleTreeHook, H256,
};
use std::num::NonZeroU64;
use core::ops::RangeInclusive;
use tracing::info; 

/// Struct that retrieves event data for a Cosmos Mailbox contract
#[derive(Debug, Clone)]
pub struct SovereignMerkleTreeHookIndexer {
    // mailbox: SovereignMailbox,
    provider: Box<SovereignProvider>,
}

impl SovereignMerkleTreeHookIndexer {
    pub async fn new(conf: ConnectionConf, locator: ContractLocator<'_>, signer: Option<Signer>) -> ChainResult<Self> {
        // let mailbox = SovereignMailbox::new(&conf, locator.clone(), signer).await?;
        let provider = SovereignProvider::new(locator.domain.clone(), &conf, None).await;

        Ok(SovereignMerkleTreeHookIndexer {
            // mailbox,
            provider: Box::new(provider)
        })
    }
}

#[async_trait]
impl Indexer<MerkleTreeInsertion> for SovereignMerkleTreeHookIndexer {
    async fn fetch_logs_in_range(&self, range: RangeInclusive<u32>) -> ChainResult<Vec<(Indexed<MerkleTreeInsertion>, LogMeta)>> {
        info!("merkle_tree: range:{:?}", range);
        todo!()
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        info!("merkle_tree_hook: get_finalized_block_number");
        todo!()
    }
}

#[async_trait]
impl SequenceAwareIndexer<MerkleTreeInsertion> for SovereignMerkleTreeHookIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        let tip = u32::default();
        let sequence = u32::default();

        Ok((Some(sequence), tip))
    }
}

#[derive(Debug)]
pub struct SovereignMerkleTreeHook {
    domain: HyperlaneDomain,
    address: H256,
    provider: SovereignProvider,
}

impl SovereignMerkleTreeHook {
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let provider = SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await;
        Ok(SovereignMerkleTreeHook {
            domain: locator.domain.clone(),
            provider,
            address: locator.address,
        })
    }
}

impl HyperlaneChain for SovereignMerkleTreeHook {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

impl HyperlaneContract for SovereignMerkleTreeHook {
    fn address(&self) -> H256 {
        self.address
    }
}

#[async_trait]
impl MerkleTreeHook for SovereignMerkleTreeHook {
    async fn tree(&self, lag: Option<NonZeroU64>) -> ChainResult<IncrementalMerkle> {
        let hook_id = "sov13vs5w9ysv5z6nrew8pexe7p76hlld0pdc09z8epd3wjyxuht6fhsjpa6ec";
        let tree = self.provider.client().tree(hook_id, lag).await?;

        Ok(tree)
    }

    async fn count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let hook_id = "sov13vs5w9ysv5z6nrew8pexe7p76hlld0pdc09z8epd3wjyxuht6fhsjpa6ec";
        let tree = self.provider.client().tree(hook_id, lag).await?;

        Ok(tree.count as u32)
    }

    async fn latest_checkpoint(&self, lag: Option<NonZeroU64>) -> ChainResult<Checkpoint> {
        let hook_id = "sov13vs5w9ysv5z6nrew8pexe7p76hlld0pdc09z8epd3wjyxuht6fhsjpa6ec";
        let checkpoint = self
            .provider
            .client()
            .latest_checkpoint(hook_id, lag)
            .await?;

        Ok(checkpoint)
    }
}
