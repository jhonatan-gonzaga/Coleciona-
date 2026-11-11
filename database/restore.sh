#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
source_dir="${1:?Informe diretório do backup}"
target_uri="${2:?Informe URI do banco de restauração separado}"
target_storage="${3:?Informe pasta de imagens de restauração separada}"
target_db="${TARGET_DB:-coleciona}"
[[ "$target_db" =~ ^[A-Za-z0-9_]+$ ]] || { echo 'Nome de banco de destino inválido.' >&2; exit 1; }
connection_uri="$target_uri"
if [[ "$target_uri" =~ ^(mongodb(\+srv)?://[^/]+)/[^?]*(\?(.*))?$ ]]; then
  connection_uri="${BASH_REMATCH[1]}/"
  if [[ -n "${BASH_REMATCH[4]:-}" ]]; then connection_uri="${connection_uri}?${BASH_REMATCH[4]}"; fi
fi
cd "$source_dir"
sha256sum -c uploads.sha256
if [[ -f mongo.sha256 ]]; then sha256sum -c mongo.sha256 >/dev/null; fi
mkdir -p "$target_storage"
restore_log="$(mktemp)"
trap 'rm -f "$restore_log"' EXIT
mongorestore --uri="$connection_uri" --drop --nsFrom='coleciona.*' --nsTo="$target_db.*" mongo 2>&1 | tee "$restore_log"
if ! grep -Eq '[1-9][0-9]* document\(s\) restored successfully' "$restore_log"; then
  echo 'A restauração não importou documentos; verifique o backup e a URI.' >&2
  exit 1
fi
tar -C "$target_storage" -xf uploads.tar
echo 'Restauração concluída em ambiente separado'
