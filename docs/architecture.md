# Website architecture

Vue owns semantic HTML, page routing, focus and the single `PokerGameHost` lifecycle. The host uses Flutter's official multi-view `addView` / `removeView` API. One engine promise is created lazily for the page lifetime; one active lease prevents duplicate mounts. Leaving a route aborts pending attachment and removes the active view/listener/timer. A failed engine download requires a page reload rather than starting a second engine.

The version-1 bridge validates context and events at runtime in TypeScript and Dart. Instance/view IDs reject stale updates. Only preview, theme and supported locale settings cross it; game state and credentials do not. Same-origin embedding is not a security boundary against other same-origin JavaScript.

The client exports an immutable checksummed manifest. The website pins its commit and manifest SHA256, verifies every file and serves the resulting bundle at `/game/`. Flutter missing assets must return 404, never the SPA HTML fallback. Entry HTML uses no-cache; hashed/verified versioned assets have a separate cache policy. No service worker is installed.
