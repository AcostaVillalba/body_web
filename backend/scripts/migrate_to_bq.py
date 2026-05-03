import sqlite3
import os
from google.cloud import bigquery
from google.oauth2 import service_account

# Configuración
PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "bodybyja.db")
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "..", "secrets", "credentials.json")

def get_bq_client():
    if os.path.exists(CREDENTIALS_PATH):
        credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
        return bigquery.Client(credentials=credentials, project=PROJECT_ID)
    return bigquery.Client(project=PROJECT_ID)

def migrate_data(client):
    if not os.path.exists(DB_PATH):
        print("No se encontró bodybyja.db local para migrar.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    tables = ["users", "client_profiles", "routines", "weight_history", "notifications", "payments"]

    for table_name in tables:
        print(f"Migrando tabla {table_name}...")
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()
        
        # Obtener nombres de columnas
        cursor.execute(f"PRAGMA table_info({table_name})")
        cols = [c[1] for c in cursor.fetchall()]
        
        json_rows = []
        for row in rows:
            data = dict(zip(cols, row))
            
            # Conversión de booleanos (SQLite 0/1 -> BQ True/False)
            if table_name == "users" and "is_active" in data:
                data["is_active"] = bool(data["is_active"])
            if table_name == "notifications" and "is_read" in data:
                data["is_read"] = bool(data["is_read"])
            
            json_rows.append(data)

        if not json_rows:
            print(f"Tabla {table_name} está vacía en SQLite. Saltando...")
            continue

        table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
        
        # Usamos un Load Job con WRITE_TRUNCATE para limpiar y escribir de una sola vez
        job_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
            autodetect=True # Dejamos que BQ detecte el esquema basado en las tablas existentes
        )

        job = client.load_table_from_json(json_rows, table_id, job_config=job_config)
        job.result() # Esperar a que termine
        
        print(f"¡Éxito! Migrados {len(json_rows)} registros a {table_name} (Tabla sobrescrita).")

    conn.close()

if __name__ == "__main__":
    client = get_bq_client()
    print("Iniciando migración masiva a BigQuery...")
    migrate_data(client)
    print("\nProceso finalizado correctamente.")
