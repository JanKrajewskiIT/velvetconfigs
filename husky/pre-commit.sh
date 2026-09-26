#!/usr/bin/env sh

if ! command -v node >/dev/null 2>&1; then
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)"
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "pre-commit: node not found on PATH. Install Node.js or configure fnm before committing." >&2
  exit 127
fi

hook_dir="${hook_dir:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}"
repository_root=$(CDPATH= cd -- "$hook_dir/.." && pwd)

if command -v lint-staged >/dev/null 2>&1; then
  lint-staged --no-stash --concurrent false --cwd "$repository_root"
  exit $?
fi

if command -v npx >/dev/null 2>&1; then
  npx --no-install lint-staged --no-stash --concurrent false --cwd "$repository_root"
  exit $?
fi

echo "pre-commit: neither lint-staged nor npx is available. Install lint-staged as a dev dependency." >&2
exit 127