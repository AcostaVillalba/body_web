from google.cloud import bigquery
from database_bq import get_bq_db, PROJECT_ID, DATASET_ID, now_bogota

def obtener_saldo_pendiente_coach(coach_id: int) -> int:
    """
    Obtiene la suma del saldo pendiente (en pesos) de todos los cobros en estado 'Pending'
    para el coach_id.
    """
    db = get_bq_db()
    sql = f"SELECT SUM(amount) as total FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE coach_id = @coach_id AND status = 'Pending'"
    params = [bigquery.ScalarQueryParameter("coach_id", "INTEGER", coach_id)]
    results = db.query(sql, params)
    
    if results and results[0].get("total") is not None:
        return int(results[0]["total"])
    return 0

def confirmar_pago_lote(batch_id: str) -> bool:
    """
    Cuando el Webhook de WOMPI avise que el pago fue exitoso (APPROVED),
    actualiza los cobros asociados al lote (batch_id) marcándolos como 'Paid',
    registrando la fecha de pago (paid_at), y asegurando que los usuarios correspondientes
    estén activos (is_active = True).
    """
    db = get_bq_db()
    
    # 1. Obtener los pagos del lote para conocer los IDs de los atletas y el coach_id
    sql_get = f"SELECT client_id, coach_id FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE batch_id = @batch_id"
    params_get = [bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id)]
    payments = db.query(sql_get, params_get)
    
    # 2. Actualizar el estado de los pagos en el lote a 'Paid'
    sql_update = f"""
        UPDATE `{PROJECT_ID}.{DATASET_ID}.payments` 
        SET status = 'Paid', paid_at = @paid_at 
        WHERE batch_id = @batch_id
    """
    params_update = [
        bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
        bigquery.ScalarQueryParameter("paid_at", "TIMESTAMP", now_bogota())
    ]
    
    try:
        db.query(sql_update, params_update)
        
        # 3. Marcar a los atletas asociados como activos en BigQuery
        for p in payments:
            client_id = p.get("client_id")
            if client_id:
                db.update_user_status(client_id, True)
                
        # 4. Marcar al coach como activo en BigQuery
        if payments:
            coach_id = payments[0].get("coach_id")
            if coach_id:
                db.update_user_status(coach_id, True)
                
        return True
    except Exception as e:
        print(f"Error confirmando pago del lote {batch_id}: {str(e)}")
        return False
