# Candidate delivery

Run the locked install, lint, typecheck, full-source unit coverage and real production-image browser acceptance. Check the client commit, manifest SHA256 and OCI digest, and confirm private package permissions. Inspect the final diff and artifacts for secrets, generated output and local metadata.

Publish a development container only for an explicitly reviewed head and approved private destination. Record its immutable digest, SBOM/provenance and test reports. Update platformInfra's artifact manifest through a PR. This is candidate delivery, not a tag, release, merge or production deployment. Promote only through a separately authorized release task and retain the prior compatible website/client digest pair for rollback.
