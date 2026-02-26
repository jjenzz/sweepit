# 🧹 sweepit

Run Sweepit's lint rules without changing your project dependencies.

## Quick start

```bash
npx sweepit ./path/to/project
```

The first run initializes a private toolchain in `~/.sweepit`, then lints the target project.

## Guarantees

- does not modify the target project's `package.json`
- does not modify the target project's lockfile
- keeps lint dependencies isolated to `~/.sweepit`

## Packages

- `packages/eslint-plugin-sweepit` - eslint plugin with Sweepit rules
- `packages/sweepit` - CLI that installs and runs the isolated toolchain
