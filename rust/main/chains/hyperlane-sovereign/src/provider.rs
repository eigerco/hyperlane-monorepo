use async_trait::async_trait;

use hyperlane_core::{
    BlockInfo, ChainInfo, ChainResult, HyperlaneChain, HyperlaneDomain, HyperlaneProvider, TxnInfo,
    H256, U256,
};

use crate::ConnectionConf;

/// A wrapper around a Sovereign provider to get generic blockchain information.
#[derive(Debug, Clone)]
pub struct SovereignProvider {
    domain: HyperlaneDomain,
    client: SovClient,
    provider: SovProvider,
}

impl SovereignProvider {
    pub async fn new(domain: HyperlaneDomain, conf: &ConnectionConf) -> Self {
        let provider = SovProvider::new(conf);
        let client = SovClient::new(conf);

        Self {
            domain,
            client,
            provider,
        }
    }

    /// Get a grpc client.
    pub fn grpc(&self) -> &SovProvider {
        &self.provider
    }
}

impl HyperlaneChain for SovereignProvider {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.clone())
    }
}

#[async_trait]
impl HyperlaneProvider for SovereignProvider {
    async fn get_block_by_hash(&self, _hash: &H256) -> ChainResult<BlockInfo> {
        let block = self.client.get_block_by_hash().await?;
        Ok(block)
    }

    async fn get_txn_by_hash(&self, _hash: &H256) -> ChainResult<TxnInfo> {
        let txn = self.client.get_txn_by_hash().await?;
        Ok(txn)
    }

    async fn is_contract(&self, _address: &H256) -> ChainResult<bool> {
        let block = self.client.is_contract().await?;
        Ok(block)
    }

    async fn get_balance(&self, _address: String) -> ChainResult<U256> {
        let balance = self.client.get_balance().await?;
        Ok(balance)
    }

    async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        let metrics = self.client.get_chain_metrics().await?;
        Ok(metrics)
    }
}

#[derive(Clone, Debug)]
pub struct SovClient {}

impl SovClient {
    fn new(_conf: &ConnectionConf) -> Self {
        SovClient {}
    }

    async fn get_block_by_hash(&self) -> ChainResult<BlockInfo> {
        todo!()
    }

    async fn get_txn_by_hash(&self) -> ChainResult<TxnInfo> {
        todo!()
    }

    async fn is_contract(&self) -> ChainResult<bool> {
        todo!()
    }

    async fn get_balance(&self) -> ChainResult<U256> {
        todo!()
    }

    async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        todo!()
    }
}

#[derive(Clone, Debug)]
pub struct SovProvider {}

impl SovProvider {
    fn new(_conf: &ConnectionConf) -> Self {
        todo!()
    }

    pub async fn get_count(&self) -> ChainResult<u32> {
        todo!()
    }

    pub async fn get_delivered_status(&self, _message_id: u32) -> ChainResult<bool> {
        todo!()
    }

    pub async fn process_message(&self) -> ChainResult<bool> {
        todo!()
    }
}
