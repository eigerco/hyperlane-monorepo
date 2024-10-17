use async_trait::async_trait;

use hyperlane_core::{
    Announcement, ChainResult, HyperlaneChain, HyperlaneContract, HyperlaneDomain,
    HyperlaneProvider, SignedType, TxOutcome, ValidatorAnnounce, H256, U256,
};
/// A reference to a ValidatorAnnounce contract on some Sovereign chain.
#[derive(Debug)]
pub struct SovereignValidatorAnnounce {}

impl HyperlaneContract for SovereignValidatorAnnounce {
    fn address(&self) -> H256 {
        todo!()
        // self.contract.address().into()
    }
}

impl HyperlaneChain for SovereignValidatorAnnounce {
    fn domain(&self) -> &HyperlaneDomain {
        todo!()
    }

    fn provider(&self) -> Box<dyn HyperlaneProvider> {
        todo!()
    }
}

#[async_trait]
impl ValidatorAnnounce for SovereignValidatorAnnounce {
    async fn get_announced_storage_locations(
        &self,
        _validators: &[H256],
    ) -> ChainResult<Vec<Vec<String>>> {
        todo!()
    }

    async fn announce(&self, _announcement: SignedType<Announcement>) -> ChainResult<TxOutcome> {
        todo!()
    }
    async fn announce_tokens_needed(
        &self,
        _announcement: SignedType<Announcement>,
    ) -> Option<U256> {
        todo!()
    }
}
