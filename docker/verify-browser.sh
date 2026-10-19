#!/bin/sh
set -eu
network="pokerweb-check-$(date +%s)-$$"
container="$network-runtime"
cleanup() {
    result=$?
    trap - EXIT
    if docker container inspect "$container" >/dev/null 2>&1; then
        docker logs "$container"
        docker rm --force "$container" >/dev/null
    fi
    if docker network inspect "$network" >/dev/null 2>&1; then
        docker network rm "$network" >/dev/null
    fi
    exit "$result"
}
trap cleanup EXIT HUP INT TERM
mkdir -p coverage/browser
docker network create --internal "$network" >/dev/null
docker run --detach --name "$container" --network "$network" --network-alias pokerweb \
    --read-only --cap-drop ALL --security-opt no-new-privileges:true \
    --tmpfs /tmp:rw,noexec,nosuid,size=32m pokerweb:candidate >/dev/null
ready=false
for _ in $(seq 1 30); do
    if docker exec "$container" wget -q -O /dev/null http://127.0.0.1:8080/healthz; then
        ready=true
        break
    fi
    sleep 1
done
test "$ready" = true
docker run --init --rm --network "$network" --read-only --tmpfs /tmp:rw,mode=1777 \
    --shm-size=512m --user "$(id -u):$(id -g)" --env CI=true \
    --env POKER_WEB_BASE_URL=http://pokerweb:8080 \
    --env POKER_WEB_RESULTS=/app/reports/results --env PLAYWRIGHT_HTML_OUTPUT_DIR=/app/reports/html \
    --mount "type=bind,source=$PWD/coverage/browser,target=/app/reports" pokerweb:browser
docker image inspect pokerweb:candidate --format '{{.Id}}' > coverage/tested-image-id.txt
git rev-parse HEAD > coverage/source-commit.txt
