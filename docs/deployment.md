# Static deployment

From the exact clean pokerClient root, run `make check export-web` with Docker/Buildx. The pinned Flutter/Dart image builds and verifies `dist/poker-game-web`; move an earlier export to a task-owned backup before creating a fresh one. The exporter is Dart; no host language SDK, Python client or sibling template is required. Review and pin its full source commit and manifest SHA256 in `game-artifact.lock.json`. The installer checks inventory, symlinks, every file checksum and bridge version. The directory `/game/<manifest SHA256>/` is immutable. Entry HTML uses revalidation; missing Flutter assets return 404. No service worker or external asset CDN is used.

For a local exported directory, run `make build test-browser GAME_ARTIFACT=/absolute/path/to/poker-game-web` from this repository root. `make image GAME_ARTIFACT=/absolute/path/to/poker-game-web` uses the same directory as the standard Docker `game` named build context. For CI, the lock additionally pins `image: ghcr.io/pokerlost/poker-game-web@sha256:...`; grant only pokerWeb Actions read access to that private client package. Docker dependencies are keyed by the npm lock, separate from application sources and tests. GHA caches remain private to the source repository; browser tests always run fresh.

The runtime is pinned Nginx unprivileged, UID 101, port 8080, with no Python, Node or Flutter SDK. Run it with a read-only filesystem, dropped capabilities, no-new-privileges and a writable bounded `/tmp`. `/healthz` is a static technical probe. Unknown `/api` and `/realtime` requests return 404. The CSP permits the Flutter WASM renderer and its inline styles but no JavaScript `unsafe-eval`, external origins or wildcard authorization.

`platformInfra` owns Compose/Helm application composition and ingress. This chart exposes only ClusterIP. Use a reviewed image digest for deployment; local non-latest tags require explicit `localDevelopment=true`. It sets readiness/liveness, resources, a disruption budget, read-only non-root pods and no service-account token. TLS and request routing belong to pokerGateway. NetworkPolicy enforcement needs a compatible CNI and a separate live check.

Rollback selects the previous image digest and Helm revision; client commit, artifact manifest and bridge compatibility must travel together. No database, migration or application secret belongs to this static image. Production activation, merge and release require a separate task.

## Reviewed image publication

Manual `delivery.yml` accepts a full `reviewed_sha` and successful same-repository
`verified_run_id` from `ci.yml`. Both actor and triggering actor must be `serrja`, and
the selected ref SHA must equal `WEB_IMAGE_REVIEWED_SHA`. It downloads the exact CI
candidate, loads its archive and checks the source/image receipt. A cached BuildKit
solve must match that tested configuration before publication to the approved private
`ghcr.io/pokerlost/pokerweb` destination. The OCI readback must remain private and match
the tested image; SBOM/provenance accompany publication. Main pushes run CI and do not
publish. A skipped admission or failed publication fails the delivery result.

The browser and publisher require actual package Read access to the pinned gameplay
artifact. Access, test, type, build and invalid-report failures block acceptance;
measured coverage below 100% emits a warning and remains successful. Registry
authentication exists only in a temporary job directory. See the
[delivery guide](release_guide.md) for the complete boundary and recovery procedure.

## Static routing and logs

Read the [routing ADR](routing-adr.md). Only known Vue routes receive the SPA shell;
unknown operations/assets return 404. Methods other than GET/HEAD return 405 with
Allow. WASM uses application/wasm; immutable content-addressed Flutter assets and
hashed Vue assets use a one-year cache. Security headers and validated request IDs
are included in error responses too. JSON access logs omit raw URL/query, headers
and bodies; the platform collector supplies service/environment context. Native
file-not-found logs are disabled to avoid echoing query material. `nginx -T` and
real HTTP/browser checks validate the included nonsecret environment configuration.

The image retains upstream dependency licenses under `/licenses`; a hashed static
license asset is linked from HTML. Project [MIT](../LICENSE) does not relicense
those dependencies or the Flutter bundle notices.

## Reproducible image identity

Native Make and Actions builds pin `SOURCE_DATE_EPOCH` to the exact source commit timestamp, using [BuildKit's supported reproducible-build input](https://docs.docker.com/build/ci/github-actions/reproducible-builds/). Wall-clock creation metadata must not change a tested configuration during private promotion. The strict tested image-ID comparison remains required; a cache hit alone is insufficient.

Both Docker and OCI runtime exporters enable BuildKit rewrite-timestamp=true. SOURCE_DATE_EPOCH alone stabilizes creation metadata but does not ensure identical COPY layer metadata between fresh checkouts; strict pre/post-push image-ID checks remain in place.
