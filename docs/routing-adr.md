# API routing ownership

Traefik in pokerGateway owns API service selection in the standard platform. Nginx serves the
Vue site and verified Flutter assets only. There is no standalone Nginx API proxy, second
allowlist, env-selected upstream, forward loop or automatic service-prefix compatibility mode.

HTTP clients explicitly send `x-pokerlost-serviceId` to one gateway origin and `/<operation>`.
The SDK owns exact service identifiers; deployment upstreams belong to platformInfra.
Service identity never grants authorization. Backend response status and authentication remain
backend-owned. No current gameplay server contract exists; HTTP transport does not make the
planned realtime source available. Browser WebSocket cannot carry arbitrary custom headers.

Known Vue routes load without custom headers. Unknown service operations and asset paths return
errors rather than the SPA shell. API/probes/metrics are not routed through Nginx. Cross-origin
API is disabled by default; same-origin fetch needs no wildcard CORS policy.

`deploy/nginx/http.conf` is included in Nginx's HTTP context; server, headers and routes are
separate logical units. `deploy/environments/local.conf` is the verified nonsecret local
listener/environment override. There is no envsubst step, so Nginx variables cannot disappear
through shell substitution. Remote auth/TLS belongs to the separately approved edge deployment.

## HTTP client boundary

`src/http/gateway.ts` is an explicit typed HTTP adapter for future implemented operations.
The service identity snapshot is generated from the SDK main SHA recorded in service-id.ts;
review that owner enum before updating either frontend snapshot. The adapter sends the canonical
payload envelope, separates Bearer authentication, validates response envelopes/results and
supports owner cancellation plus a ten-second timeout. It stores no credentials, retries no
mutations and leaves the current unavailable gameplay source unchanged. A browser WebSocket
constructor cannot carry this custom HTTP header; no production realtime transport is provided.
