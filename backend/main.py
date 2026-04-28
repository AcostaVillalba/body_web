from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import os
import time
import uuid
from google.cloud import bigquery
from google.oauth2 import service_account
from sqlalchemy.orm import Session

# Colombia = UTC-5 (sin horario de verano)
BOGOTA_TZ = timezone(timedelta(hours=-5))

def now_bogota() -> datetime:
    """Retorna la fecha/hora actual en zona horaria de Colombia (UTC-5)."""
    return datetime.now(tz=BOGOTA_TZ)

# Database and Auth imports
from database import engine, get_db
import models
import auth

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Body Logic Internal Server")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de BigQuery (Mantenida como respaldo analítico)
PROJECT_ID = "body-web-491923"
DATASET_ID = "bodybyja_analytics"
TABLE_ID = "client_plans"
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "secrets", "credentials.json")

_bq_client = None
def get_bigquery_client():
    global _bq_client
    if _bq_client:
        return _bq_client
    
    if os.path.exists(CREDENTIALS_PATH):
        try:
            credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
            _bq_client = bigquery.Client(credentials=credentials, project=PROJECT_ID)
            return _bq_client
        except Exception as e:
            print(f"Error initializing BigQuery client: {e}")
    return None

def write_to_bigquery(data: dict):
    client = get_bigquery_client()
    if not client:
        return
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    data["timestamp"] = now_bogota().isoformat()
    errors = client.insert_rows_json(table_id, [data])
    if errors:
        print(f"Error insertando en BigQuery: {errors}")
    else:
        print("Datos insertados en BigQuery correctamente.")

# Pydantic Schemas
class TokenReq(BaseModel):
    token: str

class ClientProfileBase(BaseModel):
    age: str
    weight: str
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
    routine_data: str # JSON string of the whole routine

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
def google_auth(req: TokenReq, db: Session = Depends(get_db)):
    idinfo = auth.verify_google_token(req.token)
    email = idinfo.get("email")
    name = idinfo.get("name")
    print(f"AUTH_LOG: Intentando login para {email} ({name})")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    
    admin_emails = ["acostavi1204@gmail.com"]
    coach_emails = ["bodybyja2026@gmail.com"]
    
    expected_role = "Client"
    if email in admin_emails:
        expected_role = "Admin"
    elif email in coach_emails:
        expected_role = "Coach"

    if not user:
        user = models.User(email=email, name=name, role=expected_role, google_id=idinfo.get("sub"))
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Si el correo está en las listas blancas, lo subimos de nivel
        if user.role != expected_role and expected_role != "Client":
            user.role = expected_role
            db.commit()
            db.refresh(user)
        
        # ELIMINADO: La lógica que bajaba a Client si no estaba en la lista blanca.
        # Ahora, si ya eres Coach en la DB, te quedas como Coach.

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    
    print(f"AUTH_LOG: Login exitoso para {user.email}. Rol: {user.role}, Active: {user.is_active}")
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "name": user.name, "email": user.email, "is_active": bool(user.is_active)}


# ====================
# Coach Endpoints
# ====================
@app.get("/api/coach/clients")
def get_clients(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    query = db.query(models.User).filter(models.User.role == "Client")
    
    # Si es Coach, solo ve sus clientes. Si es Admin, ve todos.
    if current_user.role == "Coach":
        query = query.filter(models.User.coach_id == current_user.id)
        
    users = query.all()
    results = []
    for u in users:
        prof = u.profile
        is_active = bool(u.is_active)
        if prof and prof.end_date:
            today = now_bogota().strftime("%Y-%m-%d")
            if prof.end_date < today:
                is_active = False

        results.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "profile": {
                "age": prof.age if prof else "",
                "weight": prof.weight if prof else "",
                "goal": prof.goal if prof else "",
                "planType": prof.plan_type if prof else "Mensual",
                "startDate": prof.start_date if prof else "",
                "endDate": prof.end_date if prof else "",
                "controlDate": prof.control_date if prof else ""
            },
            "is_active": is_active,
            "coach_id": u.coach_id
        })
    return results

