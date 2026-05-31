#!/usr/bin/env sh
set -e

hook_dir="${hook_dir:-$(cd "$(dirname "$0")" && pwd)}"

if ! command -v node >/dev/null 2>&1; then
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)"
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "pre-commit: node not found on PATH. Install Node.js (or configure fnm) before committing." >&2
  exit 127
fi

repo_root="$(cd "$hook_dir/.." && pwd)"

if command -v lint-staged >/dev/null 2>&1; then
  lint-staged --no-stash --concurrent false --cwd "$repo_root"
  exit $?
fi

if command -v npx >/dev/null 2>&1; then
  npx --no-install lint-staged --no-stash --concurrent false --cwd "$repo_root"
  exit $?
fi

echo "pre-commit: neither lint-staged nor npx is available. Install lint-staged as a dev dependency." >&2
exit 127
