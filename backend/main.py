import os
from dotenv import load_dotenv
load_dotenv()

from google.cloud import bigquery
from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from typing import List, Optional, Union, Any
from datetime import datetime, timedelta, timezone
import uuid
import time
from database_bq import get_bq_db, now_bogota, PROJECT_ID, BOGOTA_TZ
import auth
from PIL import Image
from io import BytesIO
from google.cloud import storage
from routes.wompi import router as wompi_router

app = FastAPI(title="Body Logic BigQuery Server")
app.include_router(wompi_router, prefix="/api/wompi", tags=["Wompi"])

CURRENT_TERMS_VERSION = "v1.0"


# Configuración de CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://body-web-491923.web.app",
    "https://body-web-491923.firebaseapp.com",
    "https://bodylogic.fit",
    "https://www.bodylogic.fit",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    expose_headers=["Content-Length"],
)

# Pydantic Schemas
class TokenReq(BaseModel):
    token: str

class AcceptTermsReq(BaseModel):
    version: str

class ClientProfileBase(BaseModel):
    age: Optional[int] = None
    weight: Optional[int] = None
    goal: str
    planType: str
    startDate: str
    endDate: str
    controlDate: str
    isRenewal: Optional[bool] = False
    coach_id: Optional[int] = None

    @field_validator('age', 'weight', mode='before')
    @classmethod
    def empty_string_to_none(cls, v: Any) -> Any:
        if v == '':
            return None
        return v

class UserStatusReq(BaseModel):
    is_active: bool

class CoachCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    instagram: Optional[str] = None

class CoachProfileUpdate(BaseModel):
    email: str
    phone: Optional[str] = None
    instagram: Optional[str] = None
    presentation: Optional[str] = None
    mission: Optional[str] = None
    vision: Optional[str] = None

class RoutineReq(BaseModel):
    client_email: str
    routine_data: str

class ClientDataReq(BaseModel):
    email: str
    name: str
    profile: ClientProfileBase
    coach_id: Optional[int] = None
    isRenewal: Optional[bool] = False
    is_active: Optional[bool] = None

class PublishAllReq(BaseModel):
    athlete: ClientDataReq
    routine_data: str

# ====================
# Auth Endpoints
# ====================
@app.post("/api/auth/google")
def google_auth(req: TokenReq):
    print(f"DEBUG: Login attempt for token: {req.token[:20]}...")
    idinfo = auth.verify_google_token(req.token)
    email = idinfo.get("email")
    name = idinfo.get("name")
    
    db = get_bq_db()
    user = db.get_user_by_email(email)
    
    admin_emails = ["acostavi1204@gmail.com"]
    coach_emails = ["bodybyja2026@gmail.com"]
    
    expected_role = "Client"
    if email in admin_emails:
        expected_role = "Admin"
    elif email in coach_emails:
        expected_role = "Coach"

    if not user:
        user = db.create_user(email, name, expected_role, google_id=idinfo.get("sub"))
    else:
        if user['role'] != expected_role and expected_role != "Client":
            # Update role logic could be added here if needed
            pass

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user['email'], "role": user['role']}, expires_delta=access_token_expires
    )
    
    terms_accepted = bool(user.get("terms_accepted")) and user.get("terms_version") == CURRENT_TERMS_VERSION
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user['role'], 
        "name": user['name'], 
        "email": user['email'], 
        "is_active": bool(user['is_active']),
        "profile_picture_url": user.get('profile_picture_url'),
        "terms_accepted": terms_accepted
    }

