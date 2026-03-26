# Notes & Todo App

En enkel app for notater og todo-lister, bygget med:

- Backend: Python (Flask) + SQLite
- Frontend: Node.js (Express) + EJS

## Hvorfor prosjektet er bygget slik

### 1. To lag: frontend og backend
Jeg har delt løsningen i to deler for å skille ansvar:

- Flask-API i `python/backendserver.py` håndterer data, validering og database.
- Express i `serverfrontend.js` håndterer skjema, visning og brukerflyt i nettleseren.

Hvorfor: Det gjør koden enklere å forstå, teste og bytte ut senere. Frontend trenger bare å snakke med API-et, ikke databasen direkte.

### 2. SQLite i starten
Jeg bruker SQLite (`python/notes.db`) fordi det er raskt å komme i gang med og ikke krever ekstern database-server.

Hvorfor: For et lite prosjekt er dette nok, og det gjør det enklere å fokusere på funksjonalitet først.

### 3. API-nøkler mellom frontend og backend
Frontend sender `x-api-key` til API-et.

Hvorfor: Dette er en enkel måte å beskytte API-et på i en lærings/demo-app, slik at ikke alle kall blir godtatt uten videre.

### 4. EJS og server-rendering
Jeg bruker EJS-templates i stedet for et frontend-rammeverk.

Hvorfor: Mindre kompleksitet, raskere å bygge CRUD-flyt med HTML-skjema og redirects.

### 5. Enkle CRUD-endepunkter
Backend har tydelige ruter for notater, todo-lister og tasks (`GET`, `POST`, `PATCH`, `DELETE`).

Hvorfor: Gir en ryddig struktur som er lett å utvide senere, for eksempel med innlogging eller filtrering.

## Funksjoner

- Opprette, redigere og slette notater
- Opprette og slette todo-lister
- Legge til flere tasks per todo
- Toggle task-status (ferdig/ikke ferdig)

## Teknisk flyt

1. Bruker sender skjema i frontend.
2. Express mottar data og videresender til Flask-API med `axios`.
3. Flask validerer og skriver/leser i SQLite.
4. Frontend henter oppdatert data og renderer siden på nytt.

## Krav

- Python 3.10+
- Node.js 18+
- npm

## Installering og kjøring

### 1. Start backend (Flask)

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 backendserver.py
```

Kjører på `http://localhost:5000`.

### 2. Start frontend (Express)

I prosjektroten:

```bash
npm install
node serverfrontend.js
```

Kjører på `http://localhost:3000`.

## Begrensninger akkurat nå

- API-nøkkel er hardkodet i kode (ok for demo, bør flyttes til miljøvariabler i produksjon).
- Ingen autentisering per bruker.
- Ingen automatiske tester ennå.

## Neste steg

- Flytte konfigurasjon til `.env`
- Legge til innlogging og bruker-isolerte data
- Legge til tester for API-endepunkter
