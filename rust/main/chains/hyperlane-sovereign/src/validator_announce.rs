use crate::{ConnectionConf, SovereignProvider};

use async_trait::async_trait;

use hyperlane_core::{
    Announcement, ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneProvider, SignedType, TxOutcome, ValidatorAnnounce, H256, U256,
};

/// A reference to a ValidatorAnnounce contract on some Sovereign chain.
#[derive(Debug)]
pub struct SovereignValidatorAnnounce {
    domain: HyperlaneDomain,
    provider: SovereignProvider,
    address: H256,
}

impl SovereignValidatorAnnounce {
    /// Create a new Sovereign ValidatorAnnounce.
    pub async fn new(conf: &ConnectionConf, locator: ContractLocator<'_>) -> Self {
        let provider = SovereignProvider::new(locator.domain.clone(), conf).await;
        Self {
            domain: locator.domain.clone(),
            provider,
            address: locator.address,
        }
    }
}

impl HyperlaneContract for SovereignValidatorAnnounce {
    fn address(&self) -> H256 {
        self.address
    }
}

impl HyperlaneChain for SovereignValidatorAnnounce {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

#[async_trait]
impl ValidatorAnnounce for SovereignValidatorAnnounce {
    async fn get_announced_storage_locations(
        &self,
        _validators: &[H256],
    ) -> ChainResult<Vec<Vec<String>>> {
        todo!()
    }

    async fn announce(&self, _announcement: SignedType<Announcement>) -> ChainResult<TxOutcome> {
        todo!()
    }

    async fn announce_tokens_needed(
        &self,
        _announcement: SignedType<Announcement>,
    ) -> Option<U256> {
        todo!()
    }
}