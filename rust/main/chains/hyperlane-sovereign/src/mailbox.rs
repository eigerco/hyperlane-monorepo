use crate::{
    // contracts::mailbox::Mailbox as SovereignMailboxInner,
    ConnectionConf, SovereignProvider
};
use async_trait::async_trait;
use hyperlane_core::{
    ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneMessage, HyperlaneProvider, Mailbox, TxCostEstimate, TxOutcome, H256, U256,
};
use std::{
    fmt::Debug,
    num::NonZeroU64,
};

/// A reference to a Mailbox contract on some Sovereign chain.
#[derive(Clone, Debug)]
pub struct SovereignMailbox {
    // contract: SovereignMailboxInner<WalletUnlocked>,
    provider: SovereignProvider,
    domain: HyperlaneDomain,
    config: ConnectionConf
}

impl SovereignMailbox {
    /// Create a new sovereign mailbox
    pub async fn new(conf: &ConnectionConf, locator: ContractLocator<'_>) -> ChainResult<Self> {
        let sovereign_provider = SovereignProvider::new(locator.domain.clone(), &conf.clone()/*, signer*/).await;

        Ok(SovereignMailbox {
            provider: sovereign_provider,
            domain: locator.domain.clone(),
            config: conf.clone(),
        })
    }
}

impl HyperlaneContract for SovereignMailbox {
    fn address(&self) -> hyperlane_core::H256 {
        todo!("fn address(&self) -> hyperlane_core::H256")
        // self.contract.contract_id().into_h256()
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

// impl Debug for SovereignMailbox {
//     fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
//         write!(f, "{:?}", self as &dyn HyperlaneContract)
//     }
// }

#[async_trait]
impl Mailbox for SovereignMailbox {
    async fn count(&self, _lag: Option<NonZeroU64>) -> ChainResult<u32> {
        let count = self
            .provider
            .grpc()
            .get_count()
            .await?;

        Ok(count)
    }

    async fn delivered(&self, id: H256) -> ChainResult<bool> {
        let message_id = do_something_with_id(id);
        let delivered = self
            .provider
            .grpc()
            .get_delivered_status(message_id)
            .await?;

        Ok(delivered)
    }

    async fn default_ism(&self) -> ChainResult<H256> {
        todo!("async fn default_ism(&self) -> ChainResult<H256>")
    }

    async fn recipient_ism(&self, _recipient: H256) -> ChainResult<H256> {
        todo!("async fn recipient_ism(&self, recipient: H256) -> ChainResult<H256>")
    }

    async fn process(
        &self,
        _message: &HyperlaneMessage,
        _metadata: &[u8],
        _tx_gas_limit: Option<U256>,
    ) -> ChainResult<TxOutcome> {
        let delivered = self
            .provider
            .grpc()
            .process_message()
            .await?;

        Ok(todo!())
    }

    async fn process_estimate_costs(
        &self,
        _message: &HyperlaneMessage,
        _metadata: &[u8],
    ) -> ChainResult<TxCostEstimate> {
        todo!("async fn process_estimate_costs(&self, message: &HyperlaneMessage, metadata: &[u8]) -> ChainResult<TxCostEstimate>")
    }

    fn process_calldata(&self, _message: &HyperlaneMessage, _metadata: &[u8]) -> Vec<u8> {
        todo!("async fn process_calldata(&self, message: &HyperlaneMessage, metadata: &[u8]) -> Vec<u8>")
    }
}

fn do_something_with_id(id: H256) -> u32 {
    todo!()
}