.PHONY: check setup-hooks lint lint-web lint-native build build-web build-native clean help

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo "Available targets:"
	@echo "  make check          Pre-commit gate: lint web (ESLint+Stylelint) + native (clang-tidy)"
	@echo "  make setup-hooks    Install .git/hooks/pre-commit (run once after clone)"
	@echo "  make lint           Alias for check"
	@echo "  make lint-web       Web lint only (ESLint + Stylelint)"
	@echo "  make lint-native    Native lint only (clang-tidy)"
	@echo "  make build          Build web + native (release)"
	@echo "  make build-web      Build web frontend only"
	@echo "  make build-native   Build native backend only"
	@echo "  make clean          Remove build artifacts"

# ── Pre-commit gate ───────────────────────────────────────────────────────────

check: lint-web lint-native

lint: check

# ── Web ───────────────────────────────────────────────────────────────────────

lint-web:
	yarn lint:all:check

# ── Native ────────────────────────────────────────────────────────────────────

lint-native:
	yarn lint:native:check

# ── Build ─────────────────────────────────────────────────────────────────────

build: build-web build-native

build-web:
	yarn build:web:release

build-native:
	yarn configure:native
	yarn build:native:release

# ── Hook installation ─────────────────────────────────────────────────────────

setup-hooks:
	bash scripts/setup-hooks.sh

# ── Clean ─────────────────────────────────────────────────────────────────────

clean:
	yarn clean:all
