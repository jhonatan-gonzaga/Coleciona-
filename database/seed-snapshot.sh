#!/usr/bin/env bash
set -euo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
archive="${1:?Uso: seed-snapshot.sh ARQUIVO.tar.gz URI_MONGODB PASTA_STORAGE}"
target_uri="${2:?Informe a URI do MongoDB de destino}"
target_storage="${3:?Informe a pasta de storage de destino}"

command -v mongorestore >/dev/null || { echo 'Instale MongoDB Database Tools (mongorestore).' >&2; exit 1; }
archive="$(realpath "$archive")"
target_storage="$(realpath -m "$target_storage")"
[[ -f "$archive" ]] || { echo "Backup não encontrado: $archive" >&2; exit 1; }

checksum="${archive}.sha256"
if [[ -f "$checksum" ]]; then
  (cd "$(dirname "$archive")" && sha256sum -c "$(basename "$checksum")")
fi

root="$(tar -tzf "$archive" | sed -n '1p')"
root="${root%/}"
[[ "$root" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo 'Estrutura do backup inesperada.' >&2; exit 1; }
while IFS= read -r entry; do
  case "$entry" in "$root/"|"$root/"*) ;; *) echo "Entrada inesperada no backup: $entry" >&2; exit 1;; esac
done < <(tar -tzf "$archive")

if [[ -d "$target_storage/uploads" ]] && [[ -n "$(find "$target_storage/uploads" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "A pasta $target_storage/uploads precisa estar vazia para uma seed completa." >&2
  exit 1
fi

temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
tar -C "$temporary" -xzf "$archive"
source_dir="$temporary/$root"
(cd "$source_dir" && sha256sum -c uploads.sha256 && sha256sum -c mongo.sha256 >/dev/null)

"$dir/restore.sh" "$source_dir" "$target_uri" "$target_storage"
echo "Seed do backup $root aplicada em ${TARGET_DB:-coleciona}."
