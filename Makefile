.DEFAULT_GOAL := help
GAME_ARTIFACT ?= ../pokerClient/dist/poker-game-web
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
	npm run test:browser
build:
	npm run build
run:
	npm run dev -- --host 127.0.0.1
image:
	docker buildx build --build-context game="$(GAME_ARTIFACT)" --load --tag pokerweb:candidate .
