use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use hyperlane_core::{
    ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneMessage, InterchainSecurityModule, ModuleType, H256, U256,
};

#[derive(Debug)]
pub struct SovereignInterchainSecurityModule {
    domain: HyperlaneDomain,
    address: H256,
    provider: SovereignProvider,
}

impl SovereignInterchainSecurityModule {
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let provider = SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await;
        Ok(SovereignInterchainSecurityModule {
            domain: locator.domain.clone(),
            provider,
            address: locator.address,
        })
    }
}

impl HyperlaneContract for SovereignInterchainSecurityModule {
    fn address(&self) -> hyperlane_core::H256 {
        self.address
    }
}

impl HyperlaneChain for SovereignInterchainSecurityModule {
    fn domain(&self) -> &hyperlane_core::HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn hyperlane_core::HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

#[async_trait]
impl InterchainSecurityModule for SovereignInterchainSecurityModule {
    async fn dry_run_verify(
        &self,
        _message: &HyperlaneMessage,
        _metadata: &[u8],
    ) -> ChainResult<Option<U256>> {
        todo!()
    }

    async fn module_type(&self) -> ChainResult<ModuleType> {
        todo!()
    }
}
