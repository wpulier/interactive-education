PYTHON   := /opt/homebrew/bin/python3.11
VENV     := services/lesson-generator/.venv
PIP      := $(VENV)/bin/pip
UVICORN  := $(VENV)/bin/uvicorn

# Config — override via env vars or command line
API_PORT ?= 8000
DATABASE_URL ?= postgresql://postgres:postgres@localhost:5432/lessons
ANTHROPIC_API_KEY ?= $(shell echo $$ANTHROPIC_API_KEY)
NEXT_PUBLIC_GENERATOR_API_URL ?= http://localhost:$(API_PORT)

# ── Aggregate targets ────────────────────────────────────────────────

.PHONY: dev stop install setup

## Start all services (Postgres + API + Frontend)
dev: _check-env _db-up _api-start _frontend-start
	@echo ""
	@echo "  ✓ All services running"
	@echo "    Frontend:  http://localhost:3000"
	@echo "    API:       http://localhost:$(API_PORT)"
	@echo "    Postgres:  localhost:5432"
	@echo ""

## Stop all services
stop: _frontend-stop _api-stop _db-down
	@echo "  ✓ All services stopped"

## Install all dependencies
install: _venv-setup _npm-install

## First-time setup: install deps + start everything
setup: install dev

# ── Postgres (Docker) ────────────────────────────────────────────────

.PHONY: _db-up _db-down db-shell

_db-up:
	@if ! docker ps --format '{{.Names}}' | grep -q '^lessons-postgres$$'; then \
		echo "  Starting Postgres..."; \
		docker run -d \
			--name lessons-postgres \
			-e POSTGRES_USER=postgres \
			-e POSTGRES_PASSWORD=postgres \
			-e POSTGRES_DB=lessons \
			-p 5432:5432 \
			postgres:16-alpine > /dev/null 2>&1 || \
		docker start lessons-postgres > /dev/null 2>&1; \
		echo "  Waiting for Postgres..."; \
		sleep 2; \
	else \
		echo "  Postgres already running"; \
	fi

_db-down:
	@echo "  Stopping Postgres..."
	@docker stop lessons-postgres > /dev/null 2>&1 || true

db-shell:
	docker exec -it lessons-postgres psql -U postgres -d lessons

# ── Python venv + API ────────────────────────────────────────────────

.PHONY: _venv-setup _api-start _api-stop api-logs

_venv-setup: $(VENV)/bin/activate

$(VENV)/bin/activate: services/lesson-generator/requirements.txt
	@echo "  Setting up Python venv..."
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --quiet --upgrade pip
	$(PIP) install --quiet -r services/lesson-generator/requirements.txt
	@touch $(VENV)/bin/activate

_api-start: _venv-setup
	@if lsof -i :$(API_PORT) -sTCP:LISTEN > /dev/null 2>&1; then \
		echo "  API already running on :$(API_PORT)"; \
	else \
		echo "  Starting API on :$(API_PORT)..."; \
		cd services/lesson-generator && \
			env ANTHROPIC_API_KEY="$(ANTHROPIC_API_KEY)" \
			    DATABASE_URL="$(DATABASE_URL)" \
			    PORT="$(API_PORT)" \
			../../$(UVICORN) main:app --host 0.0.0.0 --port $(API_PORT) \
				> ../../.api.log 2>&1 & \
		echo $$! > ../../.api.pid; \
		sleep 1; \
		if kill -0 $$(cat ../../.api.pid) 2>/dev/null; then \
			echo "  API started (pid $$(cat ../../.api.pid))"; \
		else \
			echo "  ✗ API failed to start. Check: make api-logs"; \
			exit 1; \
		fi \
	fi

_api-stop:
	@echo "  Stopping API..."
	@if [ -f .api.pid ]; then \
		kill $$(cat .api.pid) 2>/dev/null || true; \
		rm -f .api.pid; \
	fi
	@lsof -ti :$(API_PORT) -sTCP:LISTEN | xargs kill 2>/dev/null || true

api-logs:
	@tail -50 .api.log 2>/dev/null || echo "No API logs found"

# ── Next.js Frontend ─────────────────────────────────────────────────

.PHONY: _npm-install _frontend-start _frontend-stop frontend-logs

_npm-install:
	@echo "  Installing npm dependencies..."
	@npm install --silent

_frontend-start:
	@if lsof -i :3000 -sTCP:LISTEN > /dev/null 2>&1; then \
		echo "  Frontend already running on :3000"; \
	else \
		echo "  Starting Frontend on :3000..."; \
		rm -rf .next; \
		env -u PORT \
			NEXT_PUBLIC_GENERATOR_API_URL="$(NEXT_PUBLIC_GENERATOR_API_URL)" \
			npm run dev > .frontend.log 2>&1 & \
		echo $$! > .frontend.pid; \
		sleep 3; \
		echo "  Frontend started (pid $$(cat .frontend.pid))"; \
	fi

_frontend-stop:
	@echo "  Stopping Frontend..."
	@if [ -f .frontend.pid ]; then \
		kill $$(cat .frontend.pid) 2>/dev/null || true; \
		rm -f .frontend.pid; \
	fi
	@lsof -ti :3000 -sTCP:LISTEN | xargs kill 2>/dev/null || true

frontend-logs:
	@tail -50 .frontend.log 2>/dev/null || echo "No frontend logs found"

# ── Helpers ───────────────────────────────────────────────────────────

.PHONY: _check-env logs clean

_check-env:
	@if [ -z "$(ANTHROPIC_API_KEY)" ] || [ "$(ANTHROPIC_API_KEY)" = "sk-ant-api03-your-key-here" ]; then \
		echo ""; \
		echo "  ✗ ANTHROPIC_API_KEY is not set."; \
		echo "    Export it or add to .env:"; \
		echo "    export ANTHROPIC_API_KEY=sk-ant-..."; \
		echo ""; \
		exit 1; \
	fi

## Tail all logs
logs:
	@echo "=== API ===" && tail -20 .api.log 2>/dev/null; \
	echo "" && echo "=== Frontend ===" && tail -20 .frontend.log 2>/dev/null

## Clean up generated files
clean: stop
	rm -f .api.log .api.pid .frontend.log .frontend.pid
	rm -rf $(VENV)
