# Spec 09 — Husky Pre-Commit Hook

## Step 1 — Artifact

Ship a single shell snippet at `husky/pre-commit.sh`. The file is not executed directly; it is sourced from the consumer's `.husky/pre-commit` so the consumer's hook script remains short while delegating the real logic to the preset.

## Step 2 — Node availability shim

Husky hooks run with the user's PATH at commit time, which is unreliable when the user manages Node through a version manager. The snippet MUST:

- Probe for `node` on PATH first.
- If `node` is missing, probe for `fnm` and, when present, evaluate `fnm env --use-on-cd --shell bash` to populate the environment from the version manager.
- Re-probe for `node` after the shim. If it is still missing, print a clear diagnostic and exit with status 127 ("command not found"), which Husky surfaces as a hook failure with a non-zero exit.

The shim covers fnm specifically; other version managers (nvm, asdf, volta) are not handled because they typically inject themselves into interactive shells already. Consumers needing a different shim copy and adapt the script.

## Step 3 — lint-staged invocation strategy

Once Node is available, the snippet MUST:

- Prefer a global `lint-staged` binary on PATH. Invocations use `--no-stash --concurrent false --cwd "$hook_dir/.."` so the working tree state is not modified by lint-staged and tasks run sequentially. The CWD override targets the consumer repository root (the parent of the `.husky` directory).
- Fall back to `npx --no-install lint-staged` with the same flags when lint-staged is not on PATH but npx is. The `--no-install` flag prevents npx from silently installing lint-staged into a temp cache; the package must already be in the consumer's node_modules.
- Exit with status 127 and a clear message if neither lint-staged nor npx is available.

In both lint-staged invocations the script preserves the exit code via `exit $?`.

## Step 4 — Why no-stash and no-concurrency

- `--no-stash` prevents lint-staged from rewriting the working tree on failure; partial fixes are kept so the developer can inspect them.
- `--concurrent false` serializes tasks. Concurrent ESLint/Stylelint/Prettier runs against overlapping files can collide on disk; sequential runs are slower but predictable.

## Step 5 — Consumer wiring

The consumer creates `.husky/pre-commit` containing two lines:

- A local variable assignment capturing the hook's own directory.
- A `.` (source) directive that loads the preset script via `node_modules/<package>/husky/pre-commit.sh`.

The sourced script accepts an existing `hook_dir` value from the consumer; when absent, it derives the directory from `$0`. It resolves the repository root as that directory's parent before passing `--cwd`.

The consumer does NOT modify the preset script. Updates ship by bumping the preset version.

## Step 6 — Hook installation

Consumers enable Husky exactly once by running its installer (typically wired into a `prepare` script that runs on `npm install`). After installation, Husky watches `.husky/*` files and registers them as Git hooks. The preset does not invoke Husky itself; it only ships the reusable snippet.

## Step 7 — Export entry

The exports map exposes `./husky/pre-commit` pointing at `husky/pre-commit.sh`. The shell extension is not loadable by Node — the consumer references the path as a string to source from a shell.

## Step 8 — Failure semantics

- A pre-commit hook failure aborts the commit. The developer must fix the failing files and re-stage.
- The hook is intentionally strict: any non-zero exit from lint-staged blocks the commit. Skipping the hook (`git commit --no-verify`) is left to the developer's discretion and is not encouraged.

## Acceptance criteria

- With Node and global lint-staged available, the script invokes it once with `--no-stash --concurrent false --cwd <repo-root>` and returns its exit status.
- With Node but no global lint-staged, it invokes `npx --no-install lint-staged` with the same flags; with neither launcher, it writes a diagnostic to stderr and exits 127.
- With Node initially absent and fnm available, it evaluates the Bash environment command and retries Node discovery; failure still exits 127.
- Sourcing from the two-line consumer hook computes the consumer repository root, not the package directory.
- The raw shell file resolves through `./husky/pre-commit` and is included in the package tarball.
