# Onboarding: Entwickeln mit Claude Code

Dieses Dokument fasst zusammen, was wir im Workshop besprochen haben, und führt dich
Schritt für Schritt von einem leeren Rechner bis zur laufenden App. Die technischen
Details zum Projekt selbst stehen im [README](README.md).

**Das Ziel:** Du entwickelst Software lokal auf deinem Rechner, mit Claude Code als
Coding-Agent. Du musst dafür kein Entwickler sein — aber du brauchst eine
funktionierende Umgebung und ein paar Grundprinzipien.

---

## 1. Rechner einrichten (einmalig)

Die Anleitung gilt für macOS. Tipp: Installiere **Claude Code zuerst** — danach kann
dich Claude durch die restlichen Schritte führen, wenn etwas hakt. Sag einfach:
*„Hilf mir, die Voraussetzungen aus ONBOARDING.md zu installieren, und prüfe danach,
ob alles funktioniert."*

Alle Befehle kommen ins **Terminal** (über Spotlight: `⌘ + Leertaste`, „Terminal" tippen).

### 1.1 Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Danach `claude` eingeben und der Anmeldung im Browser folgen.
**Prüfen:** `claude --version`

### 1.2 Homebrew (Paketmanager für macOS)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Installiert nebenbei auch die Apple Command Line Tools (inkl. `git`). Am Ende der
Installation zeigt Homebrew zwei „Next steps"-Befehle an — diese ausführen!
**Prüfen:** `brew --version` und `git --version`

### 1.3 Node.js, just, Docker

```bash
brew install node just
brew install --cask docker
```

Danach **Docker Desktop einmal aus dem Programme-Ordner starten** (Wal-Symbol in der
Menüleiste). Docker muss laufen, damit die Datenbank startet.
**Prüfen:** `node --version` (≥ 18.11), `just --version`, `docker --version`

### 1.4 Git konfigurieren

```bash
git config --global user.name "Vorname Nachname"
git config --global user.email "deine@firmen-mail.de"
```

---

## 2. Projekt starten

```bash
git clone <repo-url>
cd <repo-ordner>
just setup    # Dependencies installieren, .env anlegen, Datenbank starten
just dev      # Datenbank + Backend + Frontend starten
```

Dann http://localhost:5173 öffnen und mit dem Teilnehmer-Key `TN-DEVKEY` einloggen
(wird durch das Dev-Seeding automatisch angelegt). Details und weitere Befehle: siehe
[README](README.md). In `backend/.env` müssen noch `ADMIN_PASSWORD` und
`ANTHROPIC_API_KEY` eingetragen werden.

**Das ist deine „One-Click"-Validierung:** `just dev`, Browser auf, anschauen.
Wenn das nicht in unter einer Minute geht, ist das ein Problem, das zuerst gelöst
werden muss — frag Claude.

---

## 3. Grundprinzipien

### Git ist das Fundament

- **Nachvollziehbarkeit ist das primäre Ziel.** Jede Änderung ist ein Commit mit
  einer Beschreibung. Claude Code liest die Git-History und versteht dadurch, was
  zuletzt passiert ist und warum.
- **Jeder Commit muss „funktionieren".** Erst prüfen (App läuft, Änderung tut was
  sie soll), dann committen. So ist jeder Commit ein sicherer Stand, zu dem du
  jederzeit zurück kannst.
- Wenn etwas schiefläuft: nicht weiterwursteln. Sag Claude *„Setz alle Änderungen
  seit dem letzten Commit zurück"* und starte den Schritt neu.

### Wissensverteilung: Wer weiß was?

- **Das LLM hat immens mehr technisches Wissen als du** — Programmiersprachen,
  Frameworks, Fehlermeldungen, Best Practices.
- **NUR du hast das Wissen über den relevanten Kontext** — was die Anwendung
  fachlich tun soll, wer sie nutzt, was „richtig" bedeutet.
- **Beide Vorteile kombiniert man durch Fragen — in beide Richtungen:**
  - Du fragst Claude: *„Erklär mir, wie X funktioniert"*, *„Welche Optionen gibt
    es, was empfiehlst du?"* So wird das High-Level-Verständnis des LLM für dich
    kontrollierbar, ohne dass du den Code selbst lesen musst.
  - Claude fragt dich: Beschreibe das **Ziel** und den fachlichen Kontext, nicht
    die technische Lösung. Bitte Claude aktiv um Rückfragen: *„Stell mir
    Verständnisfragen, bevor du anfängst."* So beschränkst du das LLM nicht in
    der Lösungsfindung.

### Schnelle Validierung ist die Voraussetzung für alles

Du kannst Claudes Arbeit nur steuern, wenn du das Ergebnis sofort sehen kannst.
Deshalb existiert die One-Click-Umgebung (`just dev`). Nach jeder Änderung: im
Browser anschauen, bevor es weitergeht.

### Automatisierte Tests sind die Selbstkontrolle des Agenten

Tests sind nicht (nur) für Menschen — sie geben dem Coding-Agent ein Werkzeug, um
seine eigene Arbeit zu prüfen, ohne dass du jedes Mal manuell klicken musst.
Gewöhn dir die Standardanforderung an: *„Schreib einen Test, der dieses Verhalten
absichert, und führe alle Tests aus."* (In diesem Projekt gibt es noch keine Tests —
das aufzubauen ist eine gute Aufgabe für die nächsten Schritte.)

---

## 4. Arbeitsablauf für jede Änderung

1. **Klein anfangen.** Eine Aufgabe = eine überschaubare Änderung. Nicht „bau mir
   Feature X komplett", sondern der erste sinnvolle Schritt davon.
2. **Erst planen, dann bauen.** Im Plan-Modus (`Shift+Tab` in Claude Code) erklärt
   Claude erst sein Vorgehen, bevor Code geändert wird. Lies den Plan, stell Fragen,
   korrigiere den Kontext.
3. **Validieren.** App läuft? Änderung tut, was sie soll? Tests grün?
4. **Committen.** Sag Claude: *„Erstelle einen Commit."*
5. **Wiederholen.**

---

## 5. Deine erste Aufgabe

Im README steht unter „Bekannte Probleme" ein echter Bug: `backend/src/routes/ai.js`
sendet beim Anthropic-API-Aufruf keinen `x-api-key`-Header, deshalb schlägt die
KI-Analyse fehl. Das ist eine ideale erste Übung für den Arbeitsablauf oben:

> „Im README steht unter Bekannte Probleme, dass die KI-Analyse wegen eines
> fehlenden Headers fehlschlägt. Erklär mir erst das Problem, dann behebe es."

Danach validieren (Kärtchen anlegen, Analyse auslösen) und committen — und das
README um den erledigten Punkt kürzen.
