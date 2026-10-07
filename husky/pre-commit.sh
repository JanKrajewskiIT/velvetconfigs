#!/usr/bin/env sh

hook_dir="${hook_dir:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}"
repo_root="$(CDPATH= cd -- "$hook_dir/.." && pwd)"

if ! command -v node >/dev/null 2>&1 && command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --shell bash)"
  # A missing or uninstalled version file is non-fatal; the node check below reports the failure.
  (cd "$repo_root" && fnm use --silent-if-unchanged) >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null 2>&1; then
  echo "pre-commit: node was not found on PATH or through fnm." >&2
  exit 127
fi

run_lint_staged() {
  exec "$@" --concurrent false --cwd "$repo_root"
}

if [ -x "$repo_root/node_modules/.bin/lint-staged" ]; then
  run_lint_staged "$repo_root/node_modules/.bin/lint-staged"
elif command -v lint-staged >/dev/null 2>&1; then
  run_lint_staged lint-staged
elif command -v npx >/dev/null 2>&1; then
  run_lint_staged npx --no-install lint-staged
fi

echo "pre-commit: neither lint-staged nor npx was found." >&2
exit 127
