# pokerWeb

Vue and TypeScript own the accessible website and navigation. The game route lazily embeds
one real Flutter Web view from pokerClient's shared `poker_game`. Web delivery is supported;
native Flutter targets are deferred. Production game/login APIs remain unavailable and
preview data is explicitly synthetic.

From this exact Git root, Git, Make and Docker suffice:

```bash
make help
make check
make coverage
make build
make verify
```

Coverage below 100% warns; tests, types, configuration, builds and report errors fail.
The website pins a reviewed private Flutter OCI artifact by digest, client SHA and manifest
checksum. Browser acceptance uses that actual bundle under Nginx. See
[development and testing](docs/development.md), [architecture](docs/architecture.md),
[static delivery](docs/deployment.md), [routing ownership](docs/routing-adr.md), [versioning](docs/versioning.md) and
[candidate delivery](docs/release_guide.md). Docker recipes and contribution metadata are
reviewed snapshots with an exact source revision in `.github/engineering-source.json`.

Run `make help` for native tasks, `make version` for canonical artifact versions,
and `make ci-local` for the local required checks and `coverage/ci-local.json`.
`make release-check` validates built artifact identity; it does not publish or tag.
See [version and release policy](docs/versioning.md).

## 📄 License

Original source/documentation uses [MIT](LICENSE). Preserve the
[third-party notices](THIRD_PARTY_NOTICES.md); upstream assets, distributions and
private data retain their own terms and access boundaries.
