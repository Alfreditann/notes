from flask import Flask, request, jsonify
import sqlite3
import os
from pathlib import Path
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

ROOT_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ROOT_ENV_PATH)

DB = os.getenv("DB_PATH", "notes.db")
API_KEY = os.getenv("API_KEY")

if not API_KEY:
    raise RuntimeError("Missing required env var: API_KEY")

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    c = get_db().cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,title TEXT NOT NULL,content TEXT NOT NULL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER,title TEXT NOT NULL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, todo_id INTEGER, text TEXT, completed INTEGER DEFAULT 0, FOREIGN KEY(todo_id) REFERENCES todos(id))""")
    c.execute("""CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL)""")
    c.connection.commit()
    c.connection.close()

init_db()

def require_api_key(f):
    def wrapper(*args, **kwargs):
        if request.headers.get("x-api-key") != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

@app.route("/api/register", methods=["POST"])
def register():
    d = request.json
    username = d.get("username")
    password = d.get("password")

    if not username or not password:
        return {"error": "Missing fields"}, 400

    hashed = generate_password_hash(password)

    c = get_db().cursor()
    try:
        c.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed))
        c.connection.commit()
    except:
        return {"error": "User exists"}, 400

    return {"message": "User created"}

@app.route("/api/login", methods=["POST"])
def login():
    d = request.json
    username = d.get("username")
    password = d.get("password")

    c = get_db().cursor()
    user = c.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()

    if not user or not check_password_hash(user["password"], password):
        return {"error": "Invalid credentials"}, 401

    return {"message": "Login success", "user_id": user["id"]}

@app.route("/api/data", methods=["GET"])
@require_api_key
def get_data():
    user_id = request.headers.get("user-id")
    conn = get_db()
    c = conn.cursor()
    notes = [dict(n) for n in c.execute("SELECT * FROM notes WHERE user_id=?", (user_id,)).fetchall()]
    todos = []
    for t in c.execute("SELECT * FROM todos WHERE user_id=?", (user_id,)).fetchall():
        tasks = [dict(tsk) for tsk in c.execute("SELECT * FROM tasks WHERE todo_id=?", (t["id"],)).fetchall()]
        todos.append({"id": t["id"], "title": t["title"], "tasks": tasks})
    conn.close()
    return jsonify({"notes": notes, "todos": todos})

@app.route("/api/notes", methods=["POST"])
@require_api_key
def add_note():
    user_id = request.headers.get("user-id")
    d = request.json
    if not d.get("title") or not d.get("content"):
        return {"error": "Missing fields"}, 400
    c = get_db().cursor()
    c.execute("INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)", (user_id, d["title"], d["content"]))
    c.connection.commit()
    c.connection.close()
    return {"message": "Note added"}

@app.route("/api/notes/<int:id>", methods=["PATCH"])
@require_api_key
def edit_note(id):
    d = request.json
    c = get_db().cursor()
    n = c.execute("SELECT * FROM notes WHERE id=?", (id,)).fetchone()
    if not n:
        return {"error": "Note not found"}, 404
    title = d.get("title", n["title"])
    content = d.get("content", n["content"])
    c.execute("UPDATE notes SET title=?, content=? WHERE id=?", (title, content, id))
    c.connection.commit()
    c.connection.close()
    return {"message": "Note updated"}

@app.route("/api/notes/<int:id>", methods=["DELETE"])
@require_api_key
def delete_note(id):
    c = get_db().cursor()
    c.execute("DELETE FROM notes WHERE id=?", (id,))
    c.connection.commit()
    c.connection.close()
    return {"message": "Note deleted"}

@app.route("/api/todos", methods=["POST"])
@require_api_key
def add_todo():
    user_id = request.headers.get("user-id")
    d = request.json
    if not d.get("title") or not isinstance(d.get("tasks"), list):
        return {"error": "Invalid todo"}, 400
    c = get_db().cursor()
    c.execute("INSERT INTO todos (user_id, title) VALUES (?, ?)", (user_id, d["title"]))
    tid = c.lastrowid
    for t in d["tasks"]:
        c.execute("INSERT INTO tasks (todo_id, text, completed) VALUES (?, ?, ?)", (tid, t.get("text"), int(t.get("completed", 0))))
    c.connection.commit()
    c.connection.close()
    return {"message": "Todo added"}

@app.route("/api/tasks/<int:id>", methods=["PATCH"])
@require_api_key
def patch_task(id):
    d = request.json
    c = get_db().cursor()
    t = c.execute("SELECT * FROM tasks WHERE id=?", (id,)).fetchone()
    if not t:
        return {"error": "Task not found"}, 404
    if d.get("toggle"):
        c.execute("UPDATE tasks SET completed=? WHERE id=?", (0 if t["completed"] else 1, id))
    if d.get("text"):
        c.execute("UPDATE tasks SET text=? WHERE id=?", (d["text"], id))
    c.connection.commit()
    c.connection.close()
    return {"message": "Task updated"}

@app.route("/api/todos/<int:id>", methods=["DELETE"])
@require_api_key
def delete_todo(id):
    c = get_db().cursor()
    c.execute("DELETE FROM tasks WHERE todo_id=?", (id,))
    c.execute("DELETE FROM todos WHERE id=?", (id,))
    c.connection.commit()
    c.connection.close()
    return {"message": "Todo deleted"}

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)