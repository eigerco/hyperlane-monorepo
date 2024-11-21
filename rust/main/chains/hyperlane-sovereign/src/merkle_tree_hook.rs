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
        let checkpoint = self.provider.client().latest_checkpoint(hook_id, lag).await?;

        Ok(checkpoint)
    }
}
