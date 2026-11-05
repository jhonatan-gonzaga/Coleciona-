#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
for port in 27017 27018 27019; do "$dir/start-node.sh" "$port"; done
mongosh --quiet --host 127.0.0.1 --port 27017 "$dir/init-replica.js"
