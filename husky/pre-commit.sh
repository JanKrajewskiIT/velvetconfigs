#!/usr/bin/env sh

hook_dir="${hook_dir:-$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)}"
project_root="${project_root:-$(CDPATH= cd -- "$hook_dir/.." && pwd)}"

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --shell bash)"
  (cd "$project_root" && fnm use --silent-if-unchanged) >/dev/null 2>&1 || true
fi

export PATH="$project_root/node_modules/.bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "pre-commit: node was not found on PATH or through fnm." >&2
  exit 127
fi

configs_root="${configs_root:-$project_root/node_modules/@jankrajewskiit/configs}"
(cd "$project_root" && node "$configs_root/scripts/toolchain.mjs" --node-only) || exit $?
cd "$project_root" || exit $?

run_lint_staged() {
  exec "$@" --concurrent false --cwd "$project_root"
}

if [ -x "$project_root/node_modules/.bin/lint-staged" ]; then
  run_lint_staged "$project_root/node_modules/.bin/lint-staged"
elif command -v npx >/dev/null 2>&1; then
  run_lint_staged npx --no-install lint-staged
fi

echo "pre-commit: neither lint-staged nor npx was found." >&2
exit 127
