# Task Manager — Docker Compose DevOps Lab

## Services
- `frontend`: Nginx serves the UI on host port 8080 and proxies `/api` to the backend.
- `backend`: Node.js + Express REST API.
- `database`: PostgreSQL 16 with persistent named volume.
- `task-manager-network`: private bridge network for service-to-service traffic.

## Start
```bash
cp .env.example .env
# Edit .env and set a strong local DB_PASSWORD value.
docker compose config
docker compose up -d --build
docker compose ps
```
Open http://localhost:8080.

## Useful operations
```bash
docker compose logs -f
docker compose logs -f backend
docker compose exec database psql -U appuser -d taskmanager
docker compose down
docker compose down -v  # WARNING: deletes the PostgreSQL data volume
```

## API
- `GET /api/health`
- `GET /api/tasks`
- `POST /api/tasks` with `{"title":"Learn Docker"}`
- `PATCH /api/tasks/:id` with `{"completed":true}`
- `DELETE /api/tasks/:id`

## Notes
- The database is not published to a host port. Backend reaches it at `database:5432` on the Compose network.
- `depends_on` with `service_healthy` waits for database/backend health checks before starting dependants.
- The named volume preserves database data across container recreation. `docker compose down -v` removes it.
- This is a local learning environment, not a production-hardened deployment. Use a secrets manager, pinned image digests, resource limits, TLS and stronger operational controls before production.
