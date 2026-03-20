import sqlite3

conn = sqlite3.connect('users.db')

conn.execute("""CREATE TABLE IF NOT EXISTS users(
    id INT,
    username TEXT
)""")

conn.commit()