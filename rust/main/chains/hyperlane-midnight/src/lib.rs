//! Scaffolding for the Midnight chain integration.
//!
//! Issue #13 (T16): framework wiring only. Real trait impls (Mailbox, indexers,
//! ValidatorAnnounce, provider) land in issues #14–#20. Transaction submission
//! uses the Classic submitter path, shelling out to `midnight-node-toolkit`
//! (see issue #20).

#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod config;
mod error;
mod signer;

pub use config::ConnectionConf;
pub use error::HyperlaneMidnightError;
pub use signer::MidnightSigner;
