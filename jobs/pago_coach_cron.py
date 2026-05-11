import logging
from datetime import datetime
import pytz
from google.cloud import bigquery

# Configuración de Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuración BigQuery
PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"

def get_bq_client():
    """
    Inicializa el cliente de BigQuery.
    En un entorno de Google Cloud (como Cloud Run o GKE), se usan las credenciales por defecto.
    """
    return bigquery.Client(project=PROJECT_ID)

def deactivate_coaches(client):
    """Identifica y desactiva coaches/clientes con pagos pendientes."""
    query_pending = f"SELECT DISTINCT coach_id FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE status = 'Pending'"
    pending_rows = client.query(query_pending).result()
    pending_coaches = [row.coach_id for row in pending_rows]
    
    if pending_coaches:
        coach_ids_str = ", ".join(map(str, pending_coaches))
        client.query(f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET is_active = False WHERE id IN ({coach_ids_str}) AND role = 'Coach'").result()
        client.query(f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET is_active = False WHERE id IN (SELECT DISTINCT client_id FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE status = 'Pending' AND coach_id IN ({coach_ids_str})) AND role = 'Client'").result()
        logger.info(f"Coaches {pending_coaches} y sus clientes pendientes han sido DESACTIVADOS.")

def reactivate_coaches(client):
    """Identifica y reactiva coaches que ya no tienen deudas."""
    query_to_reactivate = f"""
        SELECT id FROM `{PROJECT_ID}.{DATASET_ID}.users`
        WHERE role = 'Coach' AND is_active = False
        AND id NOT IN (SELECT DISTINCT coach_id FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE status = 'Pending')
    """
    reactivate_rows = client.query(query_to_reactivate).result()
    coaches_to_reactivate = [row.id for row in reactivate_rows]

    if coaches_to_reactivate:
        reactivate_ids_str = ", ".join(map(str, coaches_to_reactivate))
        client.query(f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET is_active = True WHERE id IN ({reactivate_ids_str})").result()
        client.query(f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET is_active = True WHERE coach_id IN ({reactivate_ids_str}) AND role = 'Client' AND id NOT IN (SELECT DISTINCT client_id FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE status = 'Pending')").result()
        logger.info(f"Coaches {coaches_to_reactivate} y sus clientes han sido REACTIVADOS.")

def main():
    logger.info("Iniciando Job de verificación de pagos.")
    client = get_bq_client()
    tz = pytz.timezone('America/Bogota')
    now = datetime.now(tz)
    
    # 1. SIEMPRE Reactivar (Para que si pagan un lunes, se activen rápido)
    reactivate_coaches(client)
    
    # 2. Solo Desactivar los Domingos después de las 7 PM
    # weekday() == 6 es Domingo
    if now.weekday() == 6 and now.hour >= 19:
        logger.info("Es ventana de desactivación (Domingo > 7PM). Procesando bloqueos...")
        deactivate_coaches(client)
    else:
        logger.info("Fuera de ventana de desactivación. Solo se procesaron reactivaciones.")

if __name__ == "__main__":
    main()
