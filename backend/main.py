from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union, Any
from datetime import datetime, timedelta, timezone
import os
import uuid
import time
from database_bq import get_bq_db, now_bogota
import auth

app = FastAPI(title="Body Logic BigQuery Server")

# Configuración de CORS
origins = [
    "http://localhost:5173",
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

class ClientProfileBase(BaseModel):
    age: Any
    weight: Any
    goal: str
    planType: str
    startDate: str
    endDate: str
    controlDate: str
    isRenewal: Optional[bool] = False
    coach_id: Optional[int] = None

class UserStatusReq(BaseModel):
    is_active: bool

class CoachCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    instagram: Optional[str] = None

class RoutineReq(BaseModel):
    client_email: str
    routine_data: str

class ClientDataReq(BaseModel):
    email: str
    name: str
    profile: ClientProfileBase
    coach_id: Optional[int] = None
    isRenewal: Optional[bool] = False

class PublishAllReq(BaseModel):
    athlete: ClientDataReq
    routine_data: str

# ====================
# Auth Endpoints
# ====================
@app.post("/api/auth/google")
def google_auth(req: TokenReq):
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
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user['role'], 
        "name": user['name'], 
        "email": user['email'], 
        "is_active": bool(user['is_active'])
    }

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
            "coach_id": u['coach_id']
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

@app.get("/api/coach/routine/{client_email}")
def get_client_routine_by_coach(client_email: str, current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    user = db.get_user_by_email(client_email)
    if not user: return {"status": "empty"}
    routine = db.get_latest_routine(user['id'])
    return {"status": "success", "routine_data": routine['routine_data'] if routine else None}

@app.get("/api/client/my-routine")
def get_my_routine(current_user=Depends(auth.get_current_user)):
    db = get_bq_db()
    routine = db.get_latest_routine(current_user.id)
    if not routine: return {"status": "empty"}
    
    coach_info = None
    if current_user.coach_id:
        coach = db.get_user_by_id(current_user.coach_id)
        if coach:
            # Asegurar que los datos del coach sean strings para evitar errores en el front
            coach_info = {
                "name": str(coach.get('name', '—')) if coach.get('name') else '—',
                "phone": str(coach.get('phone', '')) if coach.get('phone') else '',
                "instagram": str(coach.get('instagram', '')) if coach.get('instagram') else ''
            }

    return {"status": "success", "routine_data": routine['routine_data'], "coach": coach_info}

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
    # Actualizar campos adicionales
    from database_bq import PROJECT_ID, DATASET_ID
    sql = f"UPDATE `{PROJECT_ID}.{DATASET_ID}.users` SET phone=@phone, instagram=@instagram WHERE id=@id"
    params = [
        {"name": "phone", "type": "STRING", "value": req.phone},
        {"name": "instagram", "type": "STRING", "value": req.instagram},
        {"name": "id", "type": "INTEGER", "value": new_coach['id']}
    ]
    # Usar el cliente directamente para parámetros complejos si es necesario, 
    # pero nuestra función db.query acepta params básicos
    from google.cloud import bigquery
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
    return [{"id": p['id'], "client_name": p['client_name'], "amount": p['amount'], "status": p['status'], "date": p['created_at'].strftime("%d/%m/%Y")} for p in payments]

@app.post("/api/coach/payments/pay")
def pay_balance(current_user=Depends(auth.get_current_active_coach)):
    db = get_bq_db()
    batch_id = str(uuid.uuid4())
    db.pay_balance(current_user.id, batch_id)
    return {"message": "Pagado", "batch_id": batch_id}

@app.get("/api/admin/payments")
def get_admin_payments(current_user=Depends(auth.get_current_active_admin)):
    db = get_bq_db()
    return db.get_payments(is_admin=True)

@app.get("/")
def read_root():
    return {"message": "Body Logic API running on BigQuery Serverless"}
