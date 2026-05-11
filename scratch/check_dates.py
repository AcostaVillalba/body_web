from google.cloud import bigquery
import os

PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"

def check_paid_dates():
    client = bigquery.Client(project=PROJECT_ID)
    sql = f"""
        SELECT id, client_name, status, created_at, paid_at, batch_id
        FROM `{PROJECT_ID}.{DATASET_ID}.payments`
        WHERE status = 'Paid'
        ORDER BY created_at DESC
        LIMIT 10
    """
    query_job = client.query(sql)
    print("ID | Name | Created At | Paid At | Batch ID")
    for row in query_job:
        print(f"{row.id} | {row.client_name} | {row.created_at} | {row.paid_at} | {row.batch_id}")

if __name__ == "__main__":
    check_paid_dates()
