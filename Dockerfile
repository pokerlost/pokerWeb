# syntax=docker/dockerfile:1.27.1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
FROM node:24.22.0-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=pokerweb-npm-node24-linux-amd64,target=/root/.npm,sharing=locked npm ci --ignore-scripts

FROM dependencies AS build
COPY tsconfig.json tsconfig.app.json tsconfig.node.json tsconfig.vitest.json env.d.ts vite.config.ts index.html game-artifact.lock.json ./
COPY --exclude=**/__tests__/** src/ src/
COPY public/ public/
COPY tools/install-game.mjs tools/install-game.mjs
# A named immutable client artifact input, never a second source checkout.
COPY --from=game / /game-artifact/
ENV POKER_GAME_ARTIFACT=/game-artifact
RUN --network=none npm run build-only

FROM dependencies AS test
COPY . ./
CMD ["npm", "run", "test:unit"]

FROM scratch AS artifacts
COPY --from=build /app/dist/ /

FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:782bb89768cc87b7f95c18b95baa1af250e5d451f26794f59363540161147c01 AS runtime
COPY --chown=101:101 --chmod=0444 deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=101:101 /app/dist/ /usr/share/nginx/html/
LABEL org.opencontainers.image.source="https://github.com/pokerlost/pokerWeb"
USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=2s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz
ENTRYPOINT ["nginx", "-g", "daemon off;"]
