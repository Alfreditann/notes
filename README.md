Notes & Todo App

En enkel notat- og todo-app med:

Backend: Python (Flask) + SQLite
Frontend: Node.js (Express) + EJS

Krav
Python 3.10+
Node.js 18+
npm

Installering og kjøring

1. Backend (Python/Flask)
Opprett virtuelt miljø og aktiver det:
```bash
python -m venv venv
```
```bash
source venv/bin/activate  
```
Installer Flask og CORS:
```bash
pip install -r requirements.txt
```

Start backend:
```bash
python3 app.py
```
Kjører på http://localhost:5000

2. Frontend (Node/Express)
Installer nødvendige pakker:
```bash
npm install express ejs path axios
```
Start frontend:
``````bash
node server.js
```
Kjører på http://localhost:3000
