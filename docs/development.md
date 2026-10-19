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
