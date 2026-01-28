use borsh::{BorshDeserialize, BorshSerialize};
use derive_new::new;

use crate::accumulator::{
    hash_concat,
    merkle::{merkle_root_from_branch, Proof},
    H256, TREE_DEPTH, ZERO_HASHES,
};

#[derive(BorshDeserialize, BorshSerialize, Debug, Clone, new, PartialEq, Eq)]
/// An incremental merkle tree, modeled on the eth2 deposit contract
pub struct IncrementalMerkle {
    /// The branch of the tree
    pub branch: [H256; TREE_DEPTH],
    /// The number of leaves in the tree
    pub count: usize,
}

impl Default for IncrementalMerkle {
    fn default() -> Self {
        let mut branch: [H256; TREE_DEPTH] = Default::default();
        branch
            .iter_mut()
            .enumerate()
            .for_each(|(i, elem)| *elem = ZERO_HASHES[i]);
        Self { branch, count: 0 }
    }
}

impl IncrementalMerkle {
    /// Ingest a leaf into the tree.
    pub fn ingest(&mut self, element: H256) {
        let mut node = element;
        assert!(self.count < u32::MAX as usize);
        self.count = self.count.saturating_add(1);
        let mut size = self.count;
        for i in 0..TREE_DEPTH {
            if (size & 1) == 1 {
                self.branch[i] = node;
                return;
            }
            node = hash_concat(self.branch[i], node);
            size /= 2;
        }
    }

    /// Calculate the current tree root
    pub fn root(&self) -> H256 {
        let mut node: H256 = Default::default();
        let mut size = self.count;

        self.branch.iter().enumerate().for_each(|(i, elem)| {
            node = if (size & 1) == 1 {
                hash_concat(elem, node)
            } else {
                hash_concat(node, ZERO_HASHES[i])
            };
            size /= 2;
        });

        node
    }

    /// Get the number of items in the tree
    pub fn count(&self) -> usize {
        self.count
    }

    /// Get the index
    pub fn index(&self) -> u32 {
        assert!(self.count > 0, "index is invalid when tree is empty");
        (self.count as u32).saturating_sub(1)
    }

    /// Get the leading-edge branch.
    pub fn branch(&self) -> &[H256; TREE_DEPTH] {
        &self.branch
    }

    /// Calculate the root of a branch for incremental given the index
    pub fn branch_root(item: H256, branch: [H256; TREE_DEPTH], index: usize) -> H256 {
        merkle_root_from_branch(item, &branch, 32, index)
    }

    /// Verify an incremental merkle proof of inclusion
    pub fn verify(&self, proof: &Proof) -> bool {
        let computed = IncrementalMerkle::branch_root(proof.leaf, proof.path, proof.index);
        computed == self.root()
    }
}

#[cfg(all(test, feature = "ethers"))]
mod test {
    use ethers_core::utils::hash_message;

    use crate::test_utils;

    use super::*;

    #[test]
    fn it_computes_branch_roots() {
        let test_cases = test_utils::load_merkle_test_json();

        for test_case in test_cases.iter() {
            let mut tree = IncrementalMerkle::default();

            // insert the leaves
            for leaf in test_case.leaves.iter() {
                let hashed_leaf = hash_message(leaf);
                tree.ingest(hashed_leaf.into());
            }

            // assert the tree has the proper leaf count
            assert_eq!(tree.count(), test_case.leaves.len());

            // assert the tree generates the proper root
            let root = tree.root(); // root is type H256
            assert_eq!(root, test_case.expected_root);

            for n in 0..test_case.leaves.len() {
                // check that the tree can verify the proof for this leaf
                assert!(tree.verify(&test_case.proofs[n]));
            }
        }
    }
}

#[cfg(test)]
mod cardano_compatibility_test {
    use super::*;

