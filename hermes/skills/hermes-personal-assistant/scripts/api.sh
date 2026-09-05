#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: api.sh METHOD /api/v1/PATH [--query NAME VALUE]...

JSON bodies for POST, PUT, and PATCH are read from standard input.
Query parameters are supported for GET requests only.
EOF
  exit 64
}

[[ $# -ge 2 ]] || usage

method=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
path=$2
shift 2

case "$method" in
  GET | POST | PUT | PATCH | DELETE) ;;
  *)
    printf 'Unsupported HTTP method: %s\n' "$method" >&2
    exit 64
    ;;
esac

[[ "$path" == /api/v1/* ]] || {
  printf 'Path must start with /api/v1/.\n' >&2
  exit 64
}

api_base_url=${HERMES_API_BASE_URL:-}
api_key=${HERMES_INTERNAL_API_KEY:-}

[[ -n "$api_base_url" ]] || {
  printf 'HERMES_API_BASE_URL is required.\n' >&2
  exit 78
}

[[ "$api_base_url" == http://* || "$api_base_url" == https://* ]] || {
  printf 'HERMES_API_BASE_URL must use http:// or https://.\n' >&2
  exit 78
}

[[ -n "$api_key" ]] || {
  printf 'HERMES_INTERNAL_API_KEY is required.\n' >&2
  exit 78
}

query_args=()
while (($# > 0)); do
  [[ "$1" == "--query" && $# -ge 3 ]] || usage
  [[ "$method" == "GET" ]] || {
    printf 'Query parameters are supported for GET requests only.\n' >&2
    exit 64
  }

  query_name=$2
  query_value=$3
  [[ "$query_name" =~ ^[A-Za-z][A-Za-z0-9]*$ ]] || {
    printf 'Invalid query parameter name: %s\n' "$query_name" >&2
    exit 64
  }

  query_args+=(--data-urlencode "${query_name}=${query_value}")
  shift 3
done

curl_args=(
  --silent
  --show-error
  --fail-with-body
  --connect-timeout 5
  --max-time 30
  --request "$method"
  --header "Authorization: Bearer ${api_key}"
  --header 'Accept: application/json'
)

if [[ "$method" == "GET" ]]; then
  if ((${#query_args[@]} > 0)); then
    curl_args+=(--get "${query_args[@]}")
  fi
elif [[ "$method" == "POST" || "$method" == "PUT" || "$method" == "PATCH" ]]; then
  curl_args+=(--header 'Content-Type: application/json' --data-binary @-)
fi

curl "${curl_args[@]}" "${api_base_url%/}${path}"
