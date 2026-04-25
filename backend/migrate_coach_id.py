import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "bodybyja.db")

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN coach_id INTEGER REFERENCES users(id)")
        print("Columna coach_id añadida exitosamente.")
    except sqlite3.OperationalError as e:
        print(f"Nota: {e} (Probablemente la columna ya existe)")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
