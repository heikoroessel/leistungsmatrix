# Leistungsmatrix

Workshop-Tool für die Leistungsmatrix-Methode nach Rössel (2011): Teilnehmer sammeln
Tätigkeits-Kärtchen, eine KI extrahiert daraus Verb/Objekt-Paare und Dimensionen
(Werkstatt / Shop / Meta), aus der entstehenden Matrix werden Produkte definiert.

**Stack:** React 18 + Vite (`frontend/`) · Express + PostgreSQL (`backend/`) · Anthropic API

## Voraussetzungen

- Node.js ≥ 18.11
- Docker (für die Datenbank)
- [just](https://github.com/casey/just): `brew install just`

## Getting Started

```bash
just setup    # npm install, backend/.env anlegen, Postgres-Container starten
just dev      # Datenbank + Backend (Port 3001) + Frontend (Port 5173)
```

Danach http://localhost:5173 öffnen. In `backend/.env` noch `ADMIN_PASSWORD` und
`ANTHROPIC_API_KEY` setzen — alle Variablen sind in `backend/.env.example` dokumentiert.

Zum Einloggen wird ein Teilnehmer-Key benötigt. Erstes Projekt anlegen:

```bash
curl -X POST http://localhost:3001/api/admin/projects \
  -H 'Content-Type: application/json' \
  -H 'x-admin-password: <ADMIN_PASSWORD aus backend/.env>' \
  -d '{"name":"Mein Projekt"}'
```

Die Antwort enthält den `tn_key` (Teilnehmer) und `an_key` (Anleiter) — den
`tn_key` auf der Startseite eingeben.

## Befehle

`just --list` zeigt alle Rezepte. Die wichtigsten:

| Befehl          | Wirkung                                        |
| --------------- | ---------------------------------------------- |
| `just dev`      | Alles starten (DB, Backend, Frontend)          |
| `just db-reset` | Datenbank zurücksetzen (löscht alle Daten!)    |
| `just psql`     | psql-Shell in der Datenbank                    |
| `just db-down`  | Postgres-Container stoppen                     |

Das DB-Schema (`backend/src/db/schema.sql`) wird beim Backend-Start automatisch
idempotent angewendet — Migrationen gibt es noch nicht.

## Bekannte Probleme

- `backend/src/routes/ai.js` sendet beim Anthropic-API-Aufruf noch keinen
  `x-api-key`-Header — die KI-Analyse schlägt daher aktuell immer fehl.
