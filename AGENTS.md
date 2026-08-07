# Repository rules

- Ease of use and simplicity outrank feature count. Every feature and every screen must be
  intuitive to a developer meeting it for the first time: how to configure it, how to start it,
  what it is doing right now, and why something failed. The interface answers those questions
  itself, not a document the operator has to go find.
- OpenClaw is the anti-example: twenty million features behind a UX where nothing is discoverable —
  you cannot tell how to configure it, how to build it, what it is doing, or what broke. Surface
  area bought at that price is a loss. A capability nobody can drive is worse than one that does not
  exist, because it also costs the time spent failing to drive it.
- Use the Node version from `.node-version` through `fnm` and the exact pnpm version from
  `packageManager`.
- Run `pnpm init` when creating a package manifest, then adapt the generated manifest.
- Pin the latest stable compatible version when adding a dependency. Check the registry first.
- Server-side TypeScript runs through Node's native type stripping. Keep TypeScript syntax erasable and
  never put a build step between an operator and a lab running from these sources.
- Publishing is the one exception, and it is not a choice: Node refuses to strip types from files
  inside `node_modules`, so an installed package whose runtime is TypeScript cannot start at all.
  Every published package emits JavaScript with `tsc -p tsconfig.build.json` — plain erasure, no
  bundler — and states where that emit lands in `publishConfig`, which pnpm swaps in when it packs.
  The sources stay the thing that runs everywhere else.
- Never create barrel files. Export explicit package subpaths and import the module that owns a symbol.
- Use absolute aliases: `#src/*` inside a package and explicit `@openlab/<package>/<module>` subpaths across
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
- Add a shadcn component with `pnpm shadcn add <component>` and never let it overwrite a component
  that already exists. Answer `n` to every overwrite prompt; `--yes` accepts them all, and the
  registry version silently undoes local fixes and reintroduces banned styles. Bring the generated
  file up to these rules before using it: drop the `.ts` and `.tsx` import specifiers and run
  `pnpm format`.
- Use a monospace font only where literal code is rendered: JSON payloads, source, and shell commands.
  Identifiers, timestamps, counts, metrics, and file paths are prose and use the sans-serif face.
- Letter-spacing is forbidden. Never use `tracking-*` utilities or a `letter-spacing` declaration.
- `text-sm` is the smallest permitted font size. Never set a smaller one, including through an
  arbitrary value such as `text-[10px]`. Express sizes with the named Tailwind scale.
- Never truncate text unless the full value stays reachable in the interface. Ellipsis, `line-clamp-*`,
  and clipped overflow are only allowed alongside a way to reveal the whole thing, such as expanding
  the row or wrapping it. Values the operator has to read or copy, including commands, paths, and
  identifiers, must be shown in full.
- Biome is the formatter and linter for every workspace. Use four spaces and no trailing commas. Run
  `pnpm format` and `pnpm check` before committing.
- Prefer maintained, focused libraries over handwritten infrastructure when a quality library exists.
- Run model agents only through a locally authenticated agent CLI harness. Subscription billing is
  mandatory.
- Pin every model endpoint a harness talks to. Vendors serve subscription quota and pay-as-you-go
  billing from the same credential on different hosts or paths, so a configurable base URL is a silent
  path to usage-based billing.
- Define every finite domain value set (events, statuses, states, roles, lanes, result kinds) as a
  named `const` object with `as const`, and infer its union type from that object. Zod schemas and all
  comparisons must use those constants. Do not use TypeScript `enum` or domain magic strings.
- Every test must be able to fail for the reason its name states. Never assert what the query already
  guarantees: finding an element by its text and then asserting that same text, or asserting that a
  query result exists when the query already throws when it does not, proves nothing and passes
  forever. Assert an outcome the selector did not already decide.
- Never write a test whose only purpose is to record that something was removed, renamed or restyled.
  A test earns its place by protecting behaviour someone depends on, not by narrating the last diff.
- Make a conventional commit after every coherent block. Stage only files owned by that block.

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Conventional commit titles, plain language: `fix(web): new threads no longer spike CPU`.
- Body: the problem in a sentence or two, then how you fixed it. End with the model and harness that
  did the work.
- **Rebase onto latest main before opening.** Stale branches conflict and burn a review round.
- UI changes need images. Pair before with after when the surface already existed; show the new
  state alone when the PR creates it, because an empty page is not a before. Motion or timing needs a
  short video. A paragraph describing a screen is never a substitute for the screen.
- Upload an image to GitHub's attachment store and reference the URL it answers with. Never commit a
  screenshot to the repository and never push one to a branch of its own: the picture belongs to the
  conversation, not to the source tree. The endpoint is undocumented but takes an ordinary token, and
  what it stores renders in a private repository exactly as a drag-and-drop does.

    ```bash
    curl -s "https://uploads.github.com/user-attachments/assets?name=$FILE&content_type=$MIME&repository_id=$(gh api "repos/$REPO" --jq .id)" \
        -X POST -H "Authorization: Bearer $(gh auth token)" \
        -H "Accept: application/json" --data-binary "@$FILE"
    ```

    It answers `{"url": "..."}`, which goes straight into an `<img>` tag in the body.
- Shoot the dashboard from a lab that is actually running, never from a mock. Start the daemon with
  `OPENLAB_HOME` pointed somewhere disposable so the operator's own lab is untouched, then capture the
  page with `chrome --headless --screenshot`. A shot taken from real preflight output states what this
  machine answered, which is the only thing a reviewer can check.
- Never tick a checklist box for work that was not done. An unticked box beside the reason is a fact a
  reviewer can act on; a ticked one the text below then contradicts is a claim they have to catch.
- One concern per PR. If the description says "also", split it.
- When babysitting: poll checks and comments newer than the last push, verify each bot finding against
  the source, fix real ones, dismiss false positives with a written reason. Stay quiet when nothing is
  new. Stop when the bots are green on the latest commit.

## Taste

- Comments describe how a thing is used, and move when the code moves. To be used mostly to describe
  functions, not to annotate every line of behavior.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before
  breaking it.
- Don't verify with browsers or computer use unless the user explicitly agrees or requests it.
- Security is important, but should not be over-indexed on, especially for dev mode/maintainer-only
  features.
