import os
import uuid
import time
from datetime import datetime, timezone, timedelta
from google.cloud import bigquery
from google.oauth2 import service_account

PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "secrets", "credentials.json")

BOGOTA_TZ = timezone(timedelta(hours=-5))

def now_bogota():
    return datetime.now(tz=BOGOTA_TZ)

class BigQueryDB:
    def __init__(self):
        if os.path.exists(CREDENTIALS_PATH):
            credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
            self.client = bigquery.Client(credentials=credentials, project=PROJECT_ID)
        else:
            self.client = bigquery.Client(project=PROJECT_ID)

    def query(self, sql, params=None):
        job_config = bigquery.QueryJobConfig(query_parameters=params) if params else None
        query_job = self.client.query(sql, job_config=job_config)
        return [dict(row) for row in query_job]

    def insert(self, table_name, row_dict):
        table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
        # BigQuery streaming inserts can take a few seconds to be available for query
        errors = self.client.insert_rows_json(table_id, [row_dict])
        if errors:
            print(f"Error inserting into {table_name}: {errors}")
            return False
        return True

    def get_user_by_email(self, email):
        sql = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.users` WHERE email = @email LIMIT 1"
        params = [bigquery.ScalarQueryParameter("email", "STRING", email)]
        results = self.query(sql, params)
        return results[0] if results else None

    def get_user_by_id(self, user_id):
        sql = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.users` WHERE id = @id LIMIT 1"
        params = [bigquery.ScalarQueryParameter("id", "INTEGER", user_id)]
        results = self.query(sql, params)
        return results[0] if results else None

    def create_user(self, email, name, role, google_id=None, coach_id=None):
        # Generate a numeric ID based on timestamp to avoid collisions
        new_id = int(time.time() * 1000) % 2147483647
        user_row = {
            "id": new_id,
            "email": email,
            "name": name,
            "role": role,
            "google_id": google_id,
            "is_active": True,
            "coach_id": coach_id,
            "phone": None,
            "instagram": None,
            "profile_picture_url": None
        }
        if self.insert("users", user_row):
            return user_row
        return None

    def update_user_status(self, user_id, is_active):
        sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET is_active = @is_active WHERE id = @id"
        params = [
            bigquery.ScalarQueryParameter("is_active", "BOOL", is_active),
            bigquery.ScalarQueryParameter("id", "INTEGER", user_id)
        ]
        self.query(sql, params)
        return True

    def get_clients(self, coach_id=None, is_admin=False):
        sql = f"SELECT u.*, p.age, p.weight, p.goal, p.plan_type, p.start_date, p.end_date, p.control_date " \
              f"FROM `{PROJECT_ID}.{DATASET_ID}.users` u " \
              f"LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.client_profiles` p ON u.id = p.user_id " \
              f"WHERE u.role = 'Client'"
        params = []
        if not is_admin and coach_id:
            sql += " AND u.coach_id = @coach_id"
            params.append(bigquery.ScalarQueryParameter("coach_id", "INTEGER", coach_id))
        
        return self.query(sql, params)

    def save_client_profile(self, user_id, profile_data):
        # Check if profile exists
        sql = f"SELECT id FROM `{PROJECT_ID}.{DATASET_ID}.client_profiles` WHERE user_id = @user_id LIMIT 1"
        params = [bigquery.ScalarQueryParameter("user_id", "INTEGER", user_id)]
        existing = self.query(sql, params)

        if existing:
            # Update
            sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.client_profiles` SET " \
                  f"age=@age, weight=@weight, goal=@goal, plan_type=@plan_type, " \
                  f"start_date=@start_date, end_date=@end_date, control_date=@control_date " \
                  f"WHERE user_id=@user_id"
        else:
            # Insert
            new_id = int(time.time() * 1000) % 2147483647
            sql = f"INSERT INTO `{PROJECT_ID}.{DATASET_ID}.client_profiles` " \
                  f"(id, user_id, age, weight, goal, plan_type, start_date, end_date, control_date) " \
                  f"VALUES (@id, @user_id, @age, @weight, @goal, @plan_type, @start_date, @end_date, @control_date)"
            params.append(bigquery.ScalarQueryParameter("id", "INTEGER", new_id))

        # Convertir a int para coincidir con el esquema de BigQuery si son números
        try:
            age_val = int(profile_data['age'])
        except:
            age_val = 0
            
        try:
            weight_val = int(profile_data['weight'])
        except:
            weight_val = 0

        params.extend([
            bigquery.ScalarQueryParameter("age", "INTEGER", age_val),
            bigquery.ScalarQueryParameter("weight", "INTEGER", weight_val),
            bigquery.ScalarQueryParameter("goal", "STRING", profile_data['goal']),
            bigquery.ScalarQueryParameter("plan_type", "STRING", profile_data['planType']),
            bigquery.ScalarQueryParameter("start_date", "STRING", profile_data['startDate']),
            bigquery.ScalarQueryParameter("end_date", "STRING", profile_data['endDate']),
            bigquery.ScalarQueryParameter("control_date", "STRING", profile_data['controlDate']),
        ])
        self.query(sql, params)
        return True

    def get_client_profile(self, user_id):
        sql = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.client_profiles` WHERE user_id = @user_id LIMIT 1"
        params = [bigquery.ScalarQueryParameter("user_id", "INTEGER", user_id)]
        results = self.query(sql, params)
        return results[0] if results else None

    def get_latest_routine(self, user_id):
        sql = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.routines` WHERE user_id = @user_id ORDER BY created_at DESC LIMIT 1"
        params = [bigquery.ScalarQueryParameter("user_id", "INTEGER", user_id)]
        results = self.query(sql, params)
        return results[0] if results else None

    def save_routine(self, user_id, routine_data):
        new_id = int(time.time() * 1000) % 2147483647
        row = {
            "id": new_id,
            "user_id": user_id,
            "routine_data": routine_data,
            "created_at": now_bogota().isoformat()
        }
        return self.insert("routines", row)

    def get_weight_history(self, user_id):
        sql = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.weight_history` WHERE user_id = @user_id ORDER BY created_at DESC"
        params = [bigquery.ScalarQueryParameter("user_id", "INTEGER", user_id)]
        return self.query(sql, params)

    def add_weight_record(self, user_id, weight, notes=None, routine_id=None):
        new_id = int(time.time() * 1000) % 2147483647
        row = {
            "id": new_id,
            "user_id": user_id,
            "routine_id": routine_id,
            "weight": weight,
            "created_at": now_bogota().isoformat(),
            "notes": notes
        }
        return self.insert("weight_history", row)

    def get_notifications(self, user_id):
        sql = f"SELECT * FROM `{PROJECT_ID}.{DATASET_ID}.notifications` WHERE user_id = @user_id ORDER BY created_at DESC"
        params = [bigquery.ScalarQueryParameter("user_id", "INTEGER", user_id)]
        return self.query(sql, params)

    def delete_notification(self, notif_id, user_id):
        sql = f"DELETE FROM `{PROJECT_ID}.{DATASET_ID}.notifications` WHERE id = @id AND user_id = @user_id"
        params = [
            bigquery.ScalarQueryParameter("id", "INTEGER", notif_id),
            bigquery.ScalarQueryParameter("user_id", "INTEGER", user_id)
        ]
        self.query(sql, params)
        return True

    def create_notification(self, user_id, message):
        new_id = int(time.time() * 1000) % 2147483647
        row = {
            "id": new_id,
            "user_id": user_id,
            "message": message,
            "created_at": now_bogota().isoformat(),
            "is_read": False
        }
        return self.insert("notifications", row)

    def get_payments(self, coach_id=None, is_admin=False, status=None):
        if is_admin:
            sql = f"""
                SELECT p.*, u.name as coach_name 
                FROM `{PROJECT_ID}.{DATASET_ID}.payments` p
                LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.users` u ON p.coach_id = u.id
                WHERE 1=1
            """
            params = []
            if status:
                sql += " AND p.status = @status"
                params.append(bigquery.ScalarQueryParameter("status", "STRING", status))
            sql += " ORDER BY p.created_at DESC"
        else:
            sql = f"""
                SELECT p.*, u.name as coach_name 
                FROM `{PROJECT_ID}.{DATASET_ID}.payments` p
                LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.users` u ON p.coach_id = u.id
                WHERE p.coach_id = @coach_id
            """
            params = [bigquery.ScalarQueryParameter("coach_id", "INTEGER", coach_id)]
            if status:
                sql += " AND p.status = @status"
                params.append(bigquery.ScalarQueryParameter("status", "STRING", status))
            sql += " ORDER BY p.created_at DESC"
        return self.query(sql, params)

    def get_payment_batches(self, coach_id=None):
        sql = f"""
            SELECT 
                p.batch_id, 
                u_coach.name as coach_name, 
                COUNT(*) as clients_count, 
                SUM(p.amount) as total_amount, 
                FORMAT_TIMESTAMP('%d/%m/%Y', COALESCE(MAX(p.paid_at), MAX(p.created_at))) as date,
                ARRAY_AGG(STRUCT(
                    p.client_name as name, 
                    u_client.email as email,
                    p.plan_type, 
                    p.amount, 
                    cp.start_date, 
                    cp.end_date,
                    FORMAT_TIMESTAMP('%d/%m/%Y', p.created_at) as reg_date,
                    IF(
                        (SELECT COUNT(*) FROM `{PROJECT_ID}.{DATASET_ID}.payments` p2 
                         WHERE p2.client_id = p.client_id 
                         AND p2.status = 'Paid' 
                         AND p2.created_at < p.created_at) = 0,
                        'Nuevo', 'Renovación'
                    ) as tramite
                )) as clients
            FROM `{PROJECT_ID}.{DATASET_ID}.payments` p
            LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.users` u_coach ON p.coach_id = u_coach.id
            LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.users` u_client ON p.client_id = u_client.id
            LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.client_profiles` cp ON p.client_id = cp.user_id
            WHERE p.status = 'Paid' AND p.batch_id IS NOT NULL
        """
        params = []
        if coach_id:
            sql += " AND p.coach_id = @coach_id "
            params.append(bigquery.ScalarQueryParameter("coach_id", "INTEGER", coach_id))
            
        sql += """
            GROUP BY p.batch_id, coach_name
            ORDER BY COALESCE(MAX(p.paid_at), MAX(p.created_at)) DESC
        """
        return self.query(sql, params)

    def create_payment(self, coach_id, client_id, client_name, amount, plan_type):
        # 1. Buscar si ya existe un cobro PENDIENTE para este atleta con este coach
        sql = f"SELECT id FROM `{PROJECT_ID}.{DATASET_ID}.payments` WHERE coach_id = @coach_id AND client_id = @client_id AND status = 'Pending' LIMIT 1"
        params = [
            bigquery.ScalarQueryParameter("coach_id", "INTEGER", coach_id),
            bigquery.ScalarQueryParameter("client_id", "INTEGER", client_id)
        ]
        existing = self.query(sql, params)

        if existing:
            # 2. Si existe, actualizamos la información (por si cambió el monto o plan_type)
            # Y actualizamos la fecha para que sepa que se 'renovó' hoy (corrige error de dedo)
            sql_update = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.payments` SET " \
                         f"amount=@amount, plan_type=@plan_type, created_at=@created_at, client_name=@client_name " \
                         f"WHERE id=@id"
            update_params = [
                bigquery.ScalarQueryParameter("amount", "INTEGER", amount),
                bigquery.ScalarQueryParameter("plan_type", "STRING", plan_type),
                bigquery.ScalarQueryParameter("created_at", "TIMESTAMP", now_bogota()),
                bigquery.ScalarQueryParameter("client_name", "STRING", client_name),
                bigquery.ScalarQueryParameter("id", "INTEGER", existing[0]['id'])
            ]
            self.query(sql_update, update_params)
            return True

        # 3. Si no existe, crear uno nuevo
        new_id = int(time.time() * 1000) % 2147483647
        row = {
            "id": new_id,
            "coach_id": coach_id,
            "client_id": client_id,
            "client_name": client_name,
            "amount": amount,
            "plan_type": plan_type,
            "status": "Pending",
            "batch_id": None,
            "created_at": now_bogota().isoformat()
        }
        return self.insert("payments", row)

    def cancel_payment(self, payment_id):
        # En lugar de eliminar, marcamos como Cancelled para trazabilidad
        sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.payments` SET status = 'Cancelled' WHERE id = @id"
        params = [bigquery.ScalarQueryParameter("id", "INTEGER", payment_id)]
        self.query(sql, params)
        return True

    def pay_balance(self, coach_id, batch_id):
        # 1. Update payments
        sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.payments` SET status = 'Paid', batch_id = @batch_id, paid_at = @paid_at " \
              f"WHERE coach_id = @coach_id AND status = 'Pending'"
        params = [
            bigquery.ScalarQueryParameter("batch_id", "STRING", batch_id),
            bigquery.ScalarQueryParameter("coach_id", "INTEGER", coach_id),
            bigquery.ScalarQueryParameter("paid_at", "TIMESTAMP", now_bogota())
        ]
        self.query(sql, params)
        return True

    def update_profile_picture(self, user_id, url):
        sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET profile_picture_url = @url WHERE id = @id"
        params = [
            bigquery.ScalarQueryParameter("url", "STRING", url),
            bigquery.ScalarQueryParameter("id", "INTEGER", user_id)
        ]
        self.query(sql, params)
        return True

# Inicialización diferida
_bq_db = None

def get_bq_db():
    global _bq_db
    if _bq_db is None:
        _bq_db = BigQueryDB()
    return _bq_db
