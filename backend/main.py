from fastapi import FastAPI, BackgroundTasks, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import os
from google.cloud import bigquery
from google.oauth2 import service_account
from sqlalchemy.orm import Session

# Database and Auth imports
from database import engine, get_db
import models
import auth

# Create DB Tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="BodyByJA Internal Server")

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

def get_bigquery_client():
    if os.path.exists(CREDENTIALS_PATH):
        credentials = service_account.Credentials.from_service_account_file(CREDENTIALS_PATH)
        return bigquery.Client(credentials=credentials, project=PROJECT_ID)
    return None

def write_to_bigquery(data: dict):
    client = get_bigquery_client()
    if not client:
        return
    table_id = f"{PROJECT_ID}.{DATASET_ID}.{TABLE_ID}"
    data["timestamp"] = datetime.now().isoformat()
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

class ClientDataReq(BaseModel):
    email: str
    name: str
    profile: ClientProfileBase
    isRenewal: Optional[bool] = False

class UserStatusReq(BaseModel):
    is_active: bool

class RoutineReq(BaseModel):
    client_email: str
    routine_data: str # JSON string of the whole routine

# ====================
# Auth Endpoints
# ====================
@app.post("/api/auth/google")
def google_auth(req: TokenReq, db: Session = Depends(get_db)):
    idinfo = auth.verify_google_token(req.token)
    email = idinfo.get("email")
    name = idinfo.get("name")
    
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
        # Si el usuario ya existía pero su rol debe ser Admin o Coach, se lo actualizamos
        if user.role != expected_role and expected_role != "Client":
            user.role = expected_role
            db.commit()
            db.refresh(user)
            
        # Opcionalmente, si le quitamos el permiso de admin/coach lo bajamos a client:
        if expected_role == "Client" and user.role in ["Admin", "Coach"]:
            user.role = "Client"
            db.commit()
            db.refresh(user)

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "name": user.name, "email": user.email, "is_active": bool(user.is_active)}


# ====================
# Coach Endpoints
# ====================
@app.get("/api/coach/clients")
def get_clients(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    users = db.query(models.User).filter(models.User.role == "Client").all()
    results = []
    for u in users:
        prof = u.profile
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
            "is_active": bool(u.is_active)
        })
    return results

@app.post("/api/coach/clients")
def save_client_profile(req: ClientDataReq, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        user = models.User(email=req.email, name=req.name, role="Client")
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.name = req.name
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

    db.commit()

    # Registrar en histórico SOLO si es un nuevo atleta o si no hay registros previos
    if is_new_profile:
        record_weight_history(db, user.id, req.profile.weight, notes="Registro inicial del atleta")

    return {"status": "success", "message": "Atleta registrado en DB", "user_id": user.id}

@app.put("/api/coach/clients/{user_id}")
def update_client_profile(user_id: int, req: ClientDataReq, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
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
    db.commit()
    
    profile = db.query(models.ClientProfile).filter(models.ClientProfile.user_id == user.id).first()
    if profile:
        profile.age = req.profile.age
        profile.weight = req.profile.weight
        profile.goal = req.profile.goal
        profile.control_date = req.profile.controlDate
        
        if req.isRenewal:
            profile.plan_type = req.profile.planType
            profile.start_date = req.profile.startDate
            profile.end_date = req.profile.endDate
            
        db.commit()

        # No se registra peso aquí, se deja para cuando se publique una rutina (según instrucción del usuario)

    return {"status": "success", "message": "Atleta actualizado correctamente", "user_id": user.id}

@app.patch("/api/admin/users/{user_id}/status")
def update_user_status(user_id: int, req: UserStatusReq, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_coach)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
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
    client_user = db.query(models.User).filter(models.User.email == req.client_email).first()
    if not client_user:
        raise HTTPException(status_code=404, detail="Client not found. Register client profile first.")

    # Guardar en SQLite
    new_routine = models.Routine(user_id=client_user.id, routine_data=req.routine_data)
    db.add(new_routine)
    db.commit()
    db.refresh(new_routine)

    # Registrar peso en histórico asociado a esta rutina
    prof = client_user.profile
    if prof and prof.weight:
        record_weight_history(db, client_user.id, prof.weight, routine_id=new_routine.id, notes="Actualización de Rutina")

    # Preparar datos analíticos para BigQuery
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

    return {"status": "success", "message": "Routine published and backed up to BigQuery"}

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
    profile_data = {
        "age": prof.age if prof else "",
        "weight": prof.weight if prof else "",
        "goal": prof.goal if prof else "",
        "planType": prof.plan_type if prof else "",
        "startDate": prof.start_date if prof else "",
        "endDate": prof.end_date if prof else "",
        "controlDate": prof.control_date if prof else ""
    }
    
    return {
        "status": "success", 
        "routine_data": routine.routine_data,
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

@app.get("/")
def read_root():
    return {"message": "BodyByJA API con SQLite, Auth y BigQuery"}
