use crate::{
    indexer::SovIndexer,
    rest_client::{to_bech32, SovereignRestClient, TxEvent},
    ConnectionConf, Signer, SovereignProvider,
};
use async_trait::async_trait;
use bech32::{self, Bech32m, Hrp};
use core::ops::RangeInclusive;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, ChainResult, Checkpoint, ContractLocator,
    HyperlaneChain, HyperlaneContract, HyperlaneDomain, HyperlaneProvider, Indexed, Indexer,
    LogMeta, MerkleTreeHook, MerkleTreeInsertion, SequenceAwareIndexer, H256, H512,
};
use std::num::NonZeroU64;

/// Struct that retrieves event data for a Cosmos Mailbox contract
#[derive(Debug, Clone)]
pub struct SovereignMerkleTreeHookIndexer {
    provider: Box<SovereignProvider>,
    bech32_address: String,
}

impl SovereignMerkleTreeHookIndexer {
    pub async fn new(
        conf: ConnectionConf,
        locator: ContractLocator<'_>,
        _signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let provider = SovereignProvider::new(locator.domain.clone(), &conf, None).await;

        let hrp = Hrp::parse("sov").expect("valid hrp"); // todo: put in config?
        let mut bech32_address = String::new();
        // TODO: How to check if address is actually 28 bytes
        let addr_224 = &locator.address.as_ref()[..28];
        bech32::encode_to_fmt::<Bech32m, String>(&mut bech32_address, hrp, addr_224)
            .expect("failed to encode to buffer");

        Ok(SovereignMerkleTreeHookIndexer {
            provider: Box::new(provider),
            bech32_address: bech32_address,
        })
    }
}

#[async_trait]
impl crate::indexer::SovIndexer<MerkleTreeInsertion> for SovereignMerkleTreeHookIndexer {
    const EVENT_KEY: &'static str = "Merkle/InsertedIntoTree";

    fn client(&self) -> &SovereignRestClient {
        &self.provider.client()
    }

    async fn sequence_at_slot(&self, slot: u32) -> ChainResult<Option<u32>> {
        let sequence = self
            .client()
            .tree(&self.bech32_address, NonZeroU64::new(slot as u64))
            .await?;
        Ok(Some(sequence.count as u32))
    }
    fn decode_event(&self, _event: &TxEvent) -> ChainResult<MerkleTreeInsertion> {
        todo!()
    }
}

#[async_trait]
impl SequenceAwareIndexer<MerkleTreeInsertion> for SovereignMerkleTreeHookIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        <Self as SovIndexer<MerkleTreeInsertion>>::latest_sequence_count_and_tip(self).await
    }
}

#[async_trait]
impl Indexer<MerkleTreeInsertion> for SovereignMerkleTreeHookIndexer {
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<MerkleTreeInsertion>, LogMeta)>> {
        <Self as SovIndexer<MerkleTreeInsertion>>::fetch_logs_in_range(self, range).await
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        <Self as SovIndexer<MerkleTreeInsertion>>::get_finalized_block_number(self).await
    }

    async fn fetch_logs_by_tx_hash(
        &self,
        tx_hash: H512,
    ) -> ChainResult<Vec<(Indexed<MerkleTreeInsertion>, LogMeta)>> {
        <Self as SovIndexer<MerkleTreeInsertion>>::fetch_logs_by_tx_hash(self, tx_hash).await
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
        let hook_id = to_bech32(self.address);
        let tree = self.provider.client().tree(&hook_id, lag).await?;

        Ok(tree)
    }

    async fn count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let hook_id = to_bech32(self.address);
        let tree = self.provider.client().tree(&hook_id, lag).await?;

        Ok(tree.count as u32)
    }

    async fn latest_checkpoint(&self, lag: Option<NonZeroU64>) -> ChainResult<Checkpoint> {
        let hook_id = to_bech32(self.address);
        let checkpoint = self
            .provider
            .client()
            .latest_checkpoint(&hook_id, lag)
            .await?;

        Ok(checkpoint)
    }
}
