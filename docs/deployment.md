# Static deployment

From the exact pokerClient root, run `make install` and `make export-web ARTIFACT_OUTPUT=/absolute/fresh/poker-game-web` using its pinned Flutter/Dart SDK, then pin the clean reviewed commit. The exporter is Dart; no Python client or sibling template is required. Pin its full commit and manifest SHA256 in `game-artifact.lock.json`. The installer checks inventory, symlinks, every file checksum and bridge version. The directory `/game/<manifest SHA256>/` is immutable. Entry HTML uses revalidation; missing Flutter assets return 404. No service worker or external asset CDN is used.

For a local exported directory, run `make build test-browser GAME_ARTIFACT=/absolute/path/to/poker-game-web` from this repository root. `make image GAME_ARTIFACT=/absolute/path/to/poker-game-web` uses the same directory as the standard Docker `game` named build context. For CI, the lock additionally pins `image: ghcr.io/pokerlost/poker-game-web@sha256:...`; grant only pokerWeb Actions read access to that private client package. Docker dependencies are keyed by the npm lock, separate from application sources and tests. GHA caches remain private to the source repository; browser tests always run fresh.

The runtime is pinned Nginx unprivileged, UID 101, port 8080, with no Python, Node or Flutter SDK. Run it with a read-only filesystem, dropped capabilities, no-new-privileges and a writable bounded `/tmp`. `/healthz` is a static technical probe. Unknown `/api` and `/realtime` requests return 404. The CSP permits the Flutter WASM renderer and its inline styles but no JavaScript `unsafe-eval`, external origins or wildcard authorization.

`platformInfra` owns Compose/Helm application composition and ingress. This chart exposes only ClusterIP. Use a reviewed image digest for deployment; local non-latest tags require explicit `localDevelopment=true`. It sets readiness/liveness, resources, a disruption budget, read-only non-root pods and no service-account token. TLS and request routing belong to pokerGateway. NetworkPolicy enforcement needs a compatible CNI and a separate live check.

Rollback selects the previous image digest and Helm revision; client commit, artifact manifest and bridge compatibility must travel together. No database, migration or application secret belongs to this static image. Production activation, merge and release require a separate task.

## Reviewed image publication

`WEB_IMAGE_REVIEWED_SHA` selects one exact same-repository PR head for the development
image publisher. Both the complete source gate and actual production-browser job must
succeed. The publisher checks this run’s source/image receipt, resolves the same cached
BuildKit inputs, and compares the configuration before pushing to the approved private
`ghcr.io/pokerlost/pokerweb` destination. It reads the OCI index and platform manifest
back, checks the tested configuration again, and records the immutable reference with
SBOM/provenance. Main pushes require source/browser acceptance and do not publish.

The browser and publisher need package read access to the pinned gameplay artifact.
Missing ACL or incomplete coverage keeps the mandatory gate failed; publication does
not bypass it. Registry authentication exists only in a temporary job directory.
