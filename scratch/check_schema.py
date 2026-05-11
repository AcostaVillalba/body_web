from google.cloud import bigquery
import os

PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"
CREDENTIALS_PATH = os.path.join(os.getcwd(), "backend", "secrets", "credentials.json")

def check_schema():
    client = bigquery.Client.from_service_account_json(CREDENTIALS_PATH)
    table_ref = client.dataset(DATASET_ID).table("payments")
    table = client.get_table(table_ref)
    print(f"Table {table.table_id} schema:")
    for field in table.schema:
        print(f" - {field.name}: {field.field_type}")

if __name__ == "__main__":
    check_schema()
