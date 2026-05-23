import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
import auth
from database_bq import get_bq_db
from services.wompi_service import WompiService
from services.bigquery_service import obtener_saldo_pendiente_coach, confirmar_pago_lote

router = APIRouter()

class PrepararPagoResponse(BaseModel):
    acceptance_token: str
    public_key: str
    signature: str
    reference: str
    amount_in_cents: int
    email: str
    full_name: str
    currency: str = "COP"


@router.post("/preparar-pago", response_model=PrepararPagoResponse)
def preparar_pago(current_user=Depends(auth.get_current_active_coach)):
    """
    Endpoint para coaches. Consulta el saldo pendiente de sus atletas, 
    agrupa los cobros en un lote (batch_id), genera la firma de integridad de la transacción 
    y retorna los datos necesarios para inicializar el widget de pago en el frontend.
    """
    # 1. Obtener el saldo pendiente
    saldo_pendiente = obtener_saldo_pendiente_coach(current_user.id)
    if saldo_pendiente <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No hay cobros pendientes registrados para pagar."
        )
    
    # 2. Generar identificador de lote (batch_id) único (estrictamente alfanumérico sin guiones)
    batch_id = f"batch{uuid.uuid4().hex}"

    
    # 3. Asociar los cobros pendientes del coach a este lote en BigQuery
    db = get_bq_db()
    db.prepare_pending_payments_batch(current_user.id, batch_id)
    
    # 4. Generar firma (el widget de Wompi obtiene el token de aceptación de forma interna)
    wompi_service = WompiService()
    amount_in_cents = saldo_pendiente * 100
    signature = wompi_service.generar_firma_integridad(batch_id, amount_in_cents)
    
    return PrepararPagoResponse(
        acceptance_token="",  # El widget de Wompi maneja esto internamente
        public_key=wompi_service.public_key or "",
        signature=signature,
        reference=batch_id,
        amount_in_cents=amount_in_cents,
        email=current_user.email,
        full_name=current_user.name
    )


@router.post("/webhook")
async def wompi_webhook(request: Request):
    """
    Webhook público para recibir notificaciones asíncronas de WOMPI.
    Cuando una transacción es aprobada, marca los cobros del lote como pagados.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON inválido."
        )
        
    print(f"DEBUG: Webhook WOMPI recibido: {payload}")
    
    # Validar autenticidad del webhook mediante firma
    wompi_service = WompiService()
    if not wompi_service.verificar_firma_webhook(payload):
        print("WARNING: Webhook de WOMPI recibido con firma inválida o no verificable.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firma del webhook inválida."
        )
    
    event = payload.get("event")
    if event == "transaction.updated":
        transaction = payload.get("data", {}).get("transaction", {})
        transaction_status = transaction.get("status")
        
        if transaction_status == "APPROVED":
            reference = transaction.get("reference")
            if reference:
                success = confirmar_pago_lote(reference)
                if success:
                    return {"status": "success", "message": f"Lote {reference} procesado exitosamente."}
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Error interno al procesar el lote de pago en base de datos."
                    )
                    
    return {"status": "ignored", "message": "Evento o estado de transacción no procesable."}

@router.get("/transaccion/{transaccion_id}")
def obtener_transaccion(transaccion_id: str):
    """
    Consulta el estado de una transacción directamente en la API de WOMPI
    utilizando el ID de la transacción. Útil para que el frontend valide el estado
    inmediatamente después de la redirección.
    """
    wompi_service = WompiService()
    try:
        detalle = wompi_service.obtener_detalle_transaccion(transaccion_id)
        if not detalle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transacción no encontrada en WOMPI."
            )
        return {
            "id": detalle.get("id"),
            "status": detalle.get("status"),
            "amount_in_cents": detalle.get("amount_in_cents"),
            "reference": detalle.get("reference"),
            "currency": detalle.get("currency"),
            "payment_method_type": detalle.get("payment_method_type")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar la transacción en WOMPI: {str(e)}"
        )

