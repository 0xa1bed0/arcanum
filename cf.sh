#!/bin/sh
# Build landing page for Cloudflare deployment
# Copies landing/ + shared JS from app/ into dist/

set -e

rm -rf dist
mkdir dist

cp -r landing/* dist/
cp app/app.js app/crypto.js app/relay.js dist/
echo "Built to dist/"
