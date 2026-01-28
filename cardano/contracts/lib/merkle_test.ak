use aiken/collection/list
use aiken/crypto.{keccak_256}
use merkle

/// Test that an empty tree has count 0
test empty_tree_has_zero_count() {
  let tree = merkle.empty()
  tree.count == 0
}

/// Test that an empty tree has 32 zero-hash branches (max_depth)
test empty_tree_has_initialized_branches() {
  let tree = merkle.empty()
  // Tree initializes with max_depth (32) zero hashes
  list.length(tree.branches) == 32
}

/// Test inserting into empty tree increments count
test insert_increments_count() {
  let tree = merkle.empty()
  let leaf = keccak_256("test message")
  let new_tree = merkle.insert(tree, leaf)
  new_tree.count == 1
}

/// Test multiple inserts increment count correctly
test multiple_inserts_increment_count() {
  let tree = merkle.empty()
  let leaf1 = keccak_256("message 1")
  let leaf2 = keccak_256("message 2")
  let leaf3 = keccak_256("message 3")

  let tree1 = merkle.insert(tree, leaf1)
  let tree2 = merkle.insert(tree1, leaf2)
  let tree3 = merkle.insert(tree2, leaf3)

  tree3.count == 3
}

/// Test that root changes after insert
test root_changes_after_insert() {
  let tree = merkle.empty()
  let initial_root = merkle.root(tree)

  let leaf = keccak_256("test message")
  let new_tree = merkle.insert(tree, leaf)
  let new_root = merkle.root(new_tree)

  initial_root != new_root
}

/// Test that different messages produce different roots
test different_messages_different_roots() {
  let tree1 = merkle.empty()
  let tree2 = merkle.empty()

  let leaf1 = keccak_256("message A")
  let leaf2 = keccak_256("message B")

  let tree1_with_leaf = merkle.insert(tree1, leaf1)
  let tree2_with_leaf = merkle.insert(tree2, leaf2)

  merkle.root(tree1_with_leaf) != merkle.root(tree2_with_leaf)
}

/// Test that same message produces same root
test same_message_same_root() {
  let tree1 = merkle.empty()
  let tree2 = merkle.empty()

  let message = "same message"
  let leaf = keccak_256(message)

  let tree1_with_leaf = merkle.insert(tree1, leaf)
  let tree2_with_leaf = merkle.insert(tree2, leaf)

  merkle.root(tree1_with_leaf) == merkle.root(tree2_with_leaf)
}

/// Test hash_pair produces consistent results
test hash_pair_consistent() {
  let a = keccak_256("left")
  let b = keccak_256("right")

  let hash1 = merkle.hash_pair(a, b)
  let hash2 = merkle.hash_pair(a, b)

  hash1 == hash2
}

/// Test hash_pair is order-dependent
test hash_pair_order_dependent() {
  let a = keccak_256("left")
  let b = keccak_256("right")

  let hash1 = merkle.hash_pair(a, b)
  let hash2 = merkle.hash_pair(b, a)

  hash1 != hash2
}

