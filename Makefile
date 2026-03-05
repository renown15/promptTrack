.PHONY: dev dev-api dev-web db db-stop db-logs db-studio db-dump db-restore db-reset migrate migrate-dev push test test-unit test-integration test-e2e lint typecheck build clean stop help

# Default target
.DEFAULT_GOAL := help

# Colors
CYAN := \033[36m
RESET := \033[0m

# Backup location (iCloud)
BACKUP_DIR := $(HOME)/Library/Mobile Documents/com~apple~CloudDocs/Backups/prompttrack
DUMP_FILE := $(BACKUP_DIR)/prompttrack-$(shell date +%Y%m%d-%H%M%S).sql

##@ Development

dev: db ## Start all services (db + api + web)
	@echo "Waiting for Postgres to be ready..."
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	@echo "Starting development servers..."
	pnpm dev

dev-api: db ## Start API only (with db)
	@until docker-compose exec -T postgres pg_isready -U prompttrack > /dev/null 2>&1; do sleep 1; done
	pnpm dev:api

dev-web: ## Start Web only (no db needed)
	pnpm dev:web

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

test: ## Run all tests
	pnpm test

test-unit: ## Run unit tests only
	pnpm test:unit

test-integration: db ## Run integration tests
	pnpm test:integration

test-e2e: ## Run e2e tests
	pnpm test:e2e

test-coverage: ## Run tests with coverage
	pnpm test:coverage

##@ Quality

check: ## Smoke test — typecheck + build (run before declaring work complete)
	pnpm typecheck
	pnpm build

lint: ## Run ESLint
	pnpm lint

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
