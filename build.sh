#!/usr/bin/env bash

# build docker container for testing hyperlane in sov sdk
# and load them to docker daemon

# strict bash
set -xeuo pipefail
# cd to script's dir
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# hyperlane has git based dependency on sov, so we need to
# transfer authorized keys to the builder
eval "$(ssh-agent -s)"
ssh-add

# if we are running in CI, add cache configuration
# TMP_DIR should be set to ${{ runner.temp }} on github
extra_flags=()
if [ -n "${CI:-}" ]; then
  extra_flags+=(
    --cache-from="type=local,src=$TMP_DIR/.buildx-cache/hyperlane" \
    --cache-to="type=local,dest=$TMP_DIR/.buildx-cache-new/hyperlane" \
  )
fi

docker buildx build \
  --load \
  --ssh default \
  --tag hyperlane \
  --file hyperlane.Dockerfile \
  "${extra_flags[@]}" \
  .

# overwrite cache
# cache would grow infinitely if we just update the same artifacts,
# intsead we create a new cache every time and overwrite existing
# https://github.com/moby/buildkit/issues/1896
if [ -n "${CI:-}" ]; then
  mv "$TMP_DIR/.buildx-cache-new" "$TMP_DIR/.buildx-cache"
fi