/// Test with real message IDs from Cardano Preview testnet (17 dispatched messages)
/// These are the actual message IDs that should produce consistent merkle roots
/// across Rust, Aiken, and the validator.
///
/// IMPORTANT: This test verifies Aiken merkle tree matches Rust implementation.
/// If this test fails, there's a bug in the Aiken merkle implementation.
test cardano_message_ids_merkle_tree() {
  // 17 verified message IDs from Cardano Preview mailbox
  let msg0 = #"aaa67f84800e31953ca287307c81b5429836b253ec22342c124029696c11ed29"
  let msg1 = #"075b8fa77d050785534dedec2508c17f459b0bf60090befa5ea3c7914cc7b905"
  let msg2 = #"9f3caf78fda6459bcd7af101d9ed66727ecbf4055d1f53bd5a9663029506d836"
  let msg3 = #"8649bc75fab05a42de39afcfc58f33c6aa1d49b664d36afa5eb85d8df6dee5c3"
  let msg4 = #"dba3b176c3c6f88404d010ac1a15e130e0cfaa1652afcaf25c5a0884a3ba743d"
  let msg5 = #"4762491dfff665bd074577c7938703cb9154234fcaad906f7d303c0acc03f477"
  let msg6 = #"906474bc1e09b8e95a6a8ca8ac60bc78a68a947d173a8e65d98fa07f8a2fa089"
  let msg7 = #"6470fbf278510cf403de24283fc9d11258ba76849e09f07d96fb8f4bdbd74756"
  let msg8 = #"737b1c61e9a48834a8469cb0fed31da16629683ff147e7148ad8a96d2ffe7cc8"
  let msg9 = #"fc933529bf0c4b7d926c902effad8adcf690e73b97fc8e120f716c04344b6bf8"
  let msg10 = #"ce46dbe00b855e673c197b6414bab4502ed7bda89bfaa10cadeb789cb94848d4"
  let msg11 = #"7685e05103c335f29e788252bb93eadeb6d95a31aa08b5daca73312957d75061"
  let msg12 = #"0b7d428bdeff6d5706d32403ed03315b3b5ef41b9527f520a83ceeb35dcbaa8f"
  let msg13 = #"4b8916877260dc507c2a5e307cb8619a0ea82f7a8244b7fc54679dd7d4d40eef"
  let msg14 = #"c8100c86d6f9862fb16a1e72a6a7e080b667d1c4099916a49a68f064d242e7de"
  let msg15 = #"8fe7b649f713ab75c6e28979acf6fb318553416bdaad2b72a336cf32c1492db5"
  let msg16 = #"60ed519399c1ccc7894c1390babe48a106db3a5df4a8c59b9c506ff85a2d971d"

  // Build tree by inserting all 17 messages
  let tree =
    merkle.empty()
      |> merkle.insert(msg0)
      |> merkle.insert(msg1)
      |> merkle.insert(msg2)
      |> merkle.insert(msg3)
      |> merkle.insert(msg4)
      |> merkle.insert(msg5)
      |> merkle.insert(msg6)
      |> merkle.insert(msg7)
      |> merkle.insert(msg8)
      |> merkle.insert(msg9)
      |> merkle.insert(msg10)
      |> merkle.insert(msg11)
      |> merkle.insert(msg12)
      |> merkle.insert(msg13)
      |> merkle.insert(msg14)
      |> merkle.insert(msg15)
      |> merkle.insert(msg16)

  // Verify count
  expect tree.count == 17

  // Expected branches after 17 insertions (from Rust implementation)
  // count=17 = 0b10001, so bit 0 and bit 4 are set
  let expected_branch0 =
    #"60ed519399c1ccc7894c1390babe48a106db3a5df4a8c59b9c506ff85a2d971d"
  let expected_branch1 =
    #"1712cf60f4cdc3b8e878d88c042bed2ad122cecb18e5b5a226d739541c8896c0"
  let expected_branch2 =
    #"2779709c54f6a2604c2c86a1707953ddedfe4a8ea8a858517e5dc7f44538ab0e"
  let expected_branch3 =
    #"f9ae4b1fc2c9b4afb688027c40ffa34ad33fd6021e119123ac773fa338e80342"
  let expected_branch4 =
    #"9a32daa2ac4ed59e297b8b59d89f3586539fc5458f50cc78a149ba8618a1c803"

  // Get actual branches
  expect [b0, b1, b2, b3, b4, ..] = tree.branches

  // Verify branches match Rust
  expect b0 == expected_branch0
  expect b1 == expected_branch1
  expect b2 == expected_branch2
  expect b3 == expected_branch3
  expect b4 == expected_branch4

  // Expected root (from Rust implementation)
  let expected_root =
    #"59e54fb0dc4f934099625cdaa7e00f85bae054b9773c77383aa4554e4d2dda0e"

  // Verify root matches Rust
  merkle.root(tree) == expected_root
}
