use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use hyperlane_core::{
    ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneMessage, MultisigIsm, H256,
};

#[derive(Debug)]
pub struct SovereignMultisigIsm {
    domain: HyperlaneDomain,
    address: H256,
    provider: SovereignProvider,
}

impl SovereignMultisigIsm {
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let provider = SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await;
        Ok(SovereignMultisigIsm {
            domain: locator.domain.clone(),
            provider,
            address: locator.address,
        })
    }
}

impl HyperlaneContract for SovereignMultisigIsm {
    fn address(&self) -> hyperlane_core::H256 {
        self.address
    }
}

impl HyperlaneChain for SovereignMultisigIsm {
    fn domain(&self) -> &hyperlane_core::HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn hyperlane_core::HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

#[async_trait]
impl MultisigIsm for SovereignMultisigIsm {
    async fn validators_and_threshold(
        &self,
        _message: &HyperlaneMessage,
    ) -> ChainResult<(Vec<H256>, u8)> {
        todo!()
    }
}