@app.post("/api/coach/clients")
def save_client_profile(req: ClientDataReq, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    if current_user.role == "Coach" and not current_user.is_active:
        raise HTTPException(status_code=403, detail="Su cuenta de coach está inactiva. Contacte al administrador.")
    
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        user = models.User(
            email=req.email, 
            name=req.name, 
            role="Client", 
            coach_id=req.coach_id if req.coach_id else (current_user.id if current_user.role == "Coach" else None)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.name = req.name
        # Si el usuario ya existía y el Admin/Coach envía un nuevo coach_id, lo actualizamos
        if req.coach_id:
            user.coach_id = req.coach_id
        elif not user.coach_id and current_user.role == "Coach":
            # Si el usuario no tiene coach y lo está registrando un coach, se lo asignamos a él
            user.coach_id = current_user.id
            
        db.commit()

    profile = db.query(models.ClientProfile).filter(models.ClientProfile.user_id == user.id).first()
    is_new_profile = False
    if not profile:
        profile = models.ClientProfile(user_id=user.id)
        db.add(profile)
        is_new_profile = True
    
    profile.age = req.profile.age
    profile.weight = req.profile.weight
    profile.goal = req.profile.goal
    profile.control_date = req.profile.controlDate

    if is_new_profile or req.isRenewal:
        profile.plan_type = req.profile.planType
        profile.start_date = req.profile.startDate
        profile.end_date = req.profile.endDate
        
        # Activar usuario si la fecha de fin es hoy o futura
        today = datetime.now().strftime("%Y-%m-%d")
        if profile.end_date >= today:
            user.is_active = True

    db.commit()

    # Registrar en histórico SOLO si es un nuevo atleta o si no hay registros previos
    if is_new_profile:
        record_weight_history(db, user.id, req.profile.weight, notes="Registro inicial del atleta")

    return {"status": "success", "message": "Atleta registrado en DB", "user_id": user.id}

@app.put("/api/coach/clients/{user_id}")
def update_client_profile(user_id: int, req: ClientDataReq, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    if current_user.role == "Coach" and not current_user.is_active:
        raise HTTPException(status_code=403, detail="Su cuenta de coach está inactiva. Contacte al administrador.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # Check if the new email already exists in ANOTHER user
    new_email = req.email.strip()
    existing = db.query(models.User).filter(models.User.email == new_email, models.User.id != user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Este correo ya está siendo usado por otro atleta.")
        
    user.email = new_email
    user.name = req.name.strip()
    if req.coach_id:
        user.coach_id = req.coach_id
    db.commit()
    
    profile = db.query(models.ClientProfile).filter(models.ClientProfile.user_id == user.id).first()
    if profile:
        start_time = time.time()
        profile.age = req.profile.age
        profile.weight = req.profile.weight
        profile.goal = req.profile.goal
        profile.control_date = req.profile.controlDate
        
        if req.isRenewal:
            profile.plan_type = req.profile.planType
            profile.start_date = req.profile.startDate
            profile.end_date = req.profile.endDate
            
            # Activar usuario si la fecha de fin es hoy o futura
            today = now_bogota().strftime("%Y-%m-%d")
            if profile.end_date >= today:
                user.is_active = True
            
        db.commit()
        print(f"PERF: save_client_profile DB commit took {time.time() - start_time:.4f}s")

        # No se registra peso aquí, se deja para cuando se publique una rutina (según instrucción del usuario)

    return {"status": "success", "message": "Atleta actualizado correctamente", "user_id": user.id}

@app.patch("/api/admin/users/{user_id}/status")
def update_user_status(user_id: int, req: UserStatusReq, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    # El Admin puede cambiar el estado de cualquiera. El Coach solo puede cambiar el de sus clientes.
    if current_user.role == "Coach" and user.coach_id != current_user.id:
         raise HTTPException(status_code=403, detail="No tiene permiso para cambiar el estado de este usuario")

    user.is_active = req.is_active
    db.commit()
    
    return {"status": "success", "message": "Estado de usuario actualizado", "is_active": bool(user.is_active)}

def record_weight_history(db: Session, user_id: int, weight: str, routine_id: Optional[int] = None, notes: Optional[str] = None):
    # Solo registrar si hay peso
    if not weight:
        return
    
    # Deduplicación: Si existe un registro idéntico en los últimos 2 minutos, lo aprovechamos
    two_min_ago = datetime.now() - timedelta(minutes=2)
    recent = db.query(models.WeightHistory).filter(
        models.WeightHistory.user_id == user_id,
        models.WeightHistory.created_at >= two_min_ago,
        models.WeightHistory.weight == weight
    ).order_by(models.WeightHistory.created_at.desc()).first()

    if recent:
        # Si recibimos datos de rutina, lo asociamos al registro existente
        if routine_id:
            recent.routine_id = routine_id
        # Si el nuevo registro es de "Rutina" y el anterior era de "Perfil", actualizamos la nota
        # Pero si el anterior era "Registro inicial", mantenemos esa nota que es más importante.
        if notes and "Rutina" in notes and "inicial" not in (recent.notes or ""):
            recent.notes = notes
        db.commit()
        return
    
    new_entry = models.WeightHistory(
        user_id=user_id,
        weight=weight,
        routine_id=routine_id,
        notes=notes
    )
    db.add(new_entry)
    db.commit()

@app.post("/api/coach/routines")
def save_routine(req: RoutineReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    if current_user.role == "Coach" and not current_user.is_active:
        raise HTTPException(status_code=403, detail="Su cuenta de coach está inactiva. Contacte al administrador.")

    start_time = time.time()
    client_user = db.query(models.User).filter(models.User.email == req.client_email).first()
    if not client_user:
        raise HTTPException(status_code=404, detail="Client not found. Register client profile first.")

    # Guardar en SQLite
    new_routine = models.Routine(user_id=client_user.id, routine_data=req.routine_data)
    db.add(new_routine)
    db.commit()
    db.refresh(new_routine)
    print(f"PERF: save_routine DB write took {time.time() - start_time:.4f}s")

    # Registrar peso en histórico asociado a esta rutina
    prof = client_user.profile
    if prof and prof.weight:
        weight_start = time.time()
        record_weight_history(db, client_user.id, prof.weight, routine_id=new_routine.id, notes="Actualización de Rutina")
        print(f"PERF: record_weight_history took {time.time() - weight_start:.4f}s")

    # Preparar datos analíticos para BigQuery
    bq_start = time.time()
    prof = client_user.profile
    bq_data = {
        "name": client_user.name,
        "id": getattr(client_user, 'id', ""),
        "goal": prof.goal if prof else "",
        "weight": prof.weight if prof else "",
        "planType": prof.plan_type if prof else "",
        "startDate": prof.start_date if prof else "",
        "endDate": prof.end_date if prof else "",
        "controlDate": prof.control_date if prof else ""
    }
    background_tasks.add_task(write_to_bigquery, bq_data.copy())
    print(f"PERF: BigQuery background task queueing took {time.time() - bq_start:.4f}s")

    return {"status": "success", "message": "Routine published and backed up to BigQuery"}

@app.post("/api/coach/publish-all")
def publish_all(req: PublishAllReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    if current_user.role == "Coach" and not current_user.is_active:
        raise HTTPException(status_code=403, detail="Su cuenta de coach está inactiva. Contacte al administrador.")

    overall_start = time.time()

    def get_plan_price(plan_type: str):
        prices = {
            "Mensual": 20000,
            "Dos Meses": 40000,
            "Trimestral": 60000,
            "Anual": 120000
        }
        return prices.get(plan_type, 20000)

    # 1. Actualizar Perfil (Lógica de save_client_profile integrada)
    user = db.query(models.User).filter(models.User.email == req.athlete.email).first()
    is_new_user = not user
    if is_new_user:
        user = models.User(email=req.athlete.email, name=req.athlete.name, role="Client", coach_id=current_user.id if current_user.role == "Coach" else req.athlete.coach_id)
        db.add(user)
        db.commit()
        db.refresh(user)
        profile = models.ClientProfile(user_id=user.id)
        db.add(profile)
    else:
        user.name = req.athlete.name
        if req.athlete.coach_id:
            user.coach_id = req.athlete.coach_id
        elif not user.coach_id and current_user.role == "Coach":
            user.coach_id = current_user.id
        profile = user.profile
        if not profile:
            profile = models.ClientProfile(user_id=user.id)
            db.add(profile)

    profile.age = req.athlete.profile.age
    profile.weight = req.athlete.profile.weight
    profile.goal = req.athlete.profile.goal
    profile.control_date = req.athlete.profile.controlDate
    
    if req.athlete.isRenewal:
        profile.plan_type = req.athlete.profile.planType
        profile.start_date = req.athlete.profile.startDate
        profile.end_date = req.athlete.profile.endDate
        today = datetime.now().strftime("%Y-%m-%d")
        if profile.end_date >= today:
            user.is_active = True

    new_routine = models.Routine(user_id=user.id, routine_data=req.routine_data)
    db.add(new_routine)

    # 2.5 Gestión de Pago (Solo si es nuevo o renovación)
    if is_new_user or req.athlete.isRenewal:
        payment = models.Payment(
            coach_id=current_user.id,
            client_id=user.id,
            client_name=user.name,
            amount=get_plan_price(req.athlete.profile.planType),
            plan_type=req.athlete.profile.planType,
            status="Pending"
        )
        db.add(payment)

    # 3. Notificación para el Atleta
    notif = models.Notification(
        user_id=user.id,
        message=f"Tu coach {current_user.name} ha actualizado tu rutina."
    )
    db.add(notif)
    
    # 4. Histórico de Peso
    if profile.weight:
        record_weight_history(db, user.id, profile.weight, routine_id=None, notes="Actualización Global")

    # Commit Único para todas las operaciones de DB
    db.commit()
    db.refresh(new_routine)
    
    # 4. Background Analytics
    bq_data = {
        "name": user.name,
        "id": user.id,
        "goal": profile.goal,
        "weight": profile.weight,
        "planType": profile.plan_type,
        "startDate": profile.start_date,
        "endDate": profile.end_date,
        "controlDate": profile.control_date
    }
    background_tasks.add_task(write_to_bigquery, bq_data.copy())
    
    print(f"PERF: Overall publish-all took {time.time() - overall_start:.4f}s")
    return {"status": "success", "message": "Todo guardado correctamente"}

@app.get("/api/coach/routine/{client_email}")
def get_client_routine_by_coach(client_email: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    client_user = db.query(models.User).filter(models.User.email == client_email).first()
    if not client_user:
        return {"status": "empty", "routine_data": None}
    routine = db.query(models.Routine).filter(models.Routine.user_id == client_user.id).order_by(models.Routine.created_at.desc()).first()
    if not routine:
        return {"status": "empty", "routine_data": None}
    return {"status": "success", "routine_data": routine.routine_data}

# ====================
# Client Endpoints
# ====================
@app.get("/api/client/my-routine")
def get_my_routine(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Fetch the latest routine
    routine = db.query(models.Routine).filter(models.Routine.user_id == current_user.id).order_by(models.Routine.created_at.desc()).first()
    
    if not routine:
        return {"status": "empty", "routine_data": None}
    
    prof = current_user.profile
    if prof and prof.end_date:
        today = datetime.now().strftime("%Y-%m-%d")
        if prof.end_date < today:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Su plan ha expirado. Por favor, comuníquese con su coach para renovar su acceso."
            )
    
    prof = current_user.profile
    profile_data = {
        "age": prof.age if prof else "",
        "weight": prof.weight if prof else "",
        "goal": prof.goal if prof else "",
        "planType": prof.plan_type if prof else "",
        "startDate": prof.start_date if prof else "",
        "endDate": prof.end_date if prof else "",
        "controlDate": prof.control_date if prof else ""
    }
    
    # Fetch assigned coach name
    coach_name = None
    if current_user.coach_id:
        coach = db.query(models.User).filter(models.User.id == current_user.coach_id).first()
        if coach:
            coach_name = coach.name

    return {
        "status": "success", 
        "routine_data": routine.routine_data,
        "coach_name": coach_name,
        "profile": profile_data
    }

@app.get("/api/client/weight-history")
def get_weight_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    history = db.query(models.WeightHistory)\
        .filter(models.WeightHistory.user_id == current_user.id)\
        .order_by(models.WeightHistory.created_at.desc())\
        .all()
    
    return [
        {
            "id": h.id,
            "weight": h.weight,
            "date": h.created_at.strftime("%Y-%m-%d %H:%M"),
            "notes": h.notes
        } for h in history
    ]

@app.get("/api/coach/list")
def get_coaches(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    # Solo el Admin debería poder ver y asignar coaches, pero permitimos el acceso para el dropdown
    coaches = db.query(models.User).filter(models.User.role == "Coach").all()
    return [{"id": c.id, "name": c.name, "email": c.email, "phone": c.phone, "instagram": c.instagram} for c in coaches]

# ====================
# Admin Coach Management
# ====================
@app.get("/api/admin/coaches")
def get_admin_coaches(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    coaches = db.query(models.User).filter(models.User.role == "Coach").all()
    return coaches

@app.post("/api/admin/coaches")
def create_coach(req: CoachCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    # Si el usuario ya existe, actualizamos su rol a Coach y sus datos
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if user:
        user.role = "Coach"
        user.name = req.name
        user.phone = req.phone
        user.instagram = req.instagram
        # Si estaba inactivo, lo activamos por defecto al registrarlo como coach? 
        # O mantenemos su estado? Por ahora lo mantenemos o forzamos True si es nuevo.
    else:
        user = models.User(
            email=req.email, 
            name=req.name, 
            role="Coach", 
            is_active=True,
            phone=req.phone,
            instagram=req.instagram
        )
        db.add(user)
    db.commit()
    return {"message": f"Coach {req.name} procesado correctamente"}

@app.delete("/api/admin/coaches/{coach_id}")
def delete_coach(coach_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    coach = db.query(models.User).filter(models.User.id == coach_id, models.User.role == "Coach").first()
    if not coach:
        raise HTTPException(status_code=404, detail="Coach no encontrado")
    
    # Lo bajamos a Cliente en lugar de borrarlo para mantener integridad referencial si tuviera clientes asociados
    coach.role = "Client"
    db.commit()
    return {"message": "Coach removido y convertido a cliente"}

# ====================
# NOTIFICACIONES
# ====================
@app.get("/api/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notifs = db.query(models.Notification)\
        .filter(models.Notification.user_id == current_user.id)\
        .order_by(models.Notification.created_at.desc())\
        .all()
    
    return [
        {
            "id": n.id,
            "message": n.message,
            "date": n.created_at.strftime("%d/%m/%Y %H:%M"),
            "is_read": n.is_read
        } for n in notifs
    ]

@app.delete("/api/notifications/{notif_id}")
def delete_notification(notif_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id, models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    db.delete(notif)
    db.commit()
    return {"message": "Notificación eliminada"}

# ====================
# PAGOS (COACH -> ADMIN)
# ====================
@app.get("/api/coach/payments")
def get_coach_payments(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    payments = db.query(models.Payment)\
        .filter(models.Payment.coach_id == current_user.id)\
        .order_by(models.Payment.created_at.desc())\
        .all()
    
    return [
        {
            "id": p.id,
            "client_name": p.client_name,
            "amount": p.amount,
            "plan_type": p.plan_type,
            "status": p.status,
            "date": p.created_at.strftime("%d/%m/%Y")
        } for p in payments
    ]

@app.post("/api/coach/payments/pay")
def pay_balance(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    batch_id = str(uuid.uuid4())
    db.query(models.Payment)\
        .filter(models.Payment.coach_id == current_user.id, models.Payment.status == "Pending")\
        .update({"status": "Paid", "batch_id": batch_id})
    db.commit()
    return {"message": "Saldo pagado exitosamente", "batch_id": batch_id}

# ====================
# ADMIN PAGOS
# ====================
@app.get("/api/admin/payments")
def get_admin_payments(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_admin)):
    payments = db.query(models.Payment).filter(models.Payment.status == "Paid").all()
    batches = {}
    for p in payments:
        bid = p.batch_id or "legacy"
        if bid not in batches:
            coach = db.query(models.User).filter(models.User.id == p.coach_id).first()
            batches[bid] = {
                "batch_id": bid,
                "coach_name": coach.name if coach else "Desconocido",
                "coach_id": p.coach_id,
                "date": p.created_at.strftime("%d/%m/%Y"),
                "total_amount": 0,
                "clients_count": 0,
                "clients": []
            }
        batches[bid]["total_amount"] += p.amount
        batches[bid]["clients_count"] += 1
        
        # Obtener detalles del cliente (perfil)
        client = db.query(models.User).filter(models.User.id == p.client_id).first()
        batches[bid]["clients"].append({
            "name": p.client_name,
            "plan_type": p.plan_type,
            "amount": p.amount,
            "start_date": client.profile.start_date if client and client.profile else "—",
            "end_date": client.profile.end_date if client and client.profile else "—"
        })
    
    return sorted(list(batches.values()), key=lambda x: x["date"], reverse=True)

@app.get("/")
def read_root():
    return {"message": "Body Logic API con SQLite, Auth y BigQuery"}
