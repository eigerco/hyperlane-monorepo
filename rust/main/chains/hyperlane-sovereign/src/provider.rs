use async_trait::async_trait;

use hyperlane_core::{BlockInfo, ChainInfo, ChainResult, HyperlaneChain, HyperlaneDomain, HyperlaneProvider, TxnInfo, H256, U256};

use crate::{ConnectionConf, Signer};

/// A wrapper around a Sovereign provider to get generic blockchain information.
#[derive(Debug, Clone)]
pub struct SovereignProvider {
    domain: HyperlaneDomain,
    // provider: Provider,
    // client: FuelClient,
}

impl SovereignProvider {
    pub async fn new(domain: HyperlaneDomain, _conf: &ConnectionConf, _signer: Option<Signer>) -> Self {
        Self {
            domain
        }
    }
}

impl HyperlaneChain for SovereignProvider {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(self.clone())
        // Box::new(SovereignProvider {
        //     domain: self.domain.clone(),
        //     // rpc_client: self.rpc_client.clone(),
        // })
    }
}

#[async_trait]
impl HyperlaneProvider for SovereignProvider {
    async fn get_block_by_hash(&self, _hash: &H256) -> ChainResult<BlockInfo> {
        todo!()
    }

    async fn get_txn_by_hash(&self, _hash: &H256) -> ChainResult<TxnInfo> {
        todo!()
    }

    async fn is_contract(&self, _address: &H256) -> ChainResult<bool> {
        todo!()
    }

    async fn get_balance(&self, _address: String) -> ChainResult<U256> {
        todo!()
    }

    async fn get_chain_metrics(&self) -> ChainResult<Option<ChainInfo>> {
        Ok(None)
    }
}
