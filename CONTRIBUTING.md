# Contributing

Read [development and frontend style](docs/development.md) before changing the site.
Keep formatting, cleanup and behavior in reviewable commits. Use `make format` to
write the native format and `make format-check` to check it without writes; both
use the locked Docker tools. Run `make check build
verify`; inspect browser evidence and advisory coverage. Public contracts, Flutter
artifact identity and project-owned code need explicit review. README owns startup
and navigation; AGENTS owns additional agent boundaries.
