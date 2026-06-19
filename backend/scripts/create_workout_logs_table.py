import os
import sys

# Add parent directory to path to import database config
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from google.cloud import bigquery
from config.database import client, PROJECT_ID, DATASET_ID

table_id = f"{PROJECT_ID}.{DATASET_ID}.workout_logs"

schema = [
    bigquery.SchemaField("id", "INTEGER", mode="REQUIRED"),
    bigquery.SchemaField("user_id", "INTEGER", mode="REQUIRED"),
    bigquery.SchemaField("completed_at", "TIMESTAMP", mode="REQUIRED"),
    bigquery.SchemaField("day_name", "STRING", mode="REQUIRED"),
    bigquery.SchemaField("stars", "INTEGER", mode="REQUIRED"),
]

table = bigquery.Table(table_id, schema=schema)
try:
    client.get_table(table_id)
    print("Table workout_logs already exists.")
except Exception:
    # Create the table
    client.create_table(table)
    print("Table workout_logs created successfully in BigQuery.")
