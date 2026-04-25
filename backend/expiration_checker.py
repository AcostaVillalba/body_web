import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

BOGOTA_TZ = timezone(timedelta(hours=-5))

def now_bogota() -> datetime:
    """Retorna la fecha/hora actual en zona horaria de Colombia (UTC-5)."""
    return datetime.now(tz=BOGOTA_TZ)

def check_expirations():
    print(f"[{now_bogota()}] Iniciando verificación de expiración de planes...")
    db = SessionLocal()
    try:
        today_str = now_bogota().strftime("%Y-%m-%d")
        today = datetime.strptime(today_str, "%Y-%m-%d")
        
        # Obtener todos los perfiles con fecha de fin
        profiles = db.query(models.ClientProfile).all()
        deactivated_count = 0
        warning_count = 0
        
        for profile in profiles:
            if not profile.end_date:
                continue
            
            try:
                end_date = datetime.strptime(profile.end_date, "%Y-%m-%d")
                user = profile.user
                
                # 1. Lógica de Desactivación: Si ya expiró
                if end_date < today:
                    if user.is_active:
                        user.is_active = False
                        deactivated_count += 1
                        print(f"ALERTA: Plan expirado para {user.name} ({user.email}). Estado cambiado a INACTIVO.")
                
                # 2. Lógica de Notificación (Simulada/Log): Si expira pronto (ej. en 3 días)
                elif (end_date - today).days <= 3:
                    if user.is_active:
                        warning_count += 1
                        print(f"NOTIFICACIÓN: El plan de {user.name} ({user.email}) expira en {(end_date - today).days} días ({profile.end_date}).")
                        
            except ValueError as e:
                print(f"Error procesando fecha para usuario {profile.user_id}: {e}")
        
        db.commit()
        print(f"Verificación completada. Usuarios desactivados: {deactivated_count}. Usuarios advertidos: {warning_count}.")
        
    except Exception as e:
        print(f"Error general en el sistema de expiración: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_expirations()
