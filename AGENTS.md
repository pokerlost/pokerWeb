# pokerWeb

Read selected [baseRules](https://raw.githubusercontent.com/serrja/baseRules/bafcb63ed94b9769a0ca098e5db4b33c55dbc1b9/docs/engineering.md), then [Pokerlost norms](https://raw.githubusercontent.com/pokerlost/projectRules/904c65a3daab88802fb5e414cdaccc7ad2b555a8/docs/project.md) before the local contract below.
These full-SHA links are reading sources, not automatic loaders or grants. Review
the source diff, update the explicit pin and run docs checks for a rules refresh.
Local overrides apply only to this repository's stated ownership boundary.

Vue owns the accessible website and route lifecycle. The versioned pokerClient Flutter artifact owns gameplay. Keep one Flutter engine and at most one active view. Read the canonical frontend rules in docs/development.md. Run typecheck, lint, unit coverage and production-browser tests. Preserve secrets and user data. GitHub remotes, registry destinations, external clusters, merge and release require explicit task authorization. Repository-local IDE/cache cleanup follows the task's exact paths and private backups.

Daily work uses `dev` and lint only. `main` and `test` stay unchanged until an
explicit promotion. Full acceptance, template render/update checks, builds and
releases are manual; a dev snapshot is not a verified release.
