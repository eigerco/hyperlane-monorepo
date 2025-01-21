use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use hyperlane_core::{
    Announcement, ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneProvider, SignedType, TxOutcome, ValidatorAnnounce, H256, U256,
};
use tracing::info;

/// A reference to a `ValidatorAnnounce` contract on some Sovereign chain.
#[derive(Debug)]
pub struct SovereignValidatorAnnounce {
    domain: HyperlaneDomain,
    provider: SovereignProvider,
    address: H256,
}

impl SovereignValidatorAnnounce {
    /// Create a new Sovereign `ValidatorAnnounce`.
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> Self {
        let provider = SovereignProvider::new(locator.domain.clone(), conf, signer).await;

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
        validators: &[H256],
    ) -> ChainResult<Vec<Vec<String>>> {
        info!("{:?}", validators);
        let storage_locations = self
            .provider
            .client()
            .get_announced_storage_locations(validators)?;

        Ok(storage_locations)
    }

    async fn announce(&self, _announcement: SignedType<Announcement>) -> ChainResult<TxOutcome> {
        // let result = self.provider.client().announce().await?;

        // Ok(result)
        todo!()
    }

    async fn announce_tokens_needed(
        &self,
        _announcement: SignedType<Announcement>,
    ) -> Option<U256> {
        // let tokens = self.provider.client().announce_tokens_needed().await?;

        // Some(tokens)
        todo!()
    }
}
