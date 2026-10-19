# Candidate delivery

Ordinary CI runs the commands in [development](development.md), obtains the pinned private
Flutter package in Actions, executes browser acceptance and exports the exact tested image
archive, source identity and checksum receipt as `web-candidate-<full SHA>`. It never publishes.

The separate `Reviewed web runtime delivery` manual workflow accepts only serrja and the
exact full branch SHA equal to `WEB_IMAGE_REVIEWED_SHA`. It downloads an explicitly selected
successful same-repository CI run for that SHA and checks the transferred image identity.
A cached runtime solve must match that tested configuration before a registry write. It
publishes only the approved private `ghcr.io/pokerlost/pokerweb` development destination,
adds SBOM/provenance and reads back the immutable digest and private visibility. Missing
access or a mismatched artifact fails; no local daemon is assumed to survive across jobs.
A manual workflow must exist on the reviewed default branch before dispatch.

Inspect the diff and artifacts for secrets and local state. Record actual CI URLs, image ID,
OCI digest and Flutter manifest identity in the PR. Update platformInfra pins through a PR.
Merge, tags, releases and production deployment require a separate task. Recovery uses the
previous verified compatible website/client digest pair, preserving history and storage.

The transferred Docker archive contains the tested image configuration and layers, not an
attested OCI index. Directly pushing that archive would not preserve the requested SBOM and
provenance. The existing native Buildx path therefore checks one cached solve before registry
access and exports the same graph with attestations; its final readback verifies the tested
configuration. This is not a promise of zero rebuilding on a cache miss. Record the published
OCI index digest separately from the Docker image/configuration ID. No custom promotion
resolver or additional build-cache mechanism is needed for this archive format.
