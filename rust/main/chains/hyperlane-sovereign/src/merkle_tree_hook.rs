use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use hyperlane_core::{
    accumulator::incremental::IncrementalMerkle, ChainResult, Checkpoint, ContractLocator,
    HyperlaneChain, HyperlaneContract, HyperlaneDomain, HyperlaneProvider, MerkleTreeHook, H256,
};
use std::num::NonZeroU64;

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
    async fn tree(&self, _lag: Option<NonZeroU64>) -> ChainResult<IncrementalMerkle> {
        let tree = self.provider.client().tree().await?;

        Ok(tree)
    }

    async fn count(&self, _lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let count = self.provider.client().count().await?;

        Ok(count)
    }

    async fn latest_checkpoint(&self, _lag: Option<NonZeroU64>) -> ChainResult<Checkpoint> {
        let checkpoint = self.provider.client().latest_checkpoint().await?;

        Ok(checkpoint)
    }
}
