.PHONY: dev dev-api dev-web dev-log logs db db-stop db-logs db-studio db-dump db-restore db-reset migrate migrate-dev push test test-unit test-integration test-e2e lint lint-report typecheck build clean stop help

# Default target
.DEFAULT_GOAL := help

# Colors
CYAN := \033[36m
RESET := \033[0m

# Backup location (iCloud)
BACKUP_DIR := $(HOME)/Library/Mobile Documents/com~apple~CloudDocs/Backups/prompttrack
DUMP_FILE := $(BACKUP_DIR)/prompttrack-$(shell date +%Y%m%d-%H%M%S).sql

##@ Development

API_PORT := $(shell grep -m1 '^PORT=' packages/api/.env | cut -d= -f2)
WEB_PORT := $(shell grep -m1 'port:' packages/web/vite.config.ts | grep -o '[0-9]\+')

dev: db ## Start all services (db + api + web)
	@echo "Waiting for Postgres to be ready..."
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	@echo "Freeing ports $(API_PORT) and $(WEB_PORT)..."
	@lsof -ti :$(API_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(WEB_PORT) | xargs kill -9 2>/dev/null || true
	@echo "Starting development servers..."
	pnpm dev

dev-api: db ## Start API only (with db)
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	@lsof -ti :$(API_PORT) | xargs kill -9 2>/dev/null || true
	pnpm dev:api

dev-web: ## Start Web only (no db needed)
	pnpm dev:web

dev-log: db ## Start all services with output logged to /tmp/prompttrack-{api,web}.log
	@echo "Waiting for Postgres to be ready..."
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	@lsof -ti :$(API_PORT) | xargs kill -9 2>/dev/null || true
	@lsof -ti :$(WEB_PORT) | xargs kill -9 2>/dev/null || true
	@echo "Logging API  → /tmp/prompttrack-api.log"
	@echo "Logging Web  → /tmp/prompttrack-web.log"
	@pnpm dev:api > /tmp/prompttrack-api.log 2>&1 &
	@pnpm dev:web > /tmp/prompttrack-web.log 2>&1 &
	@echo "Both servers started in background. Use 'make logs' to tail them."

logs: ## Tail API and web logs (from dev-log)
	@tail -f /tmp/prompttrack-api.log /tmp/prompttrack-web.log

##@ Database

db: ## Start Postgres (port 5451)
	docker-compose up -d postgres

db-stop: ## Stop Postgres
	docker-compose stop postgres

db-logs: ## Tail Postgres logs
	docker-compose logs -f postgres

db-studio: ## Open Prisma Studio
	pnpm db:studio

migrate: ## Run migrations (production)
	pnpm db:migrate

migrate-dev: ## Create and run migration (development)
	pnpm --filter @prompttrack/api db:migrate:dev

push: ## Push schema to db (no migration)
	pnpm db:push

db-dump: ## Backup database to iCloud
	@mkdir -p "$(BACKUP_DIR)"
	docker-compose exec -T postgres pg_dump -U prompttrack prompttrack > "$(DUMP_FILE)"
	@echo "$(CYAN)Dumped to:$(RESET) $(DUMP_FILE)"
	@ls -lh "$(DUMP_FILE)"

db-restore: ## Restore from latest backup (or DUMP=path)
	$(eval RESTORE_FILE := $(or $(DUMP),$(shell ls -t "$(BACKUP_DIR)"/*.sql 2>/dev/null | head -1)))
	@if [ -z "$(RESTORE_FILE)" ]; then echo "No backup found. Specify with DUMP=path"; exit 1; fi
	@echo "$(CYAN)Restoring from:$(RESET) $(RESTORE_FILE)"
	docker-compose exec -T postgres psql -U prompttrack -d prompttrack -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	docker-compose exec -T postgres psql -U prompttrack prompttrack < "$(RESTORE_FILE)"
	@echo "$(CYAN)Restore complete$(RESET)"

db-reset: ## Wipe database (keeps node_modules)
	docker-compose down -v
	docker-compose up -d postgres
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	pnpm --filter @prompttrack/api db:migrate:dev
	@echo "$(CYAN)Database reset complete$(RESET)"

##@ Testing

## Test DB URL — only needed by prisma CLI (vitest reads .env.test directly)
TEST_DB_URL := postgresql://prompttrack:prompttrack_test@localhost:5453/prompttrack_test

test: ## Run all tests (unit + integration)
	pnpm test
	docker-compose up -d postgres-test
	@echo "Waiting for test Postgres to be ready..."
	@until docker-compose exec -T postgres-test pg_isready -U prompttrack -d prompttrack_test > /dev/null 2>&1; do sleep 1; done
	DATABASE_URL="$(TEST_DB_URL)" pnpm --filter @prompttrack/api exec prisma migrate deploy
	pnpm --filter @prompttrack/api test:integration; \
	  EXIT=$$?; docker-compose stop postgres-test; exit $$EXIT

test-unit: ## Run unit tests only
	pnpm test:unit

test-integration: ## Run integration tests against a dedicated ephemeral test DB
	docker-compose up -d postgres-test
	@echo "Waiting for test Postgres to be ready..."
	@until docker-compose exec -T postgres-test pg_isready -U prompttrack -d prompttrack_test > /dev/null 2>&1; do sleep 1; done
	DATABASE_URL="$(TEST_DB_URL)" pnpm --filter @prompttrack/api exec prisma migrate deploy
	pnpm --filter @prompttrack/api test:integration; \
	  EXIT=$$?; docker-compose stop postgres-test; exit $$EXIT

test-e2e: ## Run e2e tests
	pnpm test:e2e

test-coverage: ## Run all tests (unit + integration) with combined coverage report
	docker-compose up -d postgres-test
	@echo "Waiting for test Postgres to be ready..."
	@until docker-compose exec -T postgres-test pg_isready -U prompttrack -d prompttrack_test > /dev/null 2>&1; do sleep 1; done
	DATABASE_URL="$(TEST_DB_URL)" pnpm --filter @prompttrack/api exec prisma migrate deploy
	pnpm --filter @prompttrack/api test:coverage-all; \
	  EXIT=$$?; docker-compose stop postgres-test; exit $$EXIT

##@ Quality

check: ## Smoke test — typecheck + build (run before declaring work complete)
	pnpm typecheck
	pnpm build

lint: ## Run ESLint
	pnpm lint

lint-report: ## Generate ESLint JSON reports for Agent Insight (packages/api and packages/web)
	pnpm --filter @prompttrack/api exec eslint src --format json --output-file .eslint-report.json; true
	pnpm --filter @prompttrack/web exec eslint src --format json --output-file .eslint-report.json; true

lint-fix: ## Run ESLint with auto-fix
	pnpm lint:fix

typecheck: ## Run TypeScript type checking
	pnpm typecheck

format: ## Format code with Prettier
	pnpm format

format-check: ## Check code formatting
	pnpm format:check

##@ Build

build: ## Build all packages
	pnpm build

##@ Cleanup

stop: ## Stop all Docker services
	docker-compose down

clean: stop ## Stop services and remove volumes
	docker-compose down -v
	rm -rf node_modules packages/*/node_modules
	rm -rf packages/*/dist packages/web/dist

reset: clean ## Full reset (clean + reinstall)
	pnpm install
	pnpm db:generate

##@ Setup

install: ## Install dependencies
	pnpm install

setup: install db ## First-time setup
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	pnpm db:generate
	pnpm --filter @prompttrack/api db:migrate:dev --name init
	@echo "\n$(CYAN)Setup complete!$(RESET) Run 'make dev' to start."

##@ Help

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make $(CYAN)<target>$(RESET)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n%s\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
