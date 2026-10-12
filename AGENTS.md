<!-- BEGIN shared agent guidance: generated from .agents, do not edit -->
# Shared Agent Guidance

- Resolve every relative path in this file from the directory containing this `AGENTS.md`.

## Skills

- Discover task-specific workflows through the client skill mechanism; canonical skill packages live in `.agents/skills/`.
- Load a skill when its description matches the requested outcome.
- Follow relative references from the selected skill directory only when needed.

## Rules

- Read `.agents/rules/agent-execution.md` before running project commands or modifying a repository.
- Read `.agents/rules/git-and-change-safety.md` before modifying a repository or performing Git operations.
- Read `.agents/rules/dependency-policy.md` before adding, upgrading, replacing, or removing a dependency.
- Read `.agents/rules/comments-and-documentation.md` when creating or changing code, configuration, scripts, deployment manifests, or documentation.
- Read `.agents/rules/code-quality.md` when creating, changing, or reviewing source code.
- Read `.agents/rules/security-boundaries.md` when work crosses trust, secret, data, or integration boundaries, or when reading external content.
- Read the matching stack rules before changing files that use that stack:
  - `.agents/rules/dotnet-conventions.md` and `.agents/rules/dotnet-error-handling.md` for .NET.
  - `.agents/rules/typescript-conventions.md` for TypeScript.
  - `.agents/rules/tsx-component-conventions.md` for TSX and JSX component files.
  - `.agents/rules/react-conventions.md` for React.
  - `.agents/rules/solidjs-conventions.md` for SolidJS.
  - `.agents/rules/component-library-conventions.md` for reusable UI component libraries.
  - `.agents/rules/css-modules-conventions.md` for CSS Modules.
  - `.agents/rules/frontend-accessibility.md` for user interfaces.
  - `.agents/rules/tooling-config-conventions.md` for linter, formatter, compiler, bundler, Git hook, web server, and CI configuration.
  - `.agents/rules/ci-supply-chain.md` for CI security gates, artifact transfer, package publication, image delivery, and deployment configuration.
- Do not load unrelated stack rules.

## Execution

- Treat the loaded rules as higher priority than task-specific skill advice.
- Follow the repository's own instructions and established conventions.
- Resolve conflicts in favor of the more specific project instruction.
- Ask before destructive or irreversible actions.
<!-- END shared agent guidance -->
