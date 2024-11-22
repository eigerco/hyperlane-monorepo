use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use hyperlane_core::{
    ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneMessage, HyperlaneProvider, Mailbox, TxCostEstimate, TxOutcome, H256, U256,
};
use std::{fmt::Debug, num::NonZeroU64};

/// A reference to a Mailbox contract on some Sovereign chain.
#[derive(Clone, Debug)]
pub struct SovereignMailbox {
    provider: SovereignProvider,
    domain: HyperlaneDomain,
    #[allow(dead_code)]
    config: ConnectionConf,
    address: H256,
}

impl SovereignMailbox {
    /// Create a new sovereign mailbox
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let sovereign_provider =
            SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await;

        Ok(SovereignMailbox {
            provider: sovereign_provider,
            domain: locator.domain.clone(),
            config: conf.clone(),
            address: H256::default(),
        })
    }
}

impl HyperlaneContract for SovereignMailbox {
    fn address(&self) -> H256 {
        self.address
    }
}

impl HyperlaneChain for SovereignMailbox {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

#[async_trait]
impl Mailbox for SovereignMailbox {
    async fn count(&self, lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let count = self.provider.client().get_count(lag).await?;

        Ok(count)
    }

    async fn delivered(&self, _id: H256) -> ChainResult<bool> {
        let delivered = self
            .provider
            .client()
            .get_delivered_status("message_id")
            .await?;

        Ok(delivered)
    }

    async fn default_ism(&self) -> ChainResult<H256> {
        let ism = self.provider.client().default_ism().await?;

        Ok(ism)
    }

    async fn recipient_ism(&self, _recipient: H256) -> ChainResult<H256> {
        let ism = self.provider.client().recipient_ism().await?;

        Ok(ism)
    }

    async fn process(
        &self,
        _message: &HyperlaneMessage,
        _metadata: &[u8],
        _tx_gas_limit: Option<U256>,
    ) -> ChainResult<TxOutcome> {
        let result = self.provider.client().process().await?;

        Ok(result)
    }

    async fn process_estimate_costs(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> ChainResult<TxCostEstimate> {
        let costs = self
            .provider
            .client()
            .process_estimate_costs(message, metadata)
            .await?;

        Ok(costs)
    }

    fn process_calldata(&self, _message: &HyperlaneMessage, _metadata: &[u8]) -> Vec<u8> {
        let calldata = self.provider.client().process_calldata();

        calldata
    }
}
