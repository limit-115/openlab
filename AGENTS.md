# Repository rules

- Use the Node version from `.node-version` through `fnm` and the exact pnpm version from
  `packageManager`.
- Run `pnpm init` when creating a package manifest, then adapt the generated manifest.
- Pin the latest stable compatible version when adding a dependency. Check the registry first.
- Server-side TypeScript runs through Node's native type stripping. Keep TypeScript syntax erasable and
  do not add a transpilation build step for Node packages.
- Never create barrel files. Export explicit package subpaths and import the module that owns a symbol.
- Use absolute aliases: `#src/*` inside a package and explicit `@lab/<package>/<module>` subpaths across
  workspaces. Do not use relative source imports or `.js` specifier workarounds.
- Biome is the formatter and linter for every workspace. Use four spaces and no trailing commas. Run
  `pnpm format` and `pnpm check` before committing.
- Prefer maintained, focused libraries over handwritten infrastructure when a quality library exists.
- Make a conventional commit after every coherent block. Stage only files owned by that block.

