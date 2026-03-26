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
python -m venv venv
source venv/bin/activate   
venv\Scripts\activate

Installer Flask og CORS:
pip install flask flask-cors

Start backend:
python python/app.py
Kjører på http://localhost:5000

2. Frontend (Node/Express)
Installer nødvendige pakker:
npm install express ejs

Start frontend:
node server.js
Kjører på http://localhost:3000