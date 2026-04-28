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
        print(f"Verificación de planes completada. Usuarios desactivados: {deactivated_count}. Usuarios advertidos: {warning_count}.")

        # 3. Lógica de Cobro a Coaches (Corte Domingos 23:59)
        # Un coach queda inactivo si tiene pagos PENDIENTES creados antes del lunes actual.
        now = now_bogota()
        # Encontrar el inicio de la semana actual (lunes 00:00:00)
        monday_this_week = (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        
        coaches = db.query(models.User).filter(models.User.role == "Coach").all()
        for coach in coaches:
            # Buscar si tiene pagos pendientes de semanas anteriores
            past_pending = db.query(models.Payment).filter(
                models.Payment.coach_id == coach.id,
                models.Payment.status == "Pending",
                models.Payment.created_at < monday_this_week
            ).all()
            
            if past_pending:
                # 1. Inactivar Coach
                if coach.is_active:
                    coach.is_active = False
                    print(f"ALERTA: Coach {coach.name} desactivado por falta de pago (Plazo domingo 23:59 vencido).")
                
                # 2. Inactivar Clientes asociados a deudas viejas
                for p in past_pending:
                    client = db.query(models.User).filter(models.User.id == p.client_id).first()
                    if client and client.is_active:
                        client.is_active = False
                        print(f"ALERTA: Cliente {client.name} desactivado por falta de pago del coach ({coach.name}).")
            else:
                # Si no tiene deudas viejas, pero estaba inactivo por este motivo, ¿lo reactivamos?
                # Solo si su inactividad no fue manual por el admin. 
                # Por simplicidad, si no tiene deudas viejas, lo dejamos como esté o lo reactivamos si el admin no lo bloqueó.
                # Pero según el requerimiento, se reactiva al pagar. El endpoint de pago ya lo hace.
                pass
        
        db.commit()
        print("Verificación de pagos de coaches completada.")
        
    except Exception as e:
        print(f"Error general en el sistema de expiración: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    check_expirations()
