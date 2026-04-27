use hyperlane_core::H256;

/// Placeholder signer for Midnight.
///
/// Real signing is performed by the `midnight-node-toolkit` subprocess
/// (issue #20). This struct exists at scaffolding time only to satisfy the
/// `ChainSigner` + `BuildableWithSignerConf` trait surface in
/// `hyperlane-base`.
#[derive(Clone, Debug, Default)]
pub struct MidnightSigner {
    address: String,
    address_h256: H256,
}

impl MidnightSigner {
    /// Construct a placeholder signer. At #13 the address is empty / zero;
    /// #20 will populate these from the toolkit.
    pub fn new() -> Self {
        Self::default()
    }

    /// Returns the configured address (empty at #13).
    pub fn address(&self) -> &str {
        &self.address
    }

    /// Returns the configured address as `H256` (zero at #13).
    pub fn address_h256(&self) -> H256 {
        self.address_h256
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use url::Url;

    use crate::ConnectionConf;

    #[test]
    fn config_constructs() {
        let conf = ConnectionConf::new(
            Url::parse("http://localhost:8080/graphql").unwrap(),
            Some("/usr/local/bin/midnight-node-toolkit".to_string()),
        );
        assert_eq!(
            conf.indexer_graphql_url.as_str(),
            "http://localhost:8080/graphql"
        );
        assert!(conf.toolkit_path.is_some());
    }

    #[test]
    fn signer_constructs() {
        let signer = MidnightSigner::new();
        assert_eq!(signer.address(), "");
        assert_eq!(signer.address_h256(), H256::zero());
    }
}
