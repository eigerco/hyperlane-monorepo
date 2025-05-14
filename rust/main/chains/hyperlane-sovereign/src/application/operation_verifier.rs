// use std::io::Cursor;

use async_trait::async_trait;
use derive_new::new;
// use tracing::trace;

use hyperlane_core::{
    // Decode,
    HyperlaneMessage,
    // HyperlaneProvider, U256
};
use hyperlane_operation_verifier::{
    ApplicationOperationVerifier, ApplicationOperationVerifierReport,
};
// use hyperlane_warp_route::TokenMessage;

// const WARP_ROUTE_MARKER: &str = "/";

/// Application operation verifier for Sovereign
#[derive(new)]
pub struct SovereignApplicationOperationVerifier {}

#[async_trait]
impl ApplicationOperationVerifier for SovereignApplicationOperationVerifier {
    async fn verify(
        &self,
        _app_context: &Option<String>,
        _message: &HyperlaneMessage,
    ) -> Option<ApplicationOperationVerifierReport> {
        None
    }
}
