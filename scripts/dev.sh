#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  mist_node_bin="${XDG_CACHE_HOME:-$HOME/.cache}/my-blog-theme/node-v24.22.2-linux-x64/bin"
  if [ -x "$mist_node_bin/node" ]; then
    export PATH="$mist_node_bin:$PATH"
  else
    echo '请先安装 Node.js 24，然后执行 npm ci 和 npm run dev。' >&2
    exit 1
  fi
fi
if [ ! -d node_modules ]; then npm ci; fi
exec npm run dev -- "$@"
