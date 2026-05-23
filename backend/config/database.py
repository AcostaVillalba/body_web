import os
from google.cloud import bigquery
from google.oauth2 import service_account

PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"

# The credentials folder is in backend/secrets/
# Since this file is in backend/config/database.py, we need to go up one level.
CREDENTIALS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "secrets", "credentials.json"
)

def get_bigquery_client():
    if os.path.exists(CREDENTIALS_PATH):
        credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
        return bigquery.Client(credentials=credentials, project=PROJECT_ID)
    else:
        return bigquery.Client(project=PROJECT_ID)

client = get_bigquery_client()
