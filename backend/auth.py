import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.oauth2 import id_token
from google.auth.transport import requests

# Load and strictly validate environment variables
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY or SECRET_KEY.strip() == "" or SECRET_KEY == "SUPER_SECRET_BODYLOGIC_KEY_CHANGE_ME":
    raise RuntimeError("SECRET_KEY environment variable is missing, empty, or using the default insecure value.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Google OAuth Client ID
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID.strip() == "" or GOOGLE_CLIENT_ID == "YOUR_GOOGLE_CLIENT_ID_HERE":
    raise RuntimeError("GOOGLE_CLIENT_ID environment variable is missing, empty, or using the default value.")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_google_token(token: str):
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

from database_bq import get_bq_db, now_bogota

# ... (código previo)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    db = get_bq_db()
    user_dict = db.get_user_by_email(email)
    if user_dict is None:
        raise credentials_exception
    
    # Convert dict to an object-like structure if needed, or just use dict
    # FastAPI usually expects an object, but we can pass a Bunch/SimpleNamespace
    from types import SimpleNamespace
    user = SimpleNamespace(**user_dict)
    
    # Ensure terms properties exist on user
    if not hasattr(user, "terms_accepted") or user.terms_accepted is None:
        user.terms_accepted = False
    if not hasattr(user, "terms_accepted_at"):
        user.terms_accepted_at = None
    if not hasattr(user, "terms_version"):
        user.terms_version = None
    
    # El bloqueo de "plan expirado" solo aplica a Clientes. 
    # Admins y Coaches siempre deben poder entrar.
    if user.role == "Client":
        is_active = bool(getattr(user, "is_active", True))
        end_date_str = getattr(user, "end_date", None)
        if end_date_str:
            if hasattr(end_date_str, 'strftime'):
                end_date_str = end_date_str.strftime("%Y-%m-%d")
            today = now_bogota().strftime("%Y-%m-%d")
            if end_date_str < today:
                is_active = False
        
        if not is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Su plan ha expirado. Por favor, comuníquese con su coach para renovar su acceso."
            )
        
    return user

async def get_current_active_coach(current_user: any = Depends(get_current_user)):
    if current_user.role not in ["Coach", "Admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

async def get_current_active_admin(current_user: any = Depends(get_current_user)):
    if current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
