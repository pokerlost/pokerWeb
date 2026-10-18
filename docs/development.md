# Website development

The native npm lock owns dependency resolution. `make lint` is non-mutating, `make typecheck` runs vue-tsc independently, `make test-unit` enforces full-source V8 coverage, and `make test` adds Playwright against the production build. Browser tests must exercise actual Flutter load, route leave/re-entry, cancellation, resizing and returned navigation. Unit tests may replace the external loader boundary to test failures deterministically.

Use only task-specific npm/browser caches. Run browser dependencies in a disposable test image when the host lacks them. The static runtime has no Node or Flutter SDK. Private cache/artifact destinations and registry writes require the task owner approval; local tests need no production credentials.

`playwright.config.ts` uses Vite preview by default. `POKER_WEB_BASE_URL=http://pokerweb:8080` selects an already running production image; it does not start another server. The test image has no external network access and receives no browser profile or daemon socket. The required CI gate includes both full-source coverage and the real production-image browser job. A missing immutable artifact reference or cross-repository package read permission fails that job.
