use crate::{ConnectionConf, Signer};
use async_trait::async_trait;
use hyperlane_core::{
    BlockInfo, ChainInfo, ChainResult, HyperlaneChain, HyperlaneDomain, HyperlaneProvider, TxnInfo,
    H256, U256,
};
use tracing::info;

mod rest_client;

/// A wrapper around a Sovereign provider to get generic blockchain information.
#[derive(Debug, Clone)]
pub struct SovereignProvider {
    domain: HyperlaneDomain,
    client: rest_client::SovereignRestClient,
    #[allow(dead_code)]
    signer: Option<Signer>,
}

impl SovereignProvider {
    pub async fn new(
        domain: HyperlaneDomain,
        conf: &ConnectionConf,
        signer: Option<Signer>,
    ) -> Self {
        let client = rest_client::SovereignRestClient::new(conf);

        Self {
            domain,
            client,
            signer,
        }
    }

    /// Get a rest client.
    pub(crate) fn client(&self) -> &rest_client::SovereignRestClient {
        &self.client
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
    async fn get_block_by_hash(&self, hash: &H256) -> ChainResult<BlockInfo> {
        let block = self.client.get_block_by_hash(hash).await?;
        Ok(block)
    }

    async fn get_txn_by_hash(&self, hash: &H256) -> ChainResult<TxnInfo> {
        let txn = self.client.get_txn_by_hash(hash).await?;
        Ok(txn)
    }

    async fn is_contract(&self, _address: &H256) -> ChainResult<bool> {
        let address = "sov1hsm838n6rc5pgdjxgg5c9rup04np9aa5wltxty0lj657qe9uex9qx6twad";
        let block = self.client.is_contract(address).await?;
        Ok(block)
    }

    async fn get_balance(&self, address: String) -> ChainResult<U256> {
        info!("get_balance(&self, address: String)");
        let token_id = "token_1nyl0e0yweragfsatygt24zmd8jrr2vqtvdfptzjhxkguz2xxx3vs0y07u7";
        let balance = self.client.get_balance(token_id, address.as_str()).await?;
        Ok(balance)
    }

    async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        let metrics = self.client.get_chain_metrics().await?;
        Ok(metrics)
    }
}
