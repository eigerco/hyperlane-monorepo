# Testing sovereign-hyperlane integration

To run the tests ensure that you have cloned `sovereign-sdk-wip` and it is located beside the `hyperlane-monorepo`.

e.g.
```bash
~/repos/hyperlane-monorepo
~/repos/sovereign-sdk-wip
```

1) build the sovereign rollup

    ```bash
    cd sovereign-sdk-wip/examples/demo-hl-rollup
    cargo b --bins
    ```

2) build the txsubmit tool

    ```bash
    cd sovereign-sdk-wip/examples/txsubmit
    cargo b
    ```

3) delete prior run db then run the demo rollup

    ```bash
    cd sovereign-sdk-wip/examples/demo-hl-rollup
    rm -r demo_data/ mock_da.sqlite
    ../../target/debug/sov-hl-demo-rollup
    ```

4) run the tests

    ```bash
    cd hyperlane-monorepo/rust/main/chains/hyperlane-sovereign
    make test
    ```

At the time of this writing 100% of tests pass.
