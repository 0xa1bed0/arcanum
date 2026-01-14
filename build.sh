#!/bin/sh
# Build landing page for deployment
# Copies landing/ + shared JS from app/ into dist/
#
# Usage:
#   ./build.sh        # Production build (copies files)
#   ./build.sh --dev  # Dev build (symlinks for live reload)

set -e

rm -rf dist
mkdir dist

if [ "$1" = "--dev" ]; then
  for f in landing/*; do
    ln -s "$(pwd)/$f" dist/
  done
  ln -s "$(pwd)/app/app.js" dist/
  ln -s "$(pwd)/app/crypto.js" dist/
  ln -s "$(pwd)/app/relay.js" dist/
  npx live-server dist
else
  cp -r landing/* dist/
  cp app/app.js app/crypto.js app/relay.js dist/
  echo "Built to dist/"
fi
