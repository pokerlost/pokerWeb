# Third-party notices

Original repository source and documentation use [MIT](LICENSE).

Vue 3, Vue Router and Zod, plus their resolved production dependencies, retain
their upstream permissive licenses. package-lock.json records exact versions and
available SPDX metadata. The static artifact includes dependency license files;
this does not make dependencies original MIT code. The immutable Flutter input
keeps assets/NOTICES and its licenses directory. Nginx/base image terms remain in
the upstream image. Tooling licenses stay in installed build distributions.

The CI-only [ORAS CLI 1.3.5](https://github.com/oras-project/oras/tree/v1.3.5) and official setup action use Apache-2.0. The CLI is checksum-verified in the runner tool cache and is not included in the runtime image. Preserve its upstream license if redistributing that tool.
