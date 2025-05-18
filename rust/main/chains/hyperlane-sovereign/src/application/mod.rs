use async_trait::async_trait;
use hyperlane_core::HyperlaneMessage;
use hyperlane_operation_verifier::{
    ApplicationOperationVerifier, ApplicationOperationVerifierReport,
};


/// Application operation verifier for Sovereign
pub struct SovereignApplicationOperationVerifier {
	
}

impl SovereignApplicationOperationVerifier {
	pub fn new() -> Self {
		Self {}
	}
}

#[async_trait]
impl ApplicationOperationVerifier for SovereignApplicationOperationVerifier {
    async fn verify(
        &self,
        app_context: &Option<String>,
        message: &HyperlaneMessage,
    ) -> Option<ApplicationOperationVerifierReport> {
        tracing::trace!(
            ?app_context,
            ?message,
            "Sovereign application operation verifier",
        );

		tracing::warn!("Sovereign application operation verifier is not implemented. Returning None.");
		None
    }
}
