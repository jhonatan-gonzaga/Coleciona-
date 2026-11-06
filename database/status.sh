#!/usr/bin/env bash
set -euo pipefail
for port in 27017 27018 27019; do
  printf '%s: ' "$port"
  mongosh --quiet "mongodb://127.0.0.1:$port/admin?directConnection=true" --eval "const h=db.hello();print(h.isWritablePrimary?'PRIMARY':h.secondary?'SECONDARY':'INDISPONIVEL')" 2>/dev/null || echo 'PARADO'
done