@app.get("/api/auth/status")
def get_auth_status(current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    # Fetch fresh user details from database to avoid cache issues
    user = db.get_user_by_id(current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    terms_accepted = bool(user.get("terms_accepted")) and user.get("terms_version") == CURRENT_TERMS_VERSION
    
    return {
        "email": user["email"],
        "is_active": bool(user["is_active"]),
        "terms_accepted": terms_accepted,
        "terms_version": user.get("terms_version")
    }

@app.post("/api/auth/accept-terms")
def accept_terms(req: AcceptTermsReq, current_user=Depends(auth.get_current_user)):
    if req.version != CURRENT_TERMS_VERSION:
        raise HTTPException(status_code=400, detail=f"Versión de términos incorrecta. La versión vigente es {CURRENT_TERMS_VERSION}")
        
    db = get_bq_db()
    db.accept_user_terms(current_user.id, req.version)
    return {"status": "success", "message": "Términos y condiciones aceptados correctamente."}

# ====================
# Coach Endpoints
# ====================
@app.get("/api/coach/clients")
def get_clients(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    is_admin = current_user.role == "Admin"
    users = db.get_clients(coach_id=current_user.id, is_admin=is_admin)
    
    # Eliminar duplicados si los hubiera
    seen_ids = set()
    unique_users = []
    for u in users:
        if u['id'] not in seen_ids:
            unique_users.append(u)
            seen_ids.add(u['id'])

    # 1. Obtener la última rutina de cada atleta
    # Usamos ROW_NUMBER() para obtener sólo la más reciente de cada user_id
    from database_bq import PROJECT_ID, DATASET_ID
    sql_latest_routines = f"""
        SELECT user_id, routine_data 
        FROM (
            SELECT user_id, routine_data, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) as rn 
            FROM `{PROJECT_ID}.{DATASET_ID}.routines`
        ) 
        WHERE rn = 1
    """
    routines_rows = db.query(sql_latest_routines)
    
    # Mapeo de user_id -> conjunto de días activos en minúscula
    import json
    active_days_map = {}
    for r in routines_rows:
        u_id = r.get("user_id")
        r_data_str = r.get("routine_data")
        if u_id and r_data_str:
            try:
                r_days = json.loads(r_data_str)
                active_days_map[u_id] = {d.get("name", "").strip().lower() for d in r_days}
            except Exception:
                active_days_map[u_id] = set()
                
    # 2. Obtener todas las calificaciones de entrenamientos (workout_logs)
    sql_workout_logs = f"SELECT user_id, day_name, stars FROM `{PROJECT_ID}.{DATASET_ID}.workout_logs`"
    logs_rows = db.query(sql_workout_logs)
    
    # Agrupar las estrellas por user_id considerando sólo los días activos
    user_stars = {}
    for log in logs_rows:
        u_id = log.get("user_id")
        day_clean = log.get("day_name", "").strip().lower()
        stars_val = log.get("stars")
        
        if u_id and day_clean and stars_val is not None:
            # Si el usuario tiene rutina y el día está en la rutina activa
            if u_id in active_days_map and day_clean in active_days_map[u_id]:
                if u_id not in user_stars:
                    user_stars[u_id] = []
                user_stars[u_id].append(stars_val)
                
    # Calcular promedio por usuario
    avg_ratings_map = {}
    for u_id, stars_list in user_stars.items():
        if stars_list:
            avg_ratings_map[u_id] = round(sum(stars_list) / len(stars_list), 1)

    results = []
    today = now_bogota().strftime("%Y-%m-%d")
    for u in unique_users:
        is_active = bool(u['is_active'])
        
        # Asegurar que end_date sea string para la comparación
        end_date_str = u['end_date']
        if hasattr(end_date_str, 'strftime'):
            end_date_str = end_date_str.strftime("%Y-%m-%d")

        if end_date_str and end_date_str < today:
            is_active = False

        results.append({
            "id": u['id'],
            "email": u['email'],
            "name": u['name'],
            "profile": {
                "age": u['age'] or "",
                "weight": u['weight'] or "",
                "goal": u['goal'] or "",
                "planType": u['plan_type'] or "Mensual",
                "startDate": u['start_date'] or "",
                "endDate": u['end_date'] or "",
                "controlDate": u['control_date'] or ""
            },
            "is_active": is_active,
            "coach_id": u['coach_id'],
            "avg_rating": avg_ratings_map.get(u['id'], None)
        })
    return results

@app.post("/api/coach/clients")
def save_client_profile(req: ClientDataReq, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    user = db.get_user_by_email(req.email)
    
    if not user:
        coach_id = req.coach_id if req.coach_id else (current_user.id if current_user.role == "Coach" else None)
        user = db.create_user(req.email, req.name, "Client", coach_id=coach_id)
    
    db.save_client_profile(user['id'], req.profile.dict())
    
    if req.isRenewal:
        db.create_payment(current_user.id, user['id'], user['name'], 20000, req.profile.planType)

    return {"status": "success", "message": "Atleta registrado en BigQuery", "user_id": user['id']}

@app.put("/api/coach/clients/{user_id}")
def update_client_profile(user_id: int, req: ClientDataReq, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    db.save_client_profile(user_id, req.profile.dict())
    if req.isRenewal:
        db.create_payment(current_user.id, user_id, req.name, 20000, req.profile.planType)
    return {"status": "success", "message": "Atleta actualizado correctamente"}

@app.patch("/api/admin/users/{user_id}/status")
def update_user_status(user_id: int, req: UserStatusReq, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    db.update_user_status(user_id, req.is_active)
    return {"status": "success", "is_active": req.is_active}

@app.post("/api/coach/publish-all")
def publish_all(req: PublishAllReq, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    user = db.get_user_by_email(req.athlete.email)
    if not user:
        user = db.create_user(req.athlete.email, req.athlete.name, "Client", coach_id=current_user.id)
    
    db.save_client_profile(user['id'], req.athlete.profile.dict())
    db.save_routine(user['id'], req.routine_data)
    db.create_notification(user['id'], f"Tu coach {current_user.name} ha actualizado tu rutina.")
    db.add_weight_record(user['id'], req.athlete.profile.weight, notes="Actualización Global")

    if req.athlete.isRenewal:
        db.create_payment(current_user.id, user['id'], user['name'], 20000, req.athlete.profile.planType)

    return {"status": "success", "message": "Todo guardado en BigQuery"}

@app.post("/api/admin/renew-plan")
def renew_athlete_plan(req: ClientDataReq, current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    user = db.get_user_by_email(req.email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # 1. Actualizar el perfil del cliente
    db.save_client_profile(user['id'], req.profile.dict())
    
    # 2. Si es una renovación, crear el registro de pago para el coach
    # Usamos el coach_id del atleta o el del usuario actual si es un coach
    coach_id = user.get('coach_id') or (current_user.id if current_user.role == 'Coach' else None)
    
    if coach_id:
        db.create_payment(coach_id, user['id'], user['name'], 20000, req.profile.planType)
        
    # 3. Actualizar el estado de actividad si se envió
    if req.is_active is not None:
        db.update_user_status(user['id'], req.is_active)
    
    return {"status": "success", "message": "Plan renovado exitosamente"}

@app.get("/api/coach/routine/{client_email}")
def get_client_routine_by_coach(client_email: str, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    user = db.get_user_by_email(client_email)
    if not user: return {"status": "empty"}
    routine = db.get_latest_routine(user['id'])
    
    # Obtener el promedio de calificación por día de entrenamiento
    from database_bq import PROJECT_ID, DATASET_ID
    sql_ratings = f"""
        SELECT day_name, AVG(stars) as avg_rating 
        FROM `{PROJECT_ID}.{DATASET_ID}.workout_logs` 
        WHERE user_id = @user_id 
        GROUP BY day_name
    """
    params = [bigquery.ScalarQueryParameter("user_id", "INTEGER", user['id'])]
    ratings_rows = db.query(sql_ratings, params)
    
    # Formatear como un diccionario {day_name: float} redondeado a 1 decimal
    ratings_by_day = {}
    for row in ratings_rows:
        day_name = row.get("day_name")
        avg_val = row.get("avg_rating")
        if day_name and avg_val is not None:
            ratings_by_day[day_name] = round(float(avg_val), 1)
            
    return {
        "status": "success", 
        "routine_data": routine['routine_data'] if routine else None,
        "ratings_by_day": ratings_by_day
    }

@app.get("/api/coach/client/weight-history/{client_email}")
def get_client_weight_history_by_coach(client_email: str, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    user = db.get_user_by_email(client_email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    history = db.get_weight_history(user['id'])
    return [{"id": h['id'], "weight": h['weight'], "date": h['created_at'].strftime("%Y-%m-%d"), "notes": h['notes']} for h in history]

@app.get("/api/client/my-routine")
def get_my_routine(current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    routine = db.get_latest_routine(current_user.id)
    
    profile = db.get_client_profile(current_user.id)
    profile_info = None
    if profile:
        profile_info = {
            "age": profile.get('age', ''),
            "weight": profile.get('weight', ''),
            "goal": profile.get('goal', ''),
            "planType": profile.get('plan_type', ''),
            "startDate": profile.get('start_date', ''),
            "endDate": profile.get('end_date', ''),
            "controlDate": profile.get('control_date', '')
        }
    
    coach_info = None
    if current_user.coach_id:
        coach = db.get_user_by_id(current_user.coach_id)
        if coach:
            coach_info = {
                "name": str(coach.get('name', '—')) if coach.get('name') else '—',
                "phone": str(coach.get('phone', '')) if coach.get('phone') else '',
                "instagram": str(coach.get('instagram', '')) if coach.get('instagram') else '',
                "presentation": coach.get('presentation', ''),
                "mission": coach.get('mission', ''),
                "vision": coach.get('vision', ''),
                "profile_picture_url": coach.get('profile_picture_url', '')
            }

    return {
        "status": "success", 
        "routine_data": routine['routine_data'] if routine else None, 
        "coach": coach_info,
        "profile": profile_info
    }

@app.get("/api/client/weight-history")
def get_weight_history(current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    history = db.get_weight_history(current_user.id)
    return [{"id": h['id'], "weight": h['weight'], "date": h['created_at'].strftime("%Y-%m-%d"), "notes": h['notes']} for h in history]

@app.get("/api/coach/list")
def get_coaches(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    from database_bq import PROJECT_ID, DATASET_ID
    sql = f"SELECT DISTINCT id, name, email, phone, instagram FROM `{PROJECT_ID}.{DATASET_ID}.users` WHERE role = 'Coach'"
    coaches = db.query(sql)
    return coaches

@app.get("/api/admin/coaches")
def get_admin_coaches(current_user=Depends(auth.get_current_active_admin)):
    db = get_bq_db()
    from database_bq import PROJECT_ID, DATASET_ID
    sql = f"SELECT DISTINCT id, name, email, phone, instagram, is_active FROM `{PROJECT_ID}.{DATASET_ID}.users` WHERE role = 'Coach'"
    return db.query(sql)

@app.post("/api/admin/coaches")
def create_coach(req: CoachCreate, current_user=Depends(auth.get_current_active_admin)):
    db = get_bq_db()
    user = db.get_user_by_email(req.email)
    if user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    new_coach = db.create_user(req.email, req.name, "Coach")
    
    # Actualizar campos adicionales (phone e instagram)
    from database_bq import PROJECT_ID, DATASET_ID
    sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET phone=@phone, instagram=@instagram WHERE id=@id"
    
    bq_params = [
        bigquery.ScalarQueryParameter("phone", "STRING", req.phone),
        bigquery.ScalarQueryParameter("instagram", "STRING", req.instagram),
        bigquery.ScalarQueryParameter("id", "INTEGER", new_coach['id'])
    ]
    db.query(sql, bq_params)
    return {"status": "success", "message": "Coach creado en BigQuery"}

@app.delete("/api/admin/coaches/{coach_id}")
def delete_coach(coach_id: int, current_user=Depends(auth.get_current_active_admin)):
    db = get_bq_db()
    from database_bq import PROJECT_ID, DATASET_ID
    sql = f"DELETE FROM `{PROJECT_ID}.{DATASET_ID}.users` WHERE id = @id AND role = 'Coach'"
    params = [bigquery.ScalarQueryParameter("id", "INTEGER", coach_id)]
    db.query(sql, params)
    return {"message": "Coach eliminado"}

@app.get("/api/notifications")
def get_notifications(current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    notifs = db.get_notifications(current_user.id)
    return [{"id": n['id'], "message": n['message'], "date": n['created_at'].strftime("%d/%m %H:%M"), "is_read": n['is_read']} for n in notifs]

@app.delete("/api/notifications/{notif_id}")
def delete_notification(notif_id: int, current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    db.delete_notification(notif_id, current_user.id)
    return {"message": "Eliminada"}

@app.get("/api/coach/payments")
def get_coach_payments(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    payments = db.get_payments(coach_id=current_user.id)
    return [{"id": p['id'], "client_name": p['client_name'], "plan_type": p.get('plan_type', 'Mensual'), "amount": p['amount'], "status": p['status'], "date": p['created_at'].strftime("%d/%m/%Y")} for p in payments]

@app.post("/api/coach/payments/pay")
def pay_balance(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    batch_id = str(uuid.uuid4())
    db.pay_balance(current_user.id, batch_id)
    return {"message": "Pagado", "batch_id": batch_id}

@app.get("/api/coach/payments/history")
def get_coach_payment_history(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    return db.get_payment_batches(coach_id=current_user.id)

@app.get("/api/admin/payments")
def get_admin_payments(status: Optional[str] = None, current_user=Depends(auth.get_current_active_admin)):
    db = get_bq_db()
    if status == 'Paid':
        return db.get_payment_batches()
    return db.get_payments(is_admin=True, status=status)

@app.delete("/api/admin/payments/{payment_id}")
def cancel_payment(payment_id: int, current_user=Depends(auth.get_current_active_admin)):
    db = get_bq_db()
    db.cancel_payment(payment_id)
    return {"status": "success", "message": "Cobro anulado"}

# ====================
# Coach Profile Endpoints
# ====================
@app.get("/api/coach/profile")
def get_coach_profile(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    coach = db.get_user_by_id(current_user.id)
    if not coach:
        raise HTTPException(status_code=404, detail="Coach no encontrado")
    
    return {
        "email": coach.get('email', ''),
        "phone": str(coach.get('phone', '')) if coach.get('phone') is not None else '',
        "instagram": coach.get('instagram', ''),
        "presentation": coach.get('presentation', ''),
        "mission": coach.get('mission', ''),
        "vision": coach.get('vision', '')
    }

@app.post("/api/coach/profile")
def update_coach_profile(req: CoachProfileUpdate, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    
    from database_bq import PROJECT_ID, DATASET_ID
    sql = f"""
        UPDATE `{PROJECT_ID}.{DATASET_ID}.users` 
        SET email=@email, phone=@phone, instagram=@instagram, 
            presentation=@presentation, mission=@mission, vision=@vision 
        WHERE id=@id
    """
    
    bq_params = [
        bigquery.ScalarQueryParameter("email", "STRING", req.email),
        bigquery.ScalarQueryParameter("phone", "STRING", req.phone),
        bigquery.ScalarQueryParameter("instagram", "STRING", req.instagram),
        bigquery.ScalarQueryParameter("presentation", "STRING", req.presentation),
        bigquery.ScalarQueryParameter("mission", "STRING", req.mission),
        bigquery.ScalarQueryParameter("vision", "STRING", req.vision),
        bigquery.ScalarQueryParameter("id", "INTEGER", current_user.id)
    ]
    
    try:
        db.query(sql, bq_params)
        return {"status": "success", "message": "Perfil actualizado correctamente"}
    except Exception as e:
        print(f"Error updating coach profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar perfil: {str(e)}")

# ====================
# Profile Picture Endpoints
# ====================
def upload_to_gcs(file_content: bytes, filename: str):
    """Sube una imagen a Google Cloud Storage y la hace pública."""
    BUCKET_NAME = "body-web-profile-pictures"
    storage_client = storage.Client(project=PROJECT_ID)
    
    # Intentar obtener el bucket, si no existe crearlo (opcional, mejor si ya existe)
    try:
        bucket = storage_client.get_bucket(BUCKET_NAME)
    except:
        bucket = storage_client.create_bucket(BUCKET_NAME, location="us-central1")
        # Hacerlo público (opcional, según política de GCP)
        bucket.make_public(recursive=True, future=True)

    blob = bucket.blob(filename)
    blob.upload_from_string(file_content, content_type="image/webp")
    return blob.public_url

@app.post("/api/user/profile-picture")
async def upload_profile_picture(
    file: UploadFile = File(...), 
    current_user=Depends(auth.get_current_user)
):
    try:
        # 1. Leer imagen
        contents = await file.read()
        image = Image.open(BytesIO(contents))

        # 2. Convertir a WebP
        webp_io = BytesIO()
        image.save(webp_io, format="WEBP", quality=80)
        webp_content = webp_io.getvalue()

        # 3. Nombre de archivo fijo por usuario para sobrescribir (evita acumular basura)
        filename = f"avatars/{current_user.id}.webp"

        # 4. Subir a GCS (Sobrescribe si ya existe)
        public_url = upload_to_gcs(webp_content, filename)

        # 5. Actualizar BigQuery
        db = get_bq_db()
        db.update_profile_picture(current_user.id, public_url)

        return {"status": "success", "url": public_url}
    except Exception as e:
        print(f"Error uploading profile picture: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la imagen: {str(e)}")

class WorkoutCompleteReq(BaseModel):
    day_name: str
    stars: int

@app.post("/api/client/workouts/complete")
def complete_workout(req: WorkoutCompleteReq, current_user=Depends(auth.get_current_user)):
    if req.stars < 1 or req.stars > 5:
        raise HTTPException(status_code=400, detail="La calificación debe estar entre 1 y 5 estrellas.")
    db = get_bq_db()
    success = db.log_completed_workout(current_user.id, req.day_name, req.stars)
    if not success:
        raise HTTPException(status_code=500, detail="No se pudo registrar la finalización del entrenamiento.")
    return {"status": "success", "message": "Entrenamiento completado registrado con éxito."}

@app.get("/api/client/workouts/streak")
def get_workout_streak(current_user=Depends(auth.get_current_user)):
    import json
    from datetime import timedelta as py_timedelta
    
    db = get_bq_db()
    routine = db.get_latest_routine(current_user.id)
    completed_logs = db.get_completed_workouts(current_user.id)
    
    total_workouts = len(completed_logs)
    
    if not routine:
        return {
            "streak": 0,
            "total_workouts": total_workouts,
            "badge": "Ninguna",
            "next_badge": "Bronce",
            "next_badge_target": 5,
            "progress_message": "¡Completa tu rutina de hoy para poner en marcha tu racha y conseguir tu primera medalla! 🚀",
            "scheduled_days": []
        }
    
    try:
        routine_days = json.loads(routine['routine_data'])
    except Exception:
        routine_days = []
        
    SPANISH_DAYS = {
        "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
        "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5,
        "domingo": 6
    }
    
    scheduled_weekdays = []
    scheduled_day_names = []
    for d in routine_days:
        name_clean = d.get('name', '').strip().lower()
        if name_clean in SPANISH_DAYS:
            scheduled_weekdays.append(SPANISH_DAYS[name_clean])
            scheduled_day_names.append(d.get('name'))
            
    scheduled_weekdays = sorted(list(set(scheduled_weekdays)))
    
    # Si la rutina no tiene días válidos de la semana
    if not scheduled_weekdays:
        return {
            "streak": 0,
            "total_workouts": total_workouts,
            "badge": "Ninguna",
            "next_badge": "Bronce",
            "next_badge_target": 5,
            "progress_message": "¡Completa tu rutina de hoy para poner en marcha tu racha y conseguir tu primera medalla! 🚀",
            "scheduled_days": []
        }
        
    # Obtener fechas de completado en Bogotá timezone
    completed_dates = set()
    for log in completed_logs:
        dt = log.get('completed_at')
        if dt:
            if isinstance(dt, str):
                if dt.endswith('Z'):
                    dt = dt.replace('Z', '+00:00')
                from datetime import datetime
                try:
                    dt = datetime.fromisoformat(dt)
                except Exception:
                    continue
            try:
                dt_bogota = dt.astimezone(BOGOTA_TZ)
                completed_dates.add(dt_bogota.strftime("%Y-%m-%d"))
            except Exception:
                pass
                
    # Calcular racha caminando hacia atrás en el tiempo
    today_dt = now_bogota()
    today_date = today_dt.date()
    
    current_date = today_date
    streak = 0
    active = True
    max_lookback = 1000
    lookback_days = 0
    used_completion_dates = set()
    
    while active and lookback_days < max_lookback:
        weekday = current_date.weekday()
        date_str = current_date.strftime("%Y-%m-%d")
        next_day = current_date + py_timedelta(days=1)
        next_day_str = next_day.strftime("%Y-%m-%d")
        
        if weekday in scheduled_weekdays:
            date_str_available = date_str in completed_dates and date_str not in used_completion_dates
            next_day_str_available = next_day_str in completed_dates and next_day_str not in used_completion_dates
            
            if date_str_available:
                streak += 1
                used_completion_dates.add(date_str)
            elif next_day_str_available:
                streak += 1
                used_completion_dates.add(next_day_str)
            else:
                if current_date == today_date:
                    # Si es hoy y no lo ha completado, no rompemos la racha todavía
                    pass
                else:
                    # Día de entrenamiento pasado no completado: se rompe la racha
                    active = False
        else:
            # Día de descanso, lo ignoramos
            pass
            
        current_date -= py_timedelta(days=1)
        lookback_days += 1
        
    MEDALS = [
        {"name": "Ninguna", "min": 0, "next_name": "Bronce", "target": 5},
        {"name": "Bronce", "min": 5, "next_name": "Plata", "target": 10},
        {"name": "Plata", "min": 10, "next_name": "Oro", "target": 20},
        {"name": "Oro", "min": 20, "next_name": "Zafiro", "target": 30},
        {"name": "Zafiro", "min": 30, "next_name": "Rubí", "target": 40},
        {"name": "Rubí", "min": 40, "next_name": "Esmeralda", "target": 50},
        {"name": "Esmeralda", "min": 50, "next_name": "Amatista", "target": 60},
        {"name": "Amatista", "min": 60, "next_name": "Perla", "target": 70},
        {"name": "Perla", "min": 70, "next_name": "Obsidiana", "target": 80},
        {"name": "Obsidiana", "min": 80, "next_name": "Diamante", "target": 100},
        {"name": "Diamante", "min": 100, "next_name": None, "target": None}
    ]
    
    active_medal = MEDALS[0]
    for m in MEDALS:
        if streak >= m["min"]:
            active_medal = m
            
    badge = active_medal["name"]
    next_badge = active_medal["next_name"]
    next_badge_target = active_medal["target"]
    
    if streak == 0:
        progress_message = "¡Completa tu rutina de hoy para poner en marcha tu racha y conseguir tu primera medalla! 🚀"
    elif next_badge:
        days_needed = next_badge_target - streak
        progress_message = f"¡Llevas {streak} días de racha! Te faltan {days_needed} días de racha para obtener la medalla de {next_badge}."
    else:
        progress_message = "¡Felicidades! Has alcanzado la medalla de Diamante, el rango máximo. 💎"
        
    return {
        "streak": streak,
        "total_workouts": total_workouts,
        "badge": badge,
        "next_badge": next_badge,
        "next_badge_target": next_badge_target,
        "progress_message": progress_message,
        "scheduled_days": scheduled_day_names
    }

@app.get("/")
def read_root():
    return {"message": "Body Logic API running on BigQuery Serverless"}
