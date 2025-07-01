#!/usr/bin/env bash

# build docker container for testing hyperlane in sov sdk
# and load them to docker daemon

# strict bash
set -xeuo pipefail
# cd to script's dir
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# this script should be a single command to build hyperlane image for
# usage within sovereign-sdk, so make sure no one forgets about this
# step
git submodule update --init --recursive

# hyperlane has git based dependency on sov, so we need to
# transfer authorized keys to the builder
eval "$(ssh-agent -s)"
ssh-add

docker buildx build \
  --load \
  --ssh default \
  --tag hyperlane \
  --file hyperlane.Dockerfile \
  .
