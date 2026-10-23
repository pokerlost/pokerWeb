# Runtime environments

The typed HTTP adapter accepts explicit `main`, `dev`, `test` or `local` configuration through
`createGatewayClient` in `src/http/environment.ts`. It does not read Git, invent DNS, select main
as a fallback or acquire credentials. Unset endpoints fail locally as `not_configured`.

A caller loads explicit inputs before process/build variables, an explicitly chosen configuration
file and safe defaults. Never embed credentials in Vite variables or built JavaScript. Remote
environments require HTTPS; local requires loopback. The Nginx same-origin route and fixed gateway
ServiceId allowlist are unchanged. This adapter does not activate unavailable gameplay operations.

Create a new client when switching environment and dispose caller-owned state. Bound bearer calls
must supply matching environment and canonical origin; identity, audience/scopes and tokens are
separate. Partition any caller-owned cache/storage by environment, origin and identity. Never carry
main tokens into dev/test automatically. No server, DNS or deployment was created by this change.

[Development](development.md) describes the lint-only dev cycle. Integration tests remain manual.
