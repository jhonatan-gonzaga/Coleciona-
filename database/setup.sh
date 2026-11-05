#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
uri='mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona'
mongosh "$uri" --quiet "$dir/create-collections.js"
mongosh "$uri" --quiet "$dir/create-indexes.js"
