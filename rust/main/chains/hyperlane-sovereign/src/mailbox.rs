use crate::{
    indexer::SovIndexer,
    rest_client::{self, TxEvent},
    ConnectionConf, Signer, SovereignProvider,
};
use async_trait::async_trait;
use core::ops::RangeInclusive;
use hyperlane_core::{
    ChainCommunicationError, ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract,
    HyperlaneDomain, HyperlaneMessage, HyperlaneProvider, Indexed, Indexer, LogMeta, Mailbox,
    RawHyperlaneMessage, ReorgPeriod, SequenceAwareIndexer, TxCostEstimate, TxOutcome, H256, H512,
    U256,
};
use serde::Deserialize;
use std::fmt::Debug;
use tracing::instrument;

/// Struct that retrieves event data for a Sovereign Mailbox contract
#[derive(Debug, Clone)]
pub struct SovereignMailboxIndexer {
    _mailbox: SovereignMailbox,
    provider: Box<SovereignProvider>,
}

impl SovereignMailboxIndexer {
    /// Create a new `SovereignMailboxIndexer`.
    pub async fn new(
        conf: ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let mailbox = SovereignMailbox::new(&conf, locator.clone(), signer).await?;
        let provider = SovereignProvider::new(locator.domain.clone(), &conf, None).await?;

        Ok(SovereignMailboxIndexer {
            _mailbox: mailbox,
            provider: Box::new(provider),
        })
    }
}

/// A Sovereign Rest message payload.
#[derive(Debug, Clone, Deserialize)]
pub struct DispatchEvent {
    dispatch: DispatchEventInner,
}

/// A Sovereign Rest message payload.
#[derive(Debug, Clone, Deserialize)]
pub struct DispatchEventInner {
    message: String,
}

#[async_trait]
impl crate::indexer::SovIndexer<HyperlaneMessage> for SovereignMailboxIndexer {
    const EVENT_KEY: &'static str = "Mailbox/Dispatch";

    fn client(&self) -> &rest_client::SovereignRestClient {
        self.provider.client()
    }

    async fn latest_sequence(&self, at_slot: Option<u64>) -> ChainResult<Option<u32>> {
        let sequence = self.client().get_count(at_slot).await?;
        Ok(Some(sequence))
    }

    fn decode_event(&self, event: &TxEvent) -> ChainResult<HyperlaneMessage> {
        let inner_event: DispatchEvent = serde_json::from_value(event.value.clone())?;
        let hex_msg = inner_event
            .dispatch
            .message
            .strip_prefix("0x")
            .ok_or_else(|| ChainCommunicationError::ParseError {
                msg: "expected '0x' prefix in message".to_string(),
            })?;
        let raw_msg: RawHyperlaneMessage = hex::decode(hex_msg)?;
        Ok(raw_msg.into())
    }
}

#[async_trait]
impl SequenceAwareIndexer<HyperlaneMessage> for SovereignMailboxIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        <Self as SovIndexer<HyperlaneMessage>>::latest_sequence_count_and_tip(self).await
    }
}

#[async_trait]
impl Indexer<HyperlaneMessage> for SovereignMailboxIndexer {
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<HyperlaneMessage>, LogMeta)>> {
        <Self as SovIndexer<HyperlaneMessage>>::fetch_logs_in_range(self, range).await
    }

    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        <Self as SovIndexer<HyperlaneMessage>>::get_finalized_block_number(self).await
    }

    async fn fetch_logs_by_tx_hash(
        &self,
        tx_hash: H512,
    ) -> ChainResult<Vec<(Indexed<HyperlaneMessage>, LogMeta)>> {
        <Self as SovIndexer<HyperlaneMessage>>::fetch_logs_by_tx_hash(self, tx_hash).await
    }
}

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
    /// Create a new Sovereign mailbox.
    pub async fn new(
        conf: &ConnectionConf,
        locator: ContractLocator<'_>,
        signer: Option<Signer>,
    ) -> ChainResult<Self> {
        let sovereign_provider =
            SovereignProvider::new(locator.domain.clone(), &conf.clone(), signer).await?;

        Ok(SovereignMailbox {
            provider: sovereign_provider,
            domain: locator.domain.clone(),
            config: conf.clone(),
            address: locator.address,
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
    async fn count(&self, _reorg_period: &ReorgPeriod) -> ChainResult<u32> {
        let slot = self.provider.client().get_finalized_slot().await?;
        let count = self.provider.client().get_count(Some(slot)).await?;

        Ok(count)
    }

    async fn delivered(&self, id: H256) -> ChainResult<bool> {
        let delivered = self.provider.client().get_delivered_status(id).await?;

        Ok(delivered)
    }

    /// For now, there's no default ism in sov
    /// todo: revisit if it isn't needed
    async fn default_ism(&self) -> ChainResult<H256> {
        Ok(H256::default())
    }

    /// In sovereign, ISM's don't live in their own addresses
    /// so we just return the recipient address, to be later used
    /// in further queries for its ISM
    async fn recipient_ism(&self, recipient: H256) -> ChainResult<H256> {
        Ok(recipient)
    }

    #[instrument(ret, skip_all, level = "info", fields(message_id=%message.id()))]
    async fn process(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
        tx_gas_limit: Option<U256>,
    ) -> ChainResult<TxOutcome> {
        let result = self
            .provider
            .client()
            .process(message, metadata, tx_gas_limit)
            .await?;

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
        // This isn't called by any Hyperlane components, but leaving as a `todo` since we can't return an error.
        todo!("Not yet implemented")
    }
}
