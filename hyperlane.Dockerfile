# A dockerfile combining all needed tools to set up hyperlane relayer, validators
# and evm counterparty for testing hyperlane module in sov sdk

FROM rust:1.85 AS rust-builder

WORKDIR /hyperlane-monorepo

ENV CARGO_NET_GIT_FETCH_WITH_CLI=true

RUN apt-get update && \
  apt-get install -y --no-install-recommends libclang-dev jq && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN curl -L https://foundry.paradigm.xyz | bash
RUN ~/.foundry/bin/foundryup

COPY rust ./rust

# the dependency on sovereign sdk is git based, so we need to pass the
# authorized ssh key into the container
RUN mkdir -p /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts
RUN --mount=type=ssh \
    --mount=type=cache,target=/hyperlane-monorepo/rust/main/target \
    --mount=type=cache,target=/usr/local/cargo/git/db \
    --mount=type=cache,target=/usr/local/cargo/registry/ \
  cd rust/main && \
  touch chains/hyperlane-fuel/abis/* && \
  cargo build --release --bin relayer --bin validator && \
  # still need to copy out of target bcs it's a cache mount so will be unmounted
  cp target/release/relayer target/release/validator /usr/bin


FROM debian:bookworm-slim AS runner

WORKDIR /build

COPY *.json yarn.lock .yarnrc.yml .*rc ./
COPY .yarn ./.yarn
COPY typescript ./typescript
COPY solidity ./solidity
COPY starknet ./starknet

RUN apt-get update && \
  apt-get install -y --no-install-recommends curl libclang-dev npm jq make build-essential unzip && \
  npm install -g yarn && \
  yarn set version 4.5.1 && \
  yarn install && \
  yarn build && \
  yarn workspace @hyperlane-xyz/cli bundle && \
  npm install -g ./typescript/cli && \
  yarn cache clean && \
  apt-get remove --purge -y curl jq make build-essential unzip && \
  apt-get autoremove -y && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* && \
  npm uninstall -g yarn && \
  npm cache clear --force && \
  cd - && \
  rm -rf build

WORKDIR /app

# anvil
COPY --from=rust-builder /root/.foundry/bin/* /usr/bin
# rust and validators
COPY --from=rust-builder /usr/bin/relayer /usr/bin/validator /usr/bin
# hyperlane config files looked up by relative path
COPY --from=rust-builder /hyperlane-monorepo/rust/main/config ./config
