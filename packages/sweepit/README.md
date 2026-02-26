# sweepit

Run Sweepit lint rules against a project without changing that project's dependencies.

## Usage

```bash
npx sweepit <project-dir>
```

If `~/.sweepit` has not been initialized yet, Sweepit will initialize it first.

## Explicit initialization

```bash
npx sweepit init
```

This creates `~/.sweepit`, writes `~/.sweepit/eslint.config.mjs`, and installs:

- `eslint@^9`
- `eslint-plugin-sweepit@latest`

## How lint runs

Sweepit executes ESLint from the private toolchain directory:

```bash
~/.sweepit/node_modules/.bin/eslint --config ~/.sweepit/eslint.config.mjs <project-dir>
```

This keeps project dependencies and lockfiles untouched.
