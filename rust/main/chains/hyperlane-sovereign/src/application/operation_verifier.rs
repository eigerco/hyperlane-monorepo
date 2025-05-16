use async_trait::async_trait;
use derive_new::new;
use hyperlane_core::{Decode, HyperlaneMessage, U256};
use hyperlane_operation_verifier::{
    ApplicationOperationVerifier, ApplicationOperationVerifierReport,
};
use hyperlane_warp_route::TokenMessage;
use std::io::Cursor;

const WARP_ROUTE_MARKER: &str = "/";

/// Application operation verifier for Sovereign
#[derive(new)]
pub struct SovereignApplicationOperationVerifier {}

#[async_trait]
impl ApplicationOperationVerifier for SovereignApplicationOperationVerifier {
    async fn verify(
        &self,
        app_context: &Option<String>,
        message: &HyperlaneMessage,
    ) -> Option<ApplicationOperationVerifierReport> {
        use ApplicationOperationVerifierReport::{MalformedMessage, ZeroAmount};

        let context = match app_context {
            Some(c) => c,
            None => return None,
        };

        if !context.contains(WARP_ROUTE_MARKER) {
            return None;
        }

        // Starting from this point we assume that we are in a warp route context

        let mut reader = Cursor::new(message.body.as_slice());
        let token_message = match TokenMessage::read_from(&mut reader) {
            Ok(m) => m,
            Err(_) => return Some(MalformedMessage(message.clone())),
        };

        if token_message.amount() == U256::zero() {
            return Some(ZeroAmount);
        }

        None
    }
}
