#!/usr/bin/env bash
# One-shot build of the wave engine: cargo -> wasm-bindgen -> web-ui/src/wave-wasm/
set -euo pipefail
cd "$(dirname "$0")"

echo "==> cargo build (wasm32 release)"
cargo build --target wasm32-unknown-unknown --release

# Pin the cli to the version Cargo.lock resolved; use the prebuilt musl
# binary instead of a 10-minute cargo install.
VERSION=$(grep -A1 'name = "wasm-bindgen"' Cargo.lock | grep '^version' | grep -oP '"\K[0-9.]+')
BIN="${HOME}/.cargo/bin/wasm-bindgen"
if ! "$BIN" --version 2>/dev/null | grep -q "$VERSION"; then
  echo "==> fetching prebuilt wasm-bindgen $VERSION"
  curl -sL "https://github.com/rustwasm/wasm-bindgen/releases/download/${VERSION}/wasm-bindgen-${VERSION}-x86_64-unknown-linux-musl.tar.gz" -o /tmp/wb.tar.gz
  tar xzf /tmp/wb.tar.gz -C /tmp
  mv "/tmp/wasm-bindgen-${VERSION}-x86_64-unknown-linux-musl/wasm-bindgen" "$BIN"
  rm -rf /tmp/wasm-bindgen-${VERSION}-x86_64-unknown-linux-musl /tmp/wb.tar.gz
fi
"$BIN" --version

echo "==> wasm-bindgen -> ../web-ui/src/wave-wasm/"
rm -rf ../web-ui/src/wave-wasm
"$BIN" --target web --out-dir ../web-ui/src/wave-wasm \
  target/wasm32-unknown-unknown/release/bahnhof_wave.wasm

echo "done: web-ui/src/wave-wasm/"
