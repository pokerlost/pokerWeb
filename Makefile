APP_VERSION = $(shell sed -n 's/.*"version": "\([^" ]*\)".*/\1/p' package.json | head -1)
SOURCE_COMMIT = $(shell git rev-parse HEAD)
SOURCE_DATE_EPOCH = $(shell git log -1 --pretty=%ct)
override DOCKER_BUILD_ARGS += --build-arg SOURCE_COMMIT=$(SOURCE_COMMIT) --build-arg APP_VERSION=$(APP_VERSION) --build-arg SOURCE_DATE_EPOCH=$(SOURCE_DATE_EPOCH)
GAME_ARTIFACT ?= docker-image://$(shell sed -n 's/.*"image": "\([^"]*\)".*/\1/p' game-artifact.lock.json)
ifneq ($(CONTAINERIZED),1)
QUALITY_DOCKERFILE := Dockerfile
QUALITY_DIST_MOUNT = --mount "type=bind,source=$(CURDIR)/dist,target=/app/dist,readonly"
QUALITY_IMAGE := pokerweb:quality
QUALITY_RUN_ARGS := --tmpfs /app/node_modules/.vite-temp:rw,mode=1777 --tmpfs /app/node_modules/.tmp:rw,mode=1777 --tmpfs /app/node_modules/.vite:rw,mode=1777
RUNTIME_IMAGE := pokerweb:candidate
IMAGE_COMMAND = $(DOCKER) buildx build $(DOCKER_BUILD_ARGS) $(LOCAL_BUILD_NETWORK) --build-context game="$(GAME_ARTIFACT)" --target runtime --output type=docker,rewrite-timestamp=true --tag $(RUNTIME_IMAGE) .
BROWSER_IMAGE ?= pokerweb:browser
VERIFY_COMMAND = RUNTIME_IMAGE=$(RUNTIME_IMAGE) BROWSER_IMAGE=$(BROWSER_IMAGE) /bin/sh docker/verify-browser.sh
BUILD_COMMAND = $(DOCKER) buildx build $(DOCKER_BUILD_ARGS) $(LOCAL_BUILD_NETWORK) --build-context game="$(GAME_ARTIFACT)" --target artifacts --output type=local,dest=dist .
COVERAGE_COMMAND := node tools/coverage-report.mjs
QUALITY_EXTRA_TARGETS := chart-check format-check
VERSION_COMMAND = $(QUALITY_RUN) node tools/project-metadata.mjs version
RELEASE_CHECK_COMMAND = $(DOCKER) image inspect $(RUNTIME_IMAGE) > coverage/runtime-image.json && $(QUALITY_RUN) node tools/project-metadata.mjs release-check
OFFLINE_PREFLIGHT_COMMAND = test -d "$(GAME_ARTIFACT)" && test -f "$(GAME_ARTIFACT)/artifact-manifest.json" || { echo "BLOCKED: offline Web needs the verified local bundle named by GAME_ARTIFACT." >&2; exit 2; }
CI_LOCAL_TARGETS := check coverage build chart verify release-check
RECEIPT_COMMAND = $(QUALITY_RUN) node tools/project-metadata.mjs receipt
include docker/quality.mk
.PHONY: build-metadata
build-metadata:
	@printf '%s\n' 'APP_VERSION=$(APP_VERSION)' 'SOURCE_DATE_EPOCH=$(SOURCE_DATE_EPOCH)'

quality-image: prepare-artifact-directory
.PHONY: prepare-artifact-directory
prepare-artifact-directory:
	@mkdir -p dist
.PHONY: format
format: quality-image
	$(DOCKER) run --init --rm --read-only --network none --tmpfs /tmp:rw,mode=1777,size=512m --user "$$(id -u):$$(id -g)" --mount "type=bind,source=$(CURDIR),target=/app" --mount "type=bind,source=$(CURDIR)/.git,target=/app/.git,readonly" --mount "type=volume,target=/app/node_modules" --workdir /app --env CONTAINERIZED=1 $(QUALITY_IMAGE) make format
.PHONY: browser-image test-browser game-image chart
chart: quality-image
	$(QUALITY_RUN) helm package deploy/chart --destination coverage/chart
game-image:
	@printf "%s\n" "$(GAME_ARTIFACT)" | sed "s,^docker-image://,,"

.PHONY: browser-image test-browser
browser-image:
	$(DOCKER) buildx build $(DOCKER_BUILD_ARGS) $(LOCAL_BUILD_NETWORK) --target browser --load --tag $(BROWSER_IMAGE) .
verify: image browser-image
test-browser: verify
else
.DEFAULT_GOAL := help
export POKER_GAME_ARTIFACT := $(GAME_ARTIFACT)
.PHONY: help install lint typecheck test-unit test-browser test build run image
help:
	@echo "install lint typecheck test-unit test-browser test build run image"
install:
	npm ci
format-check:
	npm run format-check
format:
	npm run format
lint:
	npm run lint
	npm run format:check
typecheck:
	npm run typecheck
test-unit:
	npm run test:unit
test-browser:
	npm run test:browser
test: test-unit
build:
	npm run build
run:
	npm run dev -- --host 127.0.0.1
image:
	docker buildx build --build-context game="$(GAME_ARTIFACT)" --load --tag pokerweb:candidate .

chart-check:
	helm lint deploy/chart --strict --set localDevelopment=true --set image.tag=ci-candidate

check: lint typecheck test chart-check

endif
