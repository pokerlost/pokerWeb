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

For an optional native Node development loop use `npm ci --ignore-scripts` and
`npm run dev -- --host 127.0.0.1`; production acceptance remains Docker-owned.
See [delivery](release_guide.md), [static hosting](deployment.md) and
[architecture](architecture.md). Native Flutter client delivery is deferred; shared gameplay
and web delivery remain supported.

## Frontend style and boundaries

This page owns common frontend architecture, documentation and verification rules.
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
