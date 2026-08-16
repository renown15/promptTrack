#!/bin/sh
# Waits for Docker Desktop to be ready, then starts the prod stack.
# Called by the LaunchAgent on login — docker restart:always handles the rest.
until /usr/local/bin/docker info >/dev/null 2>&1; do
    sleep 5
done
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)" || exit 1
/usr/local/bin/docker compose -f docker-compose.prod.yml up -d
