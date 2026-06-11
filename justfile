# Leistungsmatrix — `just --list` zeigt alle Rezepte

# Liste aller Rezepte anzeigen
default:
    @just --list

# Erstes Setup: Dependencies, .env, Datenbank
setup: install env db-up

# Datenbank, Backend und Frontend zusammen starten
dev: db-up env
    npx -y concurrently -n api,web -c blue,green "just backend" "just frontend"

# Nur Backend (Express, Port 3001)
backend:
    cd backend && npm run dev

# Nur Frontend (Vite, Port 5173)
frontend:
    cd frontend && npm run dev

# Dependencies für beide Apps installieren
install:
    cd backend && npm install
    cd frontend && npm install

# backend/.env aus Vorlage anlegen, falls nicht vorhanden
env:
    @test -f backend/.env || (cp backend/.env.example backend/.env && echo "backend/.env angelegt — ANTHROPIC_API_KEY und ADMIN_PASSWORD eintragen")

# Postgres-Container starten (wartet bis healthy)
db-up:
    docker compose up -d --wait db

# Postgres-Container stoppen
db-down:
    docker compose down

# Datenbank komplett zurücksetzen (löscht alle Daten!)
db-reset:
    docker compose down -v
    just db-up

# psql-Shell in der Datenbank öffnen
psql:
    docker compose exec db psql -U lm leistungsmatrix
