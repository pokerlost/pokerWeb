# pokerWeb

Vue and TypeScript own the accessible website and navigation. The game route lazily adds one view to the versioned Flutter bundle built by pokerClient. Native and web use the same gameplay package; production game/login APIs remain unavailable. Preview chips are synthetic.

Use Node 24.22.0 and npm 11.19.1. Run `make install lint typecheck test-unit build test`. Build requires a reviewed client artifact matching `game-artifact.lock.json`; `POKER_GAME_ARTIFACT` supplies its local exported directory. `make run` starts loopback development. Production browser checks use the built website and actual Flutter assets.

See [architecture](docs/architecture.md) and [development](docs/development.md). Private gameplay assets require read access for the website Actions repository.

The current candidate uses an actual clean-commit client artifact pinned by commit and manifest SHA256. Local production-browser acceptance runs against that bundle. See [static delivery](docs/deployment.md), [versioning](docs/versioning.md) and [candidate delivery](docs/release_guide.md). Shared CI tool installers are consumed at a full reviewed fastApiTemplate commit, rather than maintained as a second implementation here.
