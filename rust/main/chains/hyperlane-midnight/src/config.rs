use url::Url;

/// Midnight connection configuration.
///
/// Contract addresses flow via the standard `CoreContractAddresses` struct
/// at the `ChainConf` level, not this struct. Native token metadata flows via
/// `ChainConf.native_token`.
#[derive(Clone, Debug)]
pub struct ConnectionConf {
    /// GraphQL URL for the Midnight indexer (primary data source for reads).
    pub indexer_graphql_url: Url,
    /// Filesystem path to the `midnight-node-toolkit` binary used by the
    /// Classic `Mailbox::process` implementation (issue #20). Optional at
    /// scaffolding time (#13).
    pub toolkit_path: Option<String>,
}

impl ConnectionConf {
    /// Construct a new `ConnectionConf`.
    pub fn new(indexer_graphql_url: Url, toolkit_path: Option<String>) -> Self {
        Self {
            indexer_graphql_url,
            toolkit_path,
        }
    }
}
