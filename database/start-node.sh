#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
port="${1:?Informe a porta 27017, 27018 ou 27019}"
case "$port" in 27017|27018|27019) n=$((port-27016));; *) echo 'Porta inválida' >&2; exit 2;; esac
mkdir -p "$dir/data/mongo$n" "$dir/logs" "$dir/run"
if mongosh --quiet --host 127.0.0.1 --port "$port" --eval 'db.hello().ok' 2>/dev/null | grep -q 1; then
  echo "Nó $port já está ativo"
else
  mongod --config "$dir/mongo$n.conf"
fi
