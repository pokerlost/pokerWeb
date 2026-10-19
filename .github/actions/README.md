# Shared CI installers

These byte-for-byte managed snapshots come from fastApiTemplate `512d7b7a4030f6bde210d355f164e59f0a4ec533`, `template/.github/actions/{actionlint,deployment-tools}/action.yml`. That repository owns tool versions, checksums and installer behavior. Update there first and refresh these files from the reviewed owner commit. Native repository workflows invoke the local snapshots because cross-organization private composite actions are unavailable to their GITHUB_TOKEN. No SDK App access or repository visibility is widened.
