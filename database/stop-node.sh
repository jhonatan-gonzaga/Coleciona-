#!/usr/bin/env bash
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)"
port="${1:?Informe a porta 27017, 27018 ou 27019}"
case "$port" in 27017|27018|27019) n=$((port-27016));; *) echo 'Porta inválida' >&2; exit 2;; esac
pidfile="$dir/run/mongo$n.pid"
if [[ ! -f "$pidfile" ]]; then echo 'Nó já parado'; exit 0; fi
pid="$(cat "$pidfile")"
if ! ps -p "$pid" -o args= | grep -Fq "mongo$n.conf"; then echo 'PID não corresponde ao nó' >&2; exit 1; fi
kill -TERM "$pid"
for _ in {1..30}; do kill -0 "$pid" 2>/dev/null || { echo "Nó $port parado"; exit 0; }; sleep 1; done
echo 'Nó não parou no prazo' >&2; exit 1
