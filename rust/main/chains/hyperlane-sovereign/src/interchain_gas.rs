use crate::{ConnectionConf, Signer, SovereignProvider};
use async_trait::async_trait;
use core::ops::RangeInclusive;
use hyperlane_core::{
    ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneProvider, Indexed, Indexer, InterchainGasPaymaster, InterchainGasPayment, LogMeta,
    SequenceAwareIndexer, H256,
};
use tracing::info;

/// A reference to a InterchainGasPaymasterIndexer contract on some Cosmos chain
#[derive(Debug, Clone)]
pub struct SovereignInterchainGasPaymasterIndexer {
    provider: Box<SovereignProvider>,
}

impl SovereignInterchainGasPaymasterIndexer {
    pub async fn new(conf: ConnectionConf, locator: ContractLocator<'_>) -> ChainResult<Self> {
        let provider = SovereignProvider::new(locator.domain.clone(), &conf, None).await;

        Ok(SovereignInterchainGasPaymasterIndexer {
            provider: Box::new(provider),
        })
    }
}

#[async_trait]
impl Indexer<InterchainGasPayment> for SovereignInterchainGasPaymasterIndexer {
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<InterchainGasPayment>, LogMeta)>> {
        info!("interchain: range:{:?}", range);
        todo!()
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        info!("interchain_gas: get_finalized_block_number");
        let (_latest_slot, latest_batch) = self.provider.client().get_latest_slot().await?;
        Ok(latest_batch.unwrap_or_default())
    }
}

#[async_trait]
impl SequenceAwareIndexer<InterchainGasPayment> for SovereignInterchainGasPaymasterIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        let (latest_slot, latest_batch) = self.provider.client().get_latest_slot().await?;
        let sequence = self
            .provider
            .client()
            .get_count(NonZeroU64::new(latest_slot as u64))
            .await?;

        Ok((Some(sequence), latest_batch.unwrap_or_default()))
    }
}

#[derive(Debug)]
pub struct SovereignInterchainGasPaymaster {
    domain: HyperlaneDomain,
    address: H256,
    provider: SovereignProvider,
}

impl SovereignInterchainGasPaymaster {
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let provider = SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await;
        Ok(SovereignInterchainGasPaymaster {
            domain: locator.domain.clone(),
            provider,
            address: locator.address,
        })
    }
}

impl HyperlaneContract for SovereignInterchainGasPaymaster {
    fn address(&self) -> H256 {
        self.address
    }
}

impl HyperlaneChain for SovereignInterchainGasPaymaster {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.provider.clone())
    }
}

#[async_trait]
impl InterchainGasPaymaster for SovereignInterchainGasPaymaster {}
