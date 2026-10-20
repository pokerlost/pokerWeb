# Website development

Git, Make and Docker/Buildx are the required tools. The native npm lock owns dependency
resolution inside Docker; contributors do not need a host Node or Flutter SDK.

```bash
make help
make check
make coverage
make build
make verify
```

`check` runs non-mutating format/lint, Vue/TypeScript and browser-test types, all unit tests
and Helm validation. `coverage` reads the fresh JSON summary without rerunning tests. Below
100% is advisory; zero tests, assertions, types, build failures and missing/corrupt/stale
reports fail. The current executable scope includes Vue, TypeScript and owned Node tools;
statements, lines, functions and branches remain separate in `coverage/summary.md`.

`build` exports the static website. `verify` builds the candidate through the same cached
Docker graph and freshly runs the seven Playwright scenarios against read-only non-root
Nginx with the real Flutter bundle. The test network is internal and receives no browser
profile or daemon socket. Screenshots, traces and HTML are under `coverage/browser/`.
The suite covers actual Flutter load, route lifecycle, cancellation, responsiveness,
accessibility/fullscreen, manifest/bridge validation and asset failure recovery.

The default `GAME_ARTIFACT` is the immutable private OCI reference in
`game-artifact.lock.json`. Actions must actually pull it using this repository's package
Read ACL. A reviewed local exported directory can be supplied explicitly as
`make verify GAME_ARTIFACT=/absolute/path/poker-game-web`; this local mode does not prove
Actions ACL. Vue changes consume the same Flutter input without rebuilding Flutter.

After a successful online `make ci-local` for the same clean source,
`OFFLINE=1 make ci-local` verifies the complete saved static file inventory,
source identity, runtime image ID and browser image ID before reuse. It runs the
source suite and seven browser cases freshly on an internal network, without
BuildKit, image pulls or a registry lookup. Missing inputs, changed bytes or
replaced images block reuse. The saved `coverage/web-build.json` and browser
source/image records remain separate from each fresh CI receipt. Offline reuse
does not publish or relabel the pinned Flutter artifact.

For an optional native Node development loop use `npm ci --ignore-scripts` and
`npm run dev -- --host 127.0.0.1`; production acceptance remains Docker-owned.
See [delivery](release_guide.md), [static hosting](deployment.md) and
[architecture](architecture.md). Native Flutter client delivery is deferred; shared gameplay
and web delivery remain supported.

## Frontend style and boundaries

This page owns the repository implementation of the [common frontend standard](https://github.com/serrja/baseRules/blob/main/docs/frontend.md), architecture and verification commands.
ESLint 10, typescript-eslint, eslint-plugin-vue and locked ESLint Stylistic 5.10.0
own JS/TS/Vue formatting: statement semicolons, double ordinary quotes, native
template literals for interpolation, and double HTML attributes. Escapes and
protocol values keep their meaning. Nested Vue expressions retain valid syntax;
move genuinely complex expressions into a typed computed value. Prettier owns
JSON, Markdown, HTML and standalone CSS only; its ignore file excludes code.

`npm run format` writes through those tools; `npm run format-check` checks without
writing. A second format must make no change. `tools/style.test.mjs` checks real
syntax-aware fixes, preserved string values, Vue attributes and idempotence.
Docker and CLI use the same root configs and package lock, without editor settings.

`eslint-plugin-import-x` 4.17.1 is the only import sorter. Its `order` rule groups
Node built-ins (tooling only), external packages, internal `@/`/`#` aliases, then
relative imports. Type-only imports stay in their origin group and use explicit
`import type`. Groups and the following code have exactly one blank line; imports
within a group stay together. `newline-after-import`, Stylistic's empty-line rule
and Vue's `padding-line-between-blocks` enforce spacing, including script/template/style.
Unbound CSS/polyfill imports keep their position and evaluation order: autofix never
moves them across bound imports. An ordering error blocked by a side effect requires
owner review; do not move the side effect merely to silence lint. Prettier does not
sort imports. Syntax-aware fixtures cover these boundaries and a second unchanged fix.

Existing `type-check`/`typecheck` and `format-check`/`format:check` aliases remain
compatible with contributor and Docker commands. Oxlint supplies correctness checks;
its ESLint integration disables overlapping rules. ESLint owns import/style checks.
There is no second import sorter or formatter for code.

Vue 3 Composition API owns pages and the embedding host, Flutter owns the shared
gameplay UI. Components render and emit typed events; reusable reactive behavior
may use composables, while pure functions stay plain functions. Keep local state
local. Validate external bridge messages at runtime, use closed typed states and
explicit stable wire values, and reject unknown variants. Dispose listeners,
timers, requests, subscriptions and Flutter views with their owner lifecycle.
Strict TypeScript and separate vue-tsc remain mandatory; casts do not replace
validation. Existing design tokens, keyboard focus and responsive behavior remain.

Cross-parent source imports use the existing `@/` Vite/TypeScript alias; the root
artifact lock uses native `#game-artifact` package imports. ESLint rejects `../`
imports. Local sibling imports remain valid. The bridge boundary uses locked Zod
schemas with derived TypeScript types and sanitized errors; pokerClient owns the
shared protocol fixture corpus and explicit Dart wire codecs. View loading/ready
states belong to the host, while engine/view timeouts carry milliseconds at their
loader owner. No gameplay algorithms or trusted server state move into Vue.

README describes actual scope, verified quickstart, access and limits; architecture
explains ownership. CONTRIBUTING links commands and AGENTS adds agent boundaries.
No personal resume, private credentials or unverified commercial claims belong here.
Dart follows [pokerClient's language rules](https://github.com/pokerlost/pokerClient/blob/main/docs/flutter-toolchain.md),
not JavaScript quote or semicolon rules. Web delivery is the supported acceptance.
