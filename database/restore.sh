#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
source_dir="${1:?Informe diretório do backup}"
target_uri="${2:?Informe URI do banco de restauração separado}"
target_storage="${3:?Informe pasta de imagens de restauração separada}"
cd "$source_dir"
sha256sum -c uploads.sha256
mkdir -p "$target_storage"
mongorestore --uri="$target_uri" --drop mongo/coleciona
tar -C "$target_storage" -xf uploads.tar
echo 'Restauração concluída em ambiente separado'
