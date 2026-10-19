GAME_ARTIFACT ?= docker-image://$(shell sed -n 's/.*"image": "\([^"]*\)".*/\1/p' game-artifact.lock.json)
ifneq ($(CONTAINERIZED),1)
QUALITY_DOCKERFILE := Dockerfile
QUALITY_IMAGE := pokerweb:quality
QUALITY_RUN_ARGS := --tmpfs /app/node_modules/.vite-temp:rw,mode=1777 --tmpfs /app/node_modules/.tmp:rw,mode=1777 --tmpfs /app/node_modules/.vite:rw,mode=1777
RUNTIME_IMAGE := pokerweb:candidate
IMAGE_COMMAND = $(DOCKER) buildx build $(DOCKER_BUILD_ARGS) --build-context game="$(GAME_ARTIFACT)" --target runtime --load --tag $(RUNTIME_IMAGE) .
VERIFY_COMMAND := /bin/sh docker/verify-browser.sh
BUILD_COMMAND = $(DOCKER) buildx build $(DOCKER_BUILD_ARGS) --build-context game="$(GAME_ARTIFACT)" --target artifacts --output type=local,dest=dist .
COVERAGE_COMMAND := node tools/coverage-report.mjs
QUALITY_EXTRA_TARGETS := chart-check
include docker/quality.mk
.PHONY: browser-image test-browser game-image
game-image:
	@printf "%s\n" "$(GAME_ARTIFACT)" | sed "s,^docker-image://,,"

.PHONY: browser-image test-browser
browser-image:
	$(DOCKER) buildx build $(DOCKER_BUILD_ARGS) --target browser --load --tag pokerweb:browser .
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
