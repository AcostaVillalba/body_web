import uuid
import logging
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
import auth
from database_bq import get_bq_db
from services.wompi_service import WompiService
from services.bigquery_service import obtener_saldo_pendiente_coach, confirmar_pago_lote

logger = logging.getLogger(__name__)

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
    logger.info(f"Iniciando preparar_pago para el coach {current_user.email} (ID: {current_user.id})")
    try:
        # 1. Obtener el saldo pendiente
        saldo_pendiente = obtener_saldo_pendiente_coach(current_user.id)
        logger.info(f"Saldo pendiente obtenido para coach {current_user.id}: {saldo_pendiente} COP")
        if saldo_pendiente <= 0:
            logger.warning(f"preparar_pago falló: el coach {current_user.id} no tiene cobros pendientes.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No hay cobros pendientes registrados para pagar."
            )
        
        # 2. Generar identificador de lote (batch_id) único (estrictamente alfanumérico sin guiones)
        batch_id = f"batch{uuid.uuid4().hex}"
        logger.info(f"Lote de pago generado: {batch_id} para coach {current_user.id}")
        
        # 3. Asociar los cobros pendientes del coach a este lote en BigQuery
        db = get_bq_db()
        db.prepare_pending_payments_batch(current_user.id, batch_id)
        logger.info(f"Cobros pendientes asociados al lote {batch_id} en BigQuery")
        
        # 4. Generar firma (el widget de Wompi obtiene el token de aceptación de forma interna)
        wompi_service = WompiService()
        amount_in_cents = saldo_pendiente * 100
        signature = wompi_service.generar_firma_integridad(batch_id, amount_in_cents)
        logger.info(f"Firma de integridad generada para lote {batch_id}. Inicializando respuesta.")
        
        return PrepararPagoResponse(
            acceptance_token="",  # El widget de Wompi maneja esto internamente
            public_key=wompi_service.public_key or "",
            signature=signature,
            reference=batch_id,
            amount_in_cents=amount_in_cents,
            email=current_user.email,
            full_name=current_user.name
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado al preparar pago para coach {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al procesar la preparación del pago."
        )


@router.post("/webhook")
async def wompi_webhook(request: Request):
    """
    Webhook público para recibir notificaciones asíncronas de WOMPI.
    Cuando una transacción es aprobada, marca los cobros del lote como pagados.
    """
    logger.info("Recibida llamada POST al webhook de Wompi.")
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Error al decodificar JSON del webhook de Wompi: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON inválido."
        )
        
    logger.info(f"Payload de webhook recibido: {payload}")
    
    # Validar autenticidad del webhook mediante firma
    wompi_service = WompiService()
    if not wompi_service.verificar_firma_webhook(payload):
        logger.warning("Firma del webhook de Wompi no se pudo verificar o es inválida.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firma del webhook inválida."
        )
    
    event = payload.get("event")
    logger.info(f"Procesando evento de webhook Wompi: {event}")
    if event == "transaction.updated":
        transaction = payload.get("data", {}).get("transaction", {})
        transaction_id = transaction.get("id")
        transaction_status = transaction.get("status")
        reference = transaction.get("reference")
        amount = transaction.get("amount_in_cents")
        
        logger.info(f"Transacción {transaction_id} actualizada: estado={transaction_status}, referencia={reference}, monto={amount} centavos")
        
        if transaction_status == "APPROVED":
            if reference:
                logger.info(f"Confirmando lote de pago en base de datos para la referencia: {reference}")
                success = confirmar_pago_lote(reference)
                if success:
                    logger.info(f"Lote {reference} marcado como pagado exitosamente en BigQuery.")
                    return {"status": "success", "message": f"Lote {reference} procesado exitosamente."}
                else:
                    logger.error(f"Fallo al confirmar el lote {reference} en base de datos.")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Error interno al procesar el lote de pago en base de datos."
                      )
            else:
                logger.warning("Evento de transacción aprobada no contiene campo 'reference'.")
        else:
            logger.info(f"Transacción {transaction_id} en estado '{transaction_status}' (no APPROVED). Ignorando confirmación de lote.")
                    
    return {"status": "ignored", "message": "Evento o estado de transacción no procesable."}

@router.get("/transaccion/{transaccion_id}")
def obtener_transaccion(transaccion_id: str):
    """
    Consulta el estado de una transacción directamente en la API de WOMPI
    utilizando el ID de la transacción. Útil para que el frontend valide el estado
    inmediatamente después de la redirección.
    """
    logger.info(f"Recibida solicitud GET para consultar transacción: {transaccion_id}")
    wompi_service = WompiService()
    try:
        detalle = wompi_service.obtener_detalle_transaccion(transaccion_id)
        if not detalle:
            logger.warning(f"Transacción {transaccion_id} no se encontró en Wompi.")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transacción no encontrada en WOMPI."
            )
        
        status_wompi = detalle.get("status")
        reference = detalle.get("reference")
        logger.info(f"Transacción {transaccion_id} encontrada con estado: {status_wompi}")
        
        # Sincronización proactiva con la base de datos: si Wompi confirma que está aprobada,
        # marcamos el lote de cobros en BigQuery como pagados de inmediato, como respaldo al webhook.
        if status_wompi == "APPROVED" and reference:
            logger.info(f"Sincronizando base de datos proactivamente para la referencia: {reference}")
            confirmar_pago_lote(reference)
            
        return {
            "id": detalle.get("id"),
            "status": status_wompi,
            "amount_in_cents": detalle.get("amount_in_cents"),
            "reference": reference,
            "currency": detalle.get("currency"),
            "payment_method_type": detalle.get("payment_method_type")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al procesar la consulta de transacción {transaccion_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al consultar la transacción en WOMPI: {str(e)}"
        )


