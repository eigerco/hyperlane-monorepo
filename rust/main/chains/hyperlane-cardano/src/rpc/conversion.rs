use hex::FromHex;
use hyperlane_cardano_rpc_rust_client::models::MessagesByBlockRange200ResponseMessagesInnerMessage;
use hyperlane_core::{HyperlaneMessage, HyperlaneProtocolError, H256};
use std::str::FromStr;

pub trait FromRpc<T>: Sized {
    fn from_rpc(input: &T) -> Result<Self, HyperlaneProtocolError>;
}

impl FromRpc<MessagesByBlockRange200ResponseMessagesInnerMessage> for HyperlaneMessage {
    fn from_rpc(input: &MessagesByBlockRange200ResponseMessagesInnerMessage) -> Result<Self, HyperlaneProtocolError> {
        // Parse sender address
        let sender = H256::from_str(input.sender.as_str())
            .map_err(|e| HyperlaneProtocolError::from(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Failed to parse sender address '{}': {}", input.sender, e)
            )))?;

        // Parse recipient address
        let recipient = H256::from_str(input.recipient.as_str())
            .map_err(|e| HyperlaneProtocolError::from(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Failed to parse recipient address '{}': {}", input.recipient, e)
            )))?;

        // Parse message body (strip optional 0x prefix)
        let body_hex = input.body.strip_prefix("0x").unwrap_or(&input.body);
        let body = Vec::from_hex(body_hex)
            .map_err(|e| HyperlaneProtocolError::from(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("Failed to parse message body '{}': {}", input.body, e)
            )))?;

        Ok(HyperlaneMessage {
            version: input.version as u8,
            nonce: input.nonce as u32,
            origin: input.origin_domain as u32,
            sender,
            destination: input.destination_domain as u32,
            recipient,
            body,
        })
    }
}
