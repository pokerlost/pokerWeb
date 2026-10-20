# syntax=docker/dockerfile:1.27.1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
FROM node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=pokerweb-npm-node24-linux-amd64,target=/root/.npm,sharing=locked npm ci --ignore-scripts

FROM dependencies AS quality
RUN apt-get update && apt-get install -y --no-install-recommends make curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN curl --fail --silent --show-error --location https://get.helm.sh/helm-v4.3.1-linux-amd64.tar.gz --output /tmp/helm.tar.gz \
    && echo '0403a88ae20913d11b10a2467b50087721fea7581736da6b9d3992f5357fe54b  /tmp/helm.tar.gz' | sha256sum --check --status \
    && tar -xzf /tmp/helm.tar.gz -C /tmp linux-amd64/helm && mv /tmp/linux-amd64/helm /usr/local/bin/helm && rm -rf /tmp/helm.tar.gz /tmp/linux-amd64
COPY --chmod=u=rwX,go=rX . ./
ENV CONTAINERIZED=1
CMD ["make", "check"]

FROM dependencies AS build
COPY tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.vitest.json env.d.ts vite.config.ts index.html game-artifact.lock.json ./
COPY --exclude=**/__tests__/** src/ src/
COPY public/ public/
COPY tools/install-game.mjs tools/project-metadata.mjs tools/
COPY deploy/chart/Chart.yaml deploy/chart/Chart.yaml
ARG SOURCE_COMMIT
ENV SOURCE_COMMIT=$SOURCE_COMMIT
COPY --chmod=0444 LICENSE THIRD_PARTY_NOTICES.md /licenses/
# Retain installed dependency notices without relicensing their code.
RUN --network=none find node_modules -type f     \( -iname 'license*' -o -iname 'notice*' -o -iname 'copying*' \)     -exec cp --parents --target-directory=/licenses/ {} +
# A named immutable client artifact input, never a second source checkout.
COPY --from=game / /game-artifact/
ENV POKER_GAME_ARTIFACT=/game-artifact
RUN --network=none npm run build-only && node tools/project-metadata.mjs build-version
RUN --network=none set -eu; \
    find /licenses -type f -print0 | sort -z | xargs -0 cat > /tmp/third-party-licenses.txt; \
    license_hash="$(sha256sum /tmp/third-party-licenses.txt | cut -d ' ' -f 1)"; \
    cp /tmp/third-party-licenses.txt "dist/assets/licenses-$license_hash.txt"; \
    sed -i "s#</head>#<link rel=license href=/assets/licenses-$license_hash.txt></head>#" dist/index.html

FROM dependencies AS test
COPY . ./
CMD ["npm", "run", "test:unit"]

FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf AS browser
WORKDIR /app
COPY --from=dependencies /app/node_modules/ node_modules/
COPY --chmod=u=rwX,go=rX e2e/ e2e/
COPY --chmod=0444 package.json playwright.config.ts game-artifact.lock.json ./
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
CMD ["npm", "run", "test:browser"]

FROM scratch AS artifacts
COPY --from=build /app/dist/ /

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:782bb89768cc87b7f95c18b95baa1af250e5d451f26794f59363540161147c01 AS runtime
COPY --chown=101:101 --chmod=0444 deploy/nginx/http.conf /etc/nginx/conf.d/default.conf
COPY --exclude=http.conf --chown=101:101 --chmod=u=rX,go=rX deploy/nginx/ /etc/nginx/pokerlost/
COPY --chown=101:101 --chmod=0444 deploy/environments/local.conf /etc/nginx/pokerlost/environment.conf
COPY --from=build --chown=101:101 /app/dist/ /usr/share/nginx/html/
COPY --chmod=u=rwX,go=rX --from=build /licenses/ /licenses/
ARG SOURCE_COMMIT=unrecorded
ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/pokerlost/pokerWeb"
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=2s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz
ENTRYPOINT ["nginx", "-g", "daemon off;"]
