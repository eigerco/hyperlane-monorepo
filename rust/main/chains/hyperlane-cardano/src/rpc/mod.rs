use hex::ToHex;
use hyperlane_cardano_rpc_rust_client::apis::configuration::Configuration;
use hyperlane_cardano_rpc_rust_client::apis::default_api::{
    estimate_inbound_message_fee, get_validator_storage_locations, inbox_ism_parameters,
    is_inbox_message_delivered, last_finalized_block, merkle_tree, messages_by_block_range,
    submit_inbound_message, EstimateInboundMessageFeeError, GetValidatorStorageLocationsError,
    InboxIsmParametersError, IsInboxMessageDeliveredError, LastFinalizedBlockError,
    MerkleTreeError, MessagesByBlockRangeError, SubmitInboundMessageError,
};
use hyperlane_cardano_rpc_rust_client::apis::Error;
use hyperlane_cardano_rpc_rust_client::models::{
    EstimateInboundMessageFee200Response,
    EstimateInboundMessageFeeRequest as InboundMessageRequest,
    EstimateInboundMessageFeeRequestMessage, GetValidatorStorageLocationsRequest,
    InboxIsmParameters200Response, IsInboxMessageDelivered200Response, MerkleTree200Response,
    MessagesByBlockRange200Response, SubmitInboundMessage200Response,
};
use hyperlane_core::{Decode, HyperlaneProtocolError};
use url::Url;

use hyperlane_core::{HyperlaneMessage, H256};

pub mod conversion;

#[derive(Debug)]
pub struct CardanoMessageMetadata {
    origin_mailbox: H256,
    checkpoint_root: H256,
    signatures: Vec<String>, // [u8; 64] is more precise than String
}

impl Decode for CardanoMessageMetadata {
    fn read_from<R>(reader: &mut R) -> Result<Self, HyperlaneProtocolError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        let mut origin_mailbox = H256::zero();
        reader.read_exact(&mut origin_mailbox.as_mut())?;

        let mut checkpoint_root = H256::zero();
        reader.read_exact(checkpoint_root.as_mut())?;

        let mut signatures = vec![];
        reader.read_to_end(&mut signatures)?;

        Ok(Self {
            origin_mailbox,
            checkpoint_root,
            signatures: signatures
                .chunks(65)
                // Cardano checks raw signatures without the last byte
                .map(|s| hex::encode(&s[0..s.len() - 1]))
                .collect(),
        })
    }
}

#[derive(Debug)]
pub struct CardanoRpc(Configuration);

impl CardanoRpc {
    pub fn new(url: &Url) -> CardanoRpc {
        // Note: Client::builder().build() only fails if the TLS backend is unavailable,
        // which should never happen in practice with default features
        let client = reqwest::Client::builder()
            .build()
            .expect("Failed to build HTTP client - TLS backend unavailable");
        Self(Configuration {
            base_path: url.to_string().trim_end_matches("/").to_string(),
            client,
            ..Configuration::new().clone()
        })
    }

    pub async fn get_finalized_block_number(&self) -> Result<u32, Error<LastFinalizedBlockError>> {
        last_finalized_block(&self.0).await.and_then(|r| {
            r.last_finalized_block
                .map(|block| block as u32)
                .ok_or_else(|| {
                    Error::from(std::io::Error::new(
                        std::io::ErrorKind::InvalidData,
                        "RPC returned null for last_finalized_block. \
                        The OpenAPI spec should mark this field as required (non-nullable).",
                    ))
                })
        })
    }

    pub async fn get_messages_by_block_range(
        &self,
        from_block: u32,
        to_block: u32,
    ) -> Result<MessagesByBlockRange200Response, Error<MessagesByBlockRangeError>> {
        messages_by_block_range(&self.0, from_block, to_block).await
    }

    pub async fn get_latest_merkle_tree(
        &self,
    ) -> Result<MerkleTree200Response, Error<MerkleTreeError>> {
        merkle_tree(&self.0).await
    }

    pub async fn get_ism_parameters(
        &self,
    ) -> Result<InboxIsmParameters200Response, Error<InboxIsmParametersError>> {
        inbox_ism_parameters(&self.0).await
    }

    pub async fn is_inbox_message_delivered(
        &self,
        message_id: H256,
    ) -> Result<IsInboxMessageDelivered200Response, Error<IsInboxMessageDeliveredError>> {
        is_inbox_message_delivered(&self.0, message_id.encode_hex::<String>().as_str()).await
    }

    pub async fn estimate_inbox_message_fee(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> Result<EstimateInboundMessageFee200Response, Error<EstimateInboundMessageFeeError>> {
        let parsed_metadata = CardanoMessageMetadata::read_from(&mut &metadata[..])
            .map_err(|e| {
                Error::from(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Failed to parse CardanoMessageMetadata: {}", e),
                ))
            })?;
        estimate_inbound_message_fee(
            &self.0,
            InboundMessageRequest {
                origin_mailbox: format!(
                    "0x{}",
                    parsed_metadata.origin_mailbox.encode_hex::<String>()
                ),
                checkpoint_root: format!(
                    "0x{}",
                    parsed_metadata.checkpoint_root.encode_hex::<String>()
                ),
                message: Box::new(EstimateInboundMessageFeeRequestMessage {
                    version: message.version as u32,
                    nonce: message.nonce,
                    origin_domain: message.origin,
                    sender: format!("0x{}", message.sender.encode_hex::<String>()),
                    destination_domain: message.destination,
                    recipient: format!("0x{}", message.recipient.encode_hex::<String>()),
                    message: format!("0x{}", message.body.encode_hex::<String>()),
                }),
                signatures: parsed_metadata.signatures,
            },
        )
        .await
    }

