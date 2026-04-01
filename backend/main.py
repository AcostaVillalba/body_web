from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
from datetime import datetime
import os
from google.cloud import bigquery
from google.oauth2 import service_account

app = FastAPI(title="BodyByJA Internal Server")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de BigQuery
PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"
TABLE_ID = "client_plans"
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "secrets", "credentials.json")

# Inicializar cliente de BigQuery
def get_bigquery_client():
    if os.path.exists(CREDENTIALS_PATH):
        credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
        return bigquery.Client(credentials=credentials, project=PROJECT_ID)
    return None

def setup_bigquery():
    client = get_bigquery_client()
    if not client:
        print("Aviso: No se encontraron credenciales en backend/secrets/credentials.json. BigQuery desactivado.")
        return

    dataset_ref = bigquery.DatasetReference(PROJECT_ID, DATASET_ID)
    try:
        client.get_dataset(dataset_ref)
    except Exception:
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "US"
        client.create_dataset(dataset)
        print(f"Dataset {DATASET_ID} creado.")

    table_ref = dataset_ref.table(TABLE_ID)
    try:
        client.get_table(table_ref)
    except Exception:
        schema = [
            bigquery.SchemaField("name", "STRING"),
            bigquery.SchemaField("id", "STRING"),
            bigquery.SchemaField("goal", "STRING"),
            bigquery.SchemaField("weight", "STRING"),
            bigquery.SchemaField("planType", "STRING"),
            bigquery.SchemaField("startDate", "STRING"),
            bigquery.SchemaField("controlDate", "STRING"),
            bigquery.SchemaField("timestamp", "TIMESTAMP"),
        ]
        table = bigquery.Table(table_ref, schema=schema)
        client.create_table(table)
        print(f"Tabla {TABLE_ID} creada.")
    
    # Verificar si falta la columna planType en la tabla existente
    table = client.get_table(table_ref)
    existing_columns = [field.name for field in table.schema]
    if "planType" not in existing_columns:
        print("Actualizando esquema de la tabla para incluir 'planType'...")
        new_schema = list(table.schema)
        new_schema.append(bigquery.SchemaField("planType", "STRING"))
        table.schema = new_schema
        client.update_table(table, ["schema"])
        print("Esquema actualizado con éxito para planType.")

    if "startDate" not in existing_columns:
        print("Actualizando esquema de la tabla para incluir 'startDate'...")
        new_schema = list(table.schema)
        new_schema.append(bigquery.SchemaField("startDate", "STRING"))
        table.schema = new_schema
        client.update_table(table, ["schema"])
        print("Esquema actualizado con éxito para startDate.")

    if "controlDate" not in existing_columns:
        print("Actualizando esquema de la tabla para incluir 'controlDate'...")
        new_schema = list(table.schema)
        new_schema.append(bigquery.SchemaField("controlDate", "STRING"))
        table.schema = new_schema
        client.update_table(table, ["schema"])
        print("Esquema actualizado con éxito para controlDate.")

# Ejecutar setup al iniciar
@app.on_event("startup")
async def startup_event():
    setup_bigquery()

class ClientData(BaseModel):
    name: str = ""
    id: str = ""
    goal: str = ""
    weight: str = ""
    planType: str = "Mensual"
    startDate: str = ""
    controlDate: str = ""

FILE_PATH = "clients_data.jsonl"

def write_to_file(data: dict):
    try:
        with open(FILE_PATH, "a", encoding="utf-8") as f:
            data["timestamp"] = datetime.now().isoformat()
            f.write(json.dumps(data, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"Error escribiendo localmente: {e}")

def write_to_bigquery(data: dict):
    client = get_bigquery_client()
    if not client:
        return

    table_id = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    data["timestamp"] = datetime.now().isoformat()
    
    errors = client.insert_rows_json(table_id, [data])
    if errors:
        print(f"Error insertando en BigQuery: {errors}")
    else:
        print("Datos insertados en BigQuery correctamente.")

@app.post("/api/save-client")
async def save_client(info: ClientData, background_tasks: BackgroundTasks):
    try:
        client_dict = info.model_dump()
        # Backup local
        background_tasks.add_task(write_to_file, client_dict.copy())
        # Subida a BigQuery
        background_tasks.add_task(write_to_bigquery, client_dict.copy())
        
        return {"status": "success", "message": "Atleta registrado"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
def read_root():
    return {"message": "BodyByJA API con soporte de BigQuery"}