    /// Test with real message IDs from Cardano Preview testnet (17 dispatched messages)
    /// These are the actual message IDs that should produce consistent merkle roots
    /// across Rust, Aiken, and the validator.
    #[test]
    fn test_cardano_message_ids_merkle_tree() {
        // 17 verified message IDs from Cardano Preview mailbox
        let message_ids: [&str; 17] = [
            "aaa67f84800e31953ca287307c81b5429836b253ec22342c124029696c11ed29", // nonce 0
            "075b8fa77d050785534dedec2508c17f459b0bf60090befa5ea3c7914cc7b905", // nonce 1
            "9f3caf78fda6459bcd7af101d9ed66727ecbf4055d1f53bd5a9663029506d836", // nonce 2
            "8649bc75fab05a42de39afcfc58f33c6aa1d49b664d36afa5eb85d8df6dee5c3", // nonce 3
            "dba3b176c3c6f88404d010ac1a15e130e0cfaa1652afcaf25c5a0884a3ba743d", // nonce 4
            "4762491dfff665bd074577c7938703cb9154234fcaad906f7d303c0acc03f477", // nonce 5
            "906474bc1e09b8e95a6a8ca8ac60bc78a68a947d173a8e65d98fa07f8a2fa089", // nonce 6
            "6470fbf278510cf403de24283fc9d11258ba76849e09f07d96fb8f4bdbd74756", // nonce 7
            "737b1c61e9a48834a8469cb0fed31da16629683ff147e7148ad8a96d2ffe7cc8", // nonce 8
            "fc933529bf0c4b7d926c902effad8adcf690e73b97fc8e120f716c04344b6bf8", // nonce 9
            "ce46dbe00b855e673c197b6414bab4502ed7bda89bfaa10cadeb789cb94848d4", // nonce 10
            "7685e05103c335f29e788252bb93eadeb6d95a31aa08b5daca73312957d75061", // nonce 11
            "0b7d428bdeff6d5706d32403ed03315b3b5ef41b9527f520a83ceeb35dcbaa8f", // nonce 12
            "4b8916877260dc507c2a5e307cb8619a0ea82f7a8244b7fc54679dd7d4d40eef", // nonce 13
            "c8100c86d6f9862fb16a1e72a6a7e080b667d1c4099916a49a68f064d242e7de", // nonce 14
            "8fe7b649f713ab75c6e28979acf6fb318553416bdaad2b72a336cf32c1492db5", // nonce 15
            "60ed519399c1ccc7894c1390babe48a106db3a5df4a8c59b9c506ff85a2d971d", // nonce 16
        ];

        let mut tree = IncrementalMerkle::default();

        // Insert all message IDs
        for msg_id_hex in message_ids.iter() {
            let msg_id = H256::from_slice(&hex::decode(msg_id_hex).unwrap());
            tree.ingest(msg_id);
        }

        // Verify count
        assert_eq!(tree.count(), 17);

        // Expected branches after 17 insertions (count=17 = 0b10001)
        // bit 0 = 1: branch[0] = msg16
        // bit 4 = 1: branch[4] = hash of first 16 messages subtree
        let expected_branches: [&str; 5] = [
            "60ed519399c1ccc7894c1390babe48a106db3a5df4a8c59b9c506ff85a2d971d", // branch[0] = msg16
            "1712cf60f4cdc3b8e878d88c042bed2ad122cecb18e5b5a226d739541c8896c0", // branch[1]
            "2779709c54f6a2604c2c86a1707953ddedfe4a8ea8a858517e5dc7f44538ab0e", // branch[2]
            "f9ae4b1fc2c9b4afb688027c40ffa34ad33fd6021e119123ac773fa338e80342", // branch[3]
            "9a32daa2ac4ed59e297b8b59d89f3586539fc5458f50cc78a149ba8618a1c803", // branch[4]
        ];

        // Verify branches
        for (i, expected_hex) in expected_branches.iter().enumerate() {
            let expected = H256::from_slice(&hex::decode(expected_hex).unwrap());
            assert_eq!(
                tree.branch[i], expected,
                "Branch {} mismatch: got {:?}, expected {:?}",
                i, tree.branch[i], expected
            );
        }

        // Expected root (computed from the branches above)
        let expected_root =
            H256::from_slice(&hex::decode("59e54fb0dc4f934099625cdaa7e00f85bae054b9773c77383aa4554e4d2dda0e").unwrap());
        let computed_root = tree.root();

        assert_eq!(
            computed_root, expected_root,
            "Root mismatch: got {:?}, expected {:?}",
            computed_root, expected_root
        );

        println!("Rust merkle tree test passed!");
        println!("Root: {:?}", computed_root);
    }
}
