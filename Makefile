.PHONY: help install dev build preview clean format lint test test-watch test-coverage check e2e e2e-ui lighthouse new-post new-case ci

help:
	@echo ""
	@echo "  Development"
	@echo "    make dev            Start dev server"
	@echo "    make build          Build for production"
	@echo "    make preview        Preview production build"
	@echo ""
	@echo "  Testing"
	@echo "    make test           Run unit tests"
	@echo "    make test-watch     Run tests in watch mode"
	@echo "    make test-coverage  Run tests with coverage"
	@echo "    make e2e            Run Playwright tests"
	@echo "    make e2e-ui         Run Playwright with UI"
	@echo ""
	@echo "  Code Quality"
	@echo "    make check          TypeScript type checking"
	@echo "    make lint           ESLint"
	@echo "    make format         Prettier"
	@echo "    make lighthouse     Lighthouse audit"
	@echo "    make ci             Full CI pipeline"
	@echo ""
	@echo "  Content"
	@echo "    make new-post       Create new blog post"
	@echo "    make new-case       Create new case study"
	@echo ""
	@echo "  Maintenance"
	@echo "    make install        Install dependencies"
	@echo "    make clean          Remove build artifacts"
	@echo ""

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

test:
	npm run test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

e2e:
	npm run e2e

e2e-ui:
	npm run e2e:ui

check:
	npm run check

format:
	npm run format

lint:
	npm run lint

lighthouse:
	npm run lighthouse

ci: lint check test build
	@echo "CI passed"

new-post:
	npm run new:post

new-case:
	npm run new:case-study

clean:
	rm -rf dist .astro node_modules/.cache
