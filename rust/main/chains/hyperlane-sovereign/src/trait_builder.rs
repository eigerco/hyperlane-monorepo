use hyperlane_core::config::OperationBatchConfig;

/// Sovereign connection configuration.
#[derive(Debug, Clone)]
pub struct ConnectionConf {
    /// Operation batching configuration.
    pub operation_batch: OperationBatchConfig,
}