    pub async fn submit_inbox_message(
        &self,
        message: &HyperlaneMessage,
        metadata: &[u8],
    ) -> Result<SubmitInboundMessage200Response, Error<SubmitInboundMessageError>> {
        let parsed_metadata = CardanoMessageMetadata::read_from(&mut &metadata[..])
            .map_err(|e| {
                Error::from(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Failed to parse CardanoMessageMetadata: {}", e),
                ))
            })?;
        submit_inbound_message(
            &self.0,
            InboundMessageRequest {
                origin_mailbox: format!(
                    "0x{}",
                    parsed_metadata.origin_mailbox.encode_hex::<String>()
                ),
                checkpoint_root: format!(
                    "0x{}",
                    parsed_metadata.checkpoint_root.encode_hex::<String>()
                ),
                message: Box::new(EstimateInboundMessageFeeRequestMessage {
                    version: message.version as u32,
                    nonce: message.nonce,
                    origin_domain: message.origin,
                    sender: format!("0x{}", message.sender.encode_hex::<String>()),
                    destination_domain: message.destination,
                    recipient: format!("0x{}", message.recipient.encode_hex::<String>()),
                    message: format!("0x{}", message.body.encode_hex::<String>()),
                }),
                signatures: parsed_metadata.signatures,
            },
        )
        .await
    }

    pub async fn get_validator_storage_locations(
        &self,
        validator_addresses: &[H256],
    ) -> Result<Vec<Vec<String>>, Error<GetValidatorStorageLocationsError>> {
        let validator_addresses: Vec<String> = validator_addresses
            .iter()
            .map(|v| format!("0x{}", v.encode_hex::<String>()))
            .collect();
        let validator_storage_locations = get_validator_storage_locations(
            &self.0,
            GetValidatorStorageLocationsRequest {
                validator_addresses,
            },
        )
        .await?;
        let result = validator_storage_locations
            .validator_storage_locations
            .iter()
            .map(|vs| vec![String::from(&vs.storage_location)])
            .collect();
        Ok(result)
    }

    /// Get gas payments by block range
    ///
    /// This method fetches interchain gas payments made on Cardano within the specified block range.
    /// Gas payments are UTXOs or transaction metadata that indicate payment for message delivery gas costs.
    ///
    /// **RPC Endpoint Required:** `GET /gas-payments-by-block-range?from={from_block}&to={to_block}`
    ///
    /// **Expected Response Format:**
    /// ```json
    /// {
    ///   "gas_payments": [
    ///     {
    ///       "message_id": "0x1234...", // H256 as hex string
    ///       "destination_domain": 1,    // u32
    ///       "payment": 1000000,         // u64 (lovelace)
    ///       "gas_amount": 200000,       // u64 (destination gas units)
    ///       "block": 12345,             // u32
    ///       "transaction_id": "0x...",  // Optional: H512 as hex string
    ///       "transaction_index": 0,     // Optional: u32
    ///       "log_index": 0              // Optional: u64
    ///     }
    ///   ]
    /// }
    /// ```
    ///
    /// **Implementation Notes:**
    /// - Until this RPC endpoint is available, this method will return an error
    /// - The gas payment indexer will gracefully handle this error and return empty results
    /// - Gas payments are typically recorded as:
    ///   1. UTXOs sent to the IGP (Interchain Gas Paymaster) address
    ///   2. Transaction metadata in the same tx that dispatches the message
    ///   3. Reference outputs with payment information
    pub async fn get_gas_payments_by_block_range(
        &self,
        from_block: u32,
        to_block: u32,
    ) -> Result<GasPaymentsByBlockRangeResponse, Box<dyn std::error::Error + Send + Sync>> {
        // TODO: Once the RPC endpoint is available in the OpenAPI spec:
        // 1. Add it to hyperlane-cardano-rpc-rust-client generation
        // 2. Import the generated function
        // 3. Call: gas_payments_by_block_range(&self.0, from_block, to_block).await

        Err(format!(
            "RPC endpoint 'gas_payments_by_block_range' not yet implemented. \
            To enable gas payment indexing, the Cardano RPC server needs to implement \
            GET /gas-payments-by-block-range?from={}&to={} endpoint. \
            See the method documentation for expected response format.",
            from_block, to_block
        ).into())
    }
}

/// Response structure for gas payments by block range
/// This will be replaced by the OpenAPI-generated type once the endpoint is added
#[derive(Debug, Clone)]
pub struct GasPaymentsByBlockRangeResponse {
    pub gas_payments: Vec<GasPaymentData>,
}

/// Gas payment data structure
/// This will be replaced by the OpenAPI-generated type once the endpoint is added
#[derive(Debug, Clone)]
pub struct GasPaymentData {
    pub message_id: String,       // H256 as hex string (e.g., "0x1234...")
    pub destination_domain: u32,  // Destination chain domain ID
    pub payment: u64,             // Payment amount in lovelace
    pub gas_amount: u64,          // Amount of destination gas paid for
    pub block: u32,               // Block number containing the payment
    // Optional fields for enhanced tracking:
    pub transaction_id: Option<String>,   // H512 as hex string
    pub transaction_index: Option<u32>,   // Index of tx in block
    pub log_index: Option<u64>,           // Index of event in tx
}
