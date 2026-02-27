# sweepi

Run Sweepit lint rules against a project without changing that project's dependencies.

## Usage

```bash
npx sweepi [project-dir]
```

If `~/.sweepi` has not been initialized yet, Sweepi will initialize it first.

By default, Sweepi lints changed files only (staged, unstaged, and untracked), limited to `.ts` and `.tsx`.

Use `--all` to lint all TypeScript files in the project:

```bash
npx sweepi [project-dir] --all
```

## Explicit initialization

```bash
npx sweepi init
```

This creates `~/.sweepi`, writes `~/.sweepi/eslint.config.mjs`, and installs:

- `eslint@^9`
- `eslint-plugin-sweepit@latest`
- Sweepi skill via `npx skills add jjenzz/sweepi`

## How lint runs

Sweepi executes ESLint from the private toolchain directory:

```bash
~/.sweepi/node_modules/.bin/eslint --config ~/.sweepi/eslint.config.mjs <changed-files>
```

This keeps project dependencies and lockfiles untouched.
