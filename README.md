# 🧹 sweepi

Sweepi is a personal project for enforcing LLM guardrails through linting.

The goal is to keep AI-assisted code generation aligned with a specific set of architectural and API design constraints, without forcing those dependencies into every target repository or their maintainers.

## Quick start

```bash
npx sweepi ./path/to/project
```

The first run initializes a private toolchain in `~/.sweepi`, then lints the target project.

## Guarantees

- does not modify the target project's `package.json`
- does not modify the target project's lockfile
- keeps lint dependencies isolated to `~/.sweepi`

## Packages

- `packages/eslint-plugin-sweepit` - The rule engine. This package contains Sweepit's opinionated ESLint rules and shared flat configs (`core`, `react`) used to enforce guardrails.
- `packages/sweepi` - The execution wrapper. This CLI bootstraps an isolated toolchain in `~/.sweepi` and runs ESLint against a target project without changing that project's dependency graph.
