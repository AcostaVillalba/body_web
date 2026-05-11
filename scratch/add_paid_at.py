from google.cloud import bigquery
import os

PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"

def add_paid_at_column():
    client = bigquery.Client(project=PROJECT_ID)
    table_ref = client.dataset(DATASET_ID).table("payments")
    table = client.get_table(table_ref)
    
    # Check if column exists
    for field in table.schema:
        if field.name == 'paid_at':
            print("Column 'paid_at' already exists.")
            return

    new_schema = list(table.schema)
    new_schema.append(bigquery.SchemaField("paid_at", "TIMESTAMP"))
    table.schema = new_schema
    client.update_table(table, ["schema"])
    print("Column 'paid_at' added to payments table.")

if __name__ == "__main__":
    add_paid_at_column()
