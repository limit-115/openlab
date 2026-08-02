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
- Organize every non-trivial application and package feature-first. Keep a feature's contracts,
  constants, implementation, and tests together under a self-explanatory feature directory.
- Layer-first organization is forbidden. Never group modules by technical role: `components/`, `lib/`,
  `api/`, `utils/`, `helpers/`, `hooks/`, `services/`, `types/`, `constants/`, `models/`, and
  `handlers/` are banned as grouping directories. Group by what the code is about, not what it is made
  of. A directory name must describe a domain, never a technique.
- A source directory must not accumulate unrelated domains as a flat file list. Once a directory holds
  more than one feature, split it into feature directories in the same change.
- Split files by responsibility before they become mixed-purpose modules. Colocate a module's
  contracts and constants beside it: `research-loop.ts`, `research-loop.types.ts`,
  `research-loop.const.ts`, and `research-loop.test.ts`. Add narrower self-explanatory modules when a
  feature has multiple behaviors.
- A small single-domain package may use package-level `types.ts` and `constants.ts`. As soon as a
  second domain or feature appears, that shortcut is void and feature directories are mandatory.
- File names must be self-explanatory and state their subject. Generic dumping-ground names are
  forbidden.
- Keep feature modules cohesive rather than merely moving large files into directories. Public entry
  points should orchestrate feature modules; domain contracts and constants must not be hidden inside a
  large implementation file.
- Style the frontend with Tailwind utility classes only. Do not add stylesheet files, CSS modules, or
  inline style objects. Tailwind configuration and its single entry stylesheet are the only exceptions.
- Use a monospace font only where literal code is rendered: JSON payloads, source, and shell commands.
  Identifiers, timestamps, counts, metrics, and file paths are prose and use the sans-serif face.
- Letter-spacing is forbidden. Never use `tracking-*` utilities or a `letter-spacing` declaration.
- `text-sm` is the smallest permitted font size. Never set a smaller one, including through an
  arbitrary value such as `text-[10px]`. Express sizes with the named Tailwind scale.
- Biome is the formatter and linter for every workspace. Use four spaces and no trailing commas. Run
  `pnpm format` and `pnpm check` before committing.
- Prefer maintained, focused libraries over handwritten infrastructure when a quality library exists.
- Run model agents only through locally authenticated Codex or Claude CLI harnesses. Subscription
  authentication is mandatory. Never call a model API, accept an API key, or silently fall back to
  usage-based billing.
- Define every finite domain value set (events, statuses, states, roles, lanes, result kinds) as a
  named `const` object with `as const`, and infer its union type from that object. Zod schemas and all
  comparisons must use those constants. Do not use TypeScript `enum` or domain magic strings.
- Make a conventional commit after every coherent block. Stage only files owned by that block.
