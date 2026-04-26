if ! command -v node >/dev/null 2>&1; then
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --use-on-cd --shell bash)" >/dev/null 2>&1
  fi
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not available in PATH for Husky hook."
  exit 127
fi

if command -v lint-staged >/dev/null 2>&1; then
  lint-staged --no-stash --concurrent false --cwd "$hook_dir/.."
  exit $?
fi

if command -v npx >/dev/null 2>&1; then
  npx --no-install lint-staged --no-stash --concurrent false --cwd "$hook_dir/.."
  exit $?
fi

echo "lint-staged is not available in PATH."
exit 127
