#[derive(Clone, Debug)]
/// Signer for Sovereign chain
pub struct Signer {
    // /// public key
    // pub public_key: PublicKey,
    /// precomputed address, because computing it is a fallible operation
    /// and we want to avoid returning `Result`
    pub address: String,
    // /// address prefix
    // pub prefix: String,
    // _private_key: Vec<u8>,
}

impl Signer {
    pub fn new(address: String) -> Self {
        Signer { address }
    }
}
