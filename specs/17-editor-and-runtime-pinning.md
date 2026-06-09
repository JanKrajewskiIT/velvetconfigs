# Spec 17 — Editor and Runtime Version Pinning

## Step 1 — Principle

Prettier (Spec 03) declares `endOfLine: "lf"`, but Prettier only normalizes files it formats. Files Prettier never touches — shell scripts, nginx conf, `.gitignore`, raw JSON5/YAML edited by hand — pick up whatever the editor and OS produce. On a mixed Windows/macOS/Linux maintainer team, this produces churn in unrelated diffs.

The repository pins editor behaviour and the Node runtime so that every contributor's local environment matches the verify pipeline before the first save.

## Step 2 — `.editorconfig`

`.editorconfig` lives at the repository root. It MUST declare:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Notes:

- `root = true` prevents the file from being overridden by an ancestor `.editorconfig` if the repository is nested inside a monorepo.
- The Markdown override preserves trailing two-space line breaks, which are semantically meaningful in `.md`.
- `indent_size = 2` matches Prettier's default and the existing repository conventions; deviating would create a mismatch the verify pipeline would surface immediately.

`.editorconfig` is honoured natively by most editors (VS Code, JetBrains, Sublime, Neovim with a plugin). No tooling additions are required.

## Step 3 — `.nvmrc`

`.nvmrc` lives at the repository root and contains a single line: the Node major the package builds and tests against. The value MUST match:

- `engines.node` in `package.json`.
- The `node-version` matrix entry in `.github/workflows/verify.yml`.
- The `node-version` value in `.github/workflows/publish.yml`.

The current pin is `26`. Any change to this value is a coordinated edit across all four locations and is gated by Spec 13's deprecation policy when the new minimum is higher than a previously supported major.

The file content is the bare major (e.g. `26`), not `v26` and not a minor (e.g. `26.0.0`). This is the form `nvm`, `fnm`, `volta`, and `nodenv` all accept.

## Step 4 — Interaction with the Husky hook

Spec 09's pre-commit hook detects `fnm` and bootstraps the user's Node version. With `.nvmrc` present, the shim picks up the pinned major automatically when the maintainer's shell has `fnm` (or equivalent) configured for `.nvmrc` autoswitch.

The hook MUST NOT hardcode the Node major. It reads `.nvmrc` indirectly through the version manager. If a contributor's version manager is not configured to read `.nvmrc`, the hook still succeeds as long as their PATH Node satisfies `engines.node`.

## Step 5 — `.node-version` alias

Some version managers (`nodenv`, `asdf`) prefer `.node-version` over `.nvmrc`. The repository SHOULD ship a `.node-version` file with identical contents as a courtesy. Both files are committed; they are not symlinks (symlinks behave inconsistently on Windows).

The duplication is acceptable because both files are one line and change at most once per Node major.

## Step 6 — `.gitattributes`

The repository SHOULD ship a `.gitattributes` file pinning `text=auto eol=lf` for all text files and `binary` for known binaries. This protects the LF invariant on Windows checkouts where `core.autocrlf=true` is the platform default.

Minimum content:

```
* text=auto eol=lf
*.png binary
*.ico binary
```

`.gitattributes` is not part of the published tarball; it is repository-local.

## Step 7 — Verification

The repository structure summary in Spec 14 is extended to include `.editorconfig`, `.nvmrc`, `.node-version`, and `.gitattributes` at the root.

The verify pipeline does not enforce `.editorconfig` directly; Prettier covers the file types it owns, and `.editorconfig` covers the rest. A maintainer running `git diff` against a Windows checkout immediately surfaces any drift.
