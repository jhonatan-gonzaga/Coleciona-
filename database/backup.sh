#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$dir")"
dest="${1:-$dir/backups/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$dest"
mongodump --uri='mongodb://127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/coleciona?replicaSet=rsColeciona' --db=coleciona --out="$dest/mongo"
mkdir -p "$root/storage/uploads"
tar -C "$root/storage" -cf "$dest/uploads.tar" uploads
sha256sum "$dest/uploads.tar" > "$dest/uploads.sha256"
echo "$dest"
