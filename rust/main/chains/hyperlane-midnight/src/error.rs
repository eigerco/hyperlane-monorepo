use hyperlane_core::ChainCommunicationError;

/// Errors produced by the `hyperlane-midnight` crate.
#[derive(Debug, thiserror::Error)]
pub enum HyperlaneMidnightError {
    /// Feature not implemented yet — replaced in issues #14–#20.
    #[error("Midnight: {0} not implemented yet")]
    NotImplemented(&'static str),
    /// Other errors.
    #[error("{0}")]
    Other(String),
}

impl From<HyperlaneMidnightError> for ChainCommunicationError {
    fn from(value: HyperlaneMidnightError) -> Self {
        ChainCommunicationError::from_other(value)
    }
}
