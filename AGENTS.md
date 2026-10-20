# pokerWeb

Read selected [baseRules](https://raw.githubusercontent.com/serrja/baseRules/730418d3cc480b4f05b88b4c8275296c4845a75a/docs/engineering.md), then [Pokerlost norms](https://raw.githubusercontent.com/pokerlost/projectRules/4785546cffa58f7ae1c22b6d6b8846a0141793eb/docs/project.md) before the local contract below.
These full-SHA links are reading sources, not automatic loaders or grants. Review
the source diff, update the explicit pin and run docs checks for a rules refresh.
Local overrides apply only to this repository's stated ownership boundary.

Vue owns the accessible website and route lifecycle. The versioned pokerClient Flutter artifact owns gameplay. Keep one Flutter engine and at most one active view. Read the canonical frontend rules in docs/development.md. Run typecheck, lint, unit coverage and production-browser tests. Preserve secrets and user data. GitHub remotes, registry destinations, external clusters, merge and release require explicit task authorization. Repository-local IDE/cache cleanup follows the task's exact paths and private backups.
