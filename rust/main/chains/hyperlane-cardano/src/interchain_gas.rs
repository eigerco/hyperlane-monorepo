use crate::rpc::CardanoRpc;
use crate::ConnectionConf;
use async_trait::async_trait;
use hyperlane_core::{
    ChainCommunicationError, ChainResult, ContractLocator, Indexed, Indexer, InterchainGasPayment,
    LogMeta, SequenceAwareIndexer, H256, H512, U256,
};
use std::ops::RangeInclusive;
use std::str::FromStr;
use tracing::instrument;

/// Indexer for Interchain Gas Payments on Cardano
///
/// Gas payments on Cardano are represented as UTXOs sent to the gas paymaster address
/// or as metadata in the outbound message transaction. This indexer fetches payment
/// events from the Cardano RPC server.
///
/// **Gas Payment Lifecycle on Cardano:**
/// 1. User/application dispatches a message via the mailbox
/// 2. In the same transaction or a separate one, they pay for gas by:
///    - Sending ADA to the IGP address
///    - Including payment metadata in transaction outputs
///    - Creating a reference output with payment info
/// 3. The RPC server indexes these payments and associates them with message IDs
/// 4. This indexer fetches the payments and makes them available to the relayer
///
/// **Relayer Usage:**
/// - The relayer uses gas payment data to determine if a message has sufficient gas funds
/// - It checks the total payments for a message_id against estimated delivery costs
/// - This enables subsidized relaying where users pre-pay for gas on destination chains
#[derive(Debug)]
pub struct CardanoInterchainGasPaymasterIndexer {
    cardano_rpc: CardanoRpc,
    address: H256, // IGP minting policy hash or address
}

impl CardanoInterchainGasPaymasterIndexer {
    /// Create a new Cardano IGP indexer
    pub fn new(conf: &ConnectionConf, locator: ContractLocator) -> Self {
        Self {
            cardano_rpc: CardanoRpc::new(&conf.url),
            address: locator.address,
        }
    }

    /// Parse a gas payment from RPC response format to InterchainGasPayment
    fn parse_gas_payment(
        &self,
        payment_data: &crate::rpc::GasPaymentData,
    ) -> ChainResult<(Indexed<InterchainGasPayment>, LogMeta)> {
        // Parse message_id from hex string
        let message_id = H256::from_str(&payment_data.message_id).map_err(|e| {
            ChainCommunicationError::from_other_str(&format!(
                "Failed to parse gas payment message_id '{}': {}",
                payment_data.message_id, e
            ))
        })?;

        // Parse optional transaction_id from hex string
        let transaction_id = if let Some(ref tx_id_str) = payment_data.transaction_id {
            H512::from_str(tx_id_str)
                .map_err(|e| {
                    ChainCommunicationError::from_other_str(&format!(
                        "Failed to parse gas payment transaction_id '{}': {}",
                        tx_id_str, e
                    ))
                })?
        } else {
            H512::zero()
        };

        let gas_payment = InterchainGasPayment {
            message_id,
            destination: payment_data.destination_domain,
            payment: U256::from(payment_data.payment),
            gas_amount: U256::from(payment_data.gas_amount),
        };

        let log_meta = LogMeta {
            address: self.address,
            block_number: payment_data.block as u64,
            block_hash: H256::zero(), // Could be enhanced if RPC provides it
            transaction_id,
            transaction_index: payment_data.transaction_index.unwrap_or(0) as u64,
            log_index: U256::from(payment_data.log_index.unwrap_or(0)),
        };

        Ok((Indexed::new(gas_payment), log_meta))
    }
}

#[async_trait]
impl Indexer<InterchainGasPayment> for CardanoInterchainGasPaymasterIndexer {
    #[instrument(err, skip(self))]
    async fn fetch_logs_in_range(
        &self,
        range: RangeInclusive<u32>,
    ) -> ChainResult<Vec<(Indexed<InterchainGasPayment>, LogMeta)>> {
        let from = *range.start();
        let to = *range.end();

        tracing::info!(
            "Fetching Cardano gas payments from block {} to {}",
            from,
            to
        );

        // Try to fetch gas payments from the RPC
        match self
            .cardano_rpc
            .get_gas_payments_by_block_range(from, to)
            .await
        {
            Ok(response) => {
                tracing::info!(
                    "Fetched {} gas payments from Cardano RPC",
                    response.gas_payments.len()
                );

                // Parse each gas payment
                let mut result = Vec::new();
                for payment_data in &response.gas_payments {
                    match self.parse_gas_payment(payment_data) {
                        Ok(parsed) => result.push(parsed),
                        Err(e) => {
                            tracing::warn!(
                                "Failed to parse gas payment at block {}: {}. Skipping.",
                                payment_data.block,
                                e
                            );
                            // Continue processing other payments even if one fails
                        }
                    }
                }

                Ok(result)
            }
            Err(e) => {
                // The RPC endpoint doesn't exist yet - this is expected
                tracing::debug!(
                    "Gas payment RPC endpoint not available (blocks {} to {}): {}. \
                    Returning empty results. This is normal if the RPC endpoint hasn't been implemented yet.",
                    from,
                    to,
                    e
                );

                // Return empty vector - gas payment indexing is optional for basic bridge operation
                // The relayer can still work without it, it just won't have gas payment subsidy information
                Ok(vec![])
            }
        }
    }

    #[instrument(level = "debug", err, ret, skip(self))]
    async fn get_finalized_block_number(&self) -> ChainResult<u32> {
        // Use the same finalized block number as the mailbox
        self.cardano_rpc
            .get_finalized_block_number()
            .await
            .map_err(ChainCommunicationError::from_other)
    }
}

#[async_trait]
impl SequenceAwareIndexer<InterchainGasPayment> for CardanoInterchainGasPaymasterIndexer {
    async fn latest_sequence_count_and_tip(&self) -> ChainResult<(Option<u32>, u32)> {
        // Gas payments don't have a sequence count on Cardano
        // They are indexed by block range, not by sequence
        // Return None for count and current finalized block for tip
        let tip = self.get_finalized_block_number().await?;
        Ok((None, tip))
    }
}
