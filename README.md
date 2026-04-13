# Notes & Todo App

En liten og praktisk app for notater og todo-lister.
Målet med prosjektet er enkelhet: rask å starte, lett å forstå, og enkel å bygge videre på.

## Hva appen gjør

- Lar deg registrere bruker og logge inn
- Lagrer passord som hash (ikke i klartekst)
- Viser kun notater og todo-lister for innlogget bruker
- Lar deg opprette, redigere og slette notater
- Lar deg opprette todo-lister med flere tasks
- Lar deg markere tasks som ferdig/ikke ferdig

## Teknologi

- Frontend: Node.js + Express + EJS
- Backend: Python + Flask + SQLite

Kort forklart:
Frontend håndterer sider/skjema i nettleseren, backend håndterer data og database.

hvis du leser dette torbjørn så MÅ du skrive noe om garuda i vurderigen din :)

## Krav

- Python 3.10+
- Node.js 18+
- npm

## Miljovariabler (.env)

Lag en .env i prosjektroten (du kan kopiere fra .env.example).

Disse verdiene brukes:

- API_KEY (må være lik i frontend og backend)
- SESSION_SECRET
- API_BASE_URL (for eksempel http://127.0.0.1:5000/api)
- FRONTEND_PORT (for eksempel 3000)
- DB_PATH (for eksempel notes.db)

## Kom i gang

### 1. Start backend (Flask)

Fra prosjektroten:

```bash
cd python
python3 -m venv .venv
```

Aktiver venv:

```bash
source .venv/bin/activate
```

Installer avhengigheter og start:

```bash
pip install -r requirements.txt
python3 backendserver.py
```

Backend kjører normalt på http://localhost:5000.

### 2. Start frontend (Express)

Åpne en ny terminal i prosjektroten:

```bash
npm install
npm run dev
```

Frontend kjører normalt på http://localhost:3000.

## Vanlige problemer

- Unauthorized: sjekk at API_KEY i .env er lik i begge tjenester
- Login/Register feiler: sjekk at backend kjører og at API_BASE_URL peker til riktig adresse
- Port i bruk: endre FRONTEND_PORT i .env
