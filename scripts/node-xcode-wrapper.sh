#!/bin/sh
# Committed replacement for expo's /tmp/node-xcode-wrapper.sh, which does not survive
# reboots. Pods build-script phases (Hermes replace, RNDeps replace, Codegen) invoke
# node via "$NODE_BINARY", and Xcode's script-phase shell strips most of PATH — so a
# plain `command -v node` there returns nothing.
#
# Set NODE_BINARY to this file via ios/.xcode.env.local:
#     export NODE_BINARY="$PROJECT_DIR/../scripts/node-xcode-wrapper.sh"
for candidate in \
  /usr/local/bin/node \
  /opt/homebrew/bin/node \
  "$HOME/.nvm/versions/node/$(readlink "$HOME/.nvm/alias/default" 2>/dev/null)/bin/node" \
  "$(command -v node)"; do
  if [ -x "$candidate" ]; then
    exec "$candidate" "$@"
  fi
done
echo "node-xcode-wrapper: no usable node binary found" >&2
exit 1
