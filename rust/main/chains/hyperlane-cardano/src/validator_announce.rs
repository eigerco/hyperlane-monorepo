use crate::provider::CardanoProvider;
use crate::rpc::CardanoRpc;
use crate::ConnectionConf;
use async_trait::async_trait;
use hyperlane_core::{
    Announcement, ChainCommunicationError, ChainResult, ContractLocator, FixedPointNumber,
    HyperlaneChain, HyperlaneContract, HyperlaneDomain, HyperlaneProvider, SignedType, TxOutcome,
    ValidatorAnnounce, H256, H512, U256,
};

#[derive(Debug)]
pub struct CardanoValidatorAnnounce {
    cardano_rpc: CardanoRpc,
    domain: HyperlaneDomain,
    url: url::Url,
    address: H256,
}

impl CardanoValidatorAnnounce {
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

impl HyperlaneContract for CardanoValidatorAnnounce {
    fn address(&self) -> H256 {
        // On Cardano, this represents the validator announce minting policy hash
        self.address
    }
}

impl HyperlaneChain for CardanoValidatorAnnounce {
    fn domain(&self) -> &HyperlaneDomain {
        &self.domain
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        Box::new(CardanoProvider::new(self.domain.clone(), &self.url))
    }
}

#[async_trait]
impl ValidatorAnnounce for CardanoValidatorAnnounce {
    async fn get_announced_storage_locations(
        &self,
        validators: &[H256],
    ) -> ChainResult<Vec<Vec<String>>> {
        self.cardano_rpc
            .get_validator_storage_locations(validators)
            .await
            .map_err(ChainCommunicationError::from_other)
    }

    async fn announce(&self, _announcement: SignedType<Announcement>) -> ChainResult<TxOutcome> {
        // Auto-announcing validators on Cardano is not implemented because:
        // 1. Validator announcements are managed off-chain via the RPC server
        // 2. The get_validator_storage_locations RPC endpoint handles retrieving announcements
        // 3. Validators announce their storage locations through the centralized RPC service
        //    rather than on-chain transactions
        // This returns a no-op transaction to satisfy the trait requirements
        Ok(TxOutcome {
            transaction_id: H512::zero(),
            executed: false,
            gas_used: U256::zero(),
            gas_price: FixedPointNumber::zero(),
        })
    }

    async fn announce_tokens_needed(
        &self,
        _announcement: SignedType<Announcement>,
        _chain_signer: H256,
    ) -> Option<U256> {
        // No tokens needed for validator announcements on Cardano
        // since announcements are handled off-chain via the RPC server
        Some(U256::zero())
    }
}
