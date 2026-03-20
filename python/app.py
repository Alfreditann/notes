import sqlite3

conn = sqlite3.connect('users.db')

conn.execute("""CREATE TABLE IF NOT EXISTS users(
    id INT PRIMARY KEY,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    bruker_id INT NOT NULL 
)""")
conn.execute("""CREATE TABLE IF NOT EXISTS notes(
    id INT PRIMARY KEY,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    bruker_id INT NOT NULL,

    FOREIGN KEY (bruker_id) REFERENCES users (bruker_id) ON DELETE CASCADE ON UPDATE CASCADE


)""")

conn.commit()