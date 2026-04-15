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

def clean_text(value):
    return value.strip() if isinstance(value, str) else ""

def validate_username(username):
    username = clean_text(username)
    if len(username) < 3:
        return None, "Username must be at least 3 characters"
    if len(username) > 30:
        return None, "Username must be 30 characters or fewer"
    return username, None

def validate_password(password):
    password = clean_text(password)
    if len(password) < 6:
        return None, "Password must be at least 6 characters"
    if len(password) > 128:
        return None, "Password must be 128 characters or fewer"
    return password, None

def validate_note(title, content):
    title = clean_text(title)
    content = clean_text(content)
    if not title or not content:
        return None, None, "Missing fields"
    if len(title) > 120:
        return None, None, "Note title must be 120 characters or fewer"
    if len(content) > 1000:
        return None, None, "Note content must be 1000 characters or fewer"
    return title, content, None

def validate_todo(title, tasks):
    title = clean_text(title)
    if not title or not isinstance(tasks, list):
        return None, None, "Invalid todo"
    if len(title) > 120:
        return None, None, "Todo title must be 120 characters or fewer"

    cleaned_tasks = []
    for task in tasks:
        text = clean_text(task.get("text")) if isinstance(task, dict) else ""
        if not text:
            continue
        if len(text) > 120:
            return None, None, "Each task must be 120 characters or fewer"
        cleaned_tasks.append({"text": text, "completed": int(task.get("completed", 0)) if isinstance(task, dict) else 0})

    if not cleaned_tasks:
        return None, None, "Add at least one task"

    return title, cleaned_tasks, None

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
    username, error = validate_username(d.get("username"))
    if error:
        return {"error": error}, 400

    password, error = validate_password(d.get("password"))
    if error:
        return {"error": error}, 400

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
    username = clean_text(d.get("username"))
    password = clean_text(d.get("password"))

    if not username or not password:
        return {"error": "Missing fields"}, 400

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
    title, content, error = validate_note(d.get("title"), d.get("content"))
    if error:
        return {"error": error}, 400
    c = get_db().cursor()
    c.execute("INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)", (user_id, title, content))
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
    title = clean_text(d.get("title", n["title"]))
    content = clean_text(d.get("content", n["content"]))
    if not title or not content:
        return {"error": "Missing fields"}, 400
    if len(title) > 120:
        return {"error": "Note title must be 120 characters or fewer"}, 400
    if len(content) > 1000:
        return {"error": "Note content must be 1000 characters or fewer"}, 400
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
    title, tasks, error = validate_todo(d.get("title"), d.get("tasks"))
    if error:
        return {"error": error}, 400
    c = get_db().cursor()
    c.execute("INSERT INTO todos (user_id, title) VALUES (?, ?)", (user_id, title))
    tid = c.lastrowid
    for t in tasks:
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

@app.route("/api/tasks/<int:id>", methods=["DELETE"])
@require_api_key
def delete_task(id):
    c = get_db().cursor()
    c.execute("DELETE FROM tasks WHERE id=?", (id,))
    c.connection.commit()
    c.connection.close()
    return {"message": "Task deleted"}

@app.route("/api/todos/<int:todo_id>/tasks", methods=["POST"])
@require_api_key
def add_task_to_todo(todo_id):
    d = request.json
    text = clean_text(d.get("text", ""))
    if not text:
        return {"error": "Task text is required"}, 400
    if len(text) > 120:
        return {"error": "Task must be 120 characters or fewer"}, 400
    c = get_db().cursor()
    c.execute("INSERT INTO tasks (todo_id, text, completed) VALUES (?, ?, ?)", (todo_id, text, 0))
    c.connection.commit()
    c.connection.close()
    return {"message": "Task added"}

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)