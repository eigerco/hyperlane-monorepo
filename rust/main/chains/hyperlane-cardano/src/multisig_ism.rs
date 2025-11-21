use std::str::FromStr;

use crate::provider::CardanoProvider;
use crate::rpc::CardanoRpc;
use crate::ConnectionConf;
use async_trait::async_trait;

use hyperlane_core::{
    ChainCommunicationError, ChainResult, ContractLocator, HyperlaneChain, HyperlaneContract,
    HyperlaneDomain, HyperlaneMessage, HyperlaneProvider, MultisigIsm, H256,
};

/// MultisigIsm contract on Cardano
#[derive(Debug)]
pub struct CardanoMultisigIsm {
    cardano_rpc: CardanoRpc,
    domain: HyperlaneDomain,
    url: url::Url,
    address: H256,
}

impl CardanoMultisigIsm {
    /// Create a new Cardano CardanoMultisigIsm
    pub fn new(conf: &ConnectionConf, locator: ContractLocator) -> Self {
        let cardano_rpc = CardanoRpc::new(&conf.url);
        Self {
            cardano_rpc,
            domain: locator.domain.clone(),
            url: conf.url.clone(),
            address: locator.address,
        }
    }
}

impl HyperlaneChain for CardanoMultisigIsm {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(CardanoProvider::new(self.domain.clone(), &self.url))
    }
}

impl HyperlaneContract for CardanoMultisigIsm {
    fn address(&self) -> H256 {
        // On Cardano, this represents the MultisigIsm minting policy hash
        self.address
    }
}

#[async_trait]
impl MultisigIsm for CardanoMultisigIsm {
    /// Returns the validator and threshold needed to verify message
    async fn validators_and_threshold(
        &self,
        _message: &HyperlaneMessage,
    ) -> ChainResult<(Vec<H256>, u8)> {
        // We're using the same globally configured multisig ISM for all messages
        // Future enhancement: https://github.com/tvl-labs/hyperlane-cardano/issues/42
        // will enable per-recipient ISM configuration
        let parameters = self
            .cardano_rpc
            .get_ism_parameters()
            .await
            .map_err(ChainCommunicationError::from_other)?;

        // Parse validator addresses with proper error handling
        let validators: Result<Vec<H256>, _> = parameters
            .validators
            .iter()
            .map(|v| {
                H256::from_str(v).map_err(|e| {
                    ChainCommunicationError::from_other_str(&format!(
                        "Failed to parse validator address '{}': {}",
                        v, e
                    ))
                })
            })
            .collect();

        let validators = validators?;
        Ok((validators, parameters.threshold as u8))
    }
}
