import hashlib
import os
import requests
import logging

logger = logging.getLogger(__name__)

class WompiService:
    def __init__(self):
        # Intentamos obtener primero las nuevas variables de producción (GCP Secret Manager) y fallamos al valor anterior si no existen.
        self.secret_integridad = os.getenv("WOMPI_INTEGRITY_KEY") or os.getenv("WOMPI_INTEGRITY_SECRET")
        self.public_key = os.getenv("WOMPI_PUBLIC_KEY")
        self.events_secret = os.getenv("WOMPI_WEBHOOK_SECRET") or os.getenv("WOMPI_EVENTS_SECRET")
        self.private_key = os.getenv("WOMPI_PRIVATE_KEY")
        
        # Determinar base url automáticamente según prefijo de la llave pública
        if self.public_key and self.public_key.startswith("pub_prod_"):
            self.url_base = "https://production.wompi.co/v1"
            logger.info("WompiService inicializado en entorno de PRODUCCIÓN.")
        else:
            self.url_base = "https://sandbox.wompi.co/v1"
            logger.info("WompiService inicializado en entorno de SANDBOX.")

    def obtener_token_aceptacion(self) -> str:
        logger.info("Obteniendo token de aceptación pre-firmado de Wompi...")
        url = f"{self.url_base}/merchants/{self.public_key}"
        try:
            respuesta = requests.get(url, timeout=10).json()
            token = respuesta["data"]["presigned_acceptance"]["acceptance_token"]
            logger.info("Token de aceptación obtenido con éxito.")
            return token
        except Exception as e:
            logger.error(f"Error al obtener token de aceptación: {str(e)}", exc_info=True)
            raise

    def generar_firma_integridad(self, referencia: str, monto_centavos: int) -> str:
        logger.info(f"Generando firma de integridad para referencia: '{referencia}', monto: {monto_centavos} centavos")
        if not self.secret_integridad:
            logger.warning("WOMPI_INTEGRITY_KEY/SECRET no configurada. La firma de integridad podría ser inválida.")
        
        # Cadena requerida por Wompi: Referencia + Monto + Moneda + Secreto
        cadena_unida = f"{referencia}{monto_centavos}COP{self.secret_integridad}"
        hash_resultado = hashlib.sha256(cadena_unida.encode('utf-8'))
        return hash_resultado.hexdigest()

    def obtener_detalle_transaccion(self, transaccion_id: str) -> dict:
        logger.info(f"Consultando detalle de transacción {transaccion_id} en Wompi API...")
        url = f"{self.url_base}/transactions/{transaccion_id}"
        headers = {}
        if self.private_key:
            # Ocultamos la llave en los logs por seguridad, mostrando solo los primeros/últimos caracteres
            masked_key = f"{self.private_key[:8]}...{self.private_key[-4:]}" if len(self.private_key) > 12 else "***"
            logger.info(f"Usando llave privada para autenticación: {masked_key}")
            headers["Authorization"] = f"Bearer {self.private_key}"
        else:
            logger.warning("WOMPI_PRIVATE_KEY no está configurada. La consulta en producción podría fallar.")
        
        try:
            respuesta = requests.get(url, headers=headers, timeout=10)
            logger.info(f"Respuesta de Wompi API recibida. Código de estado: {respuesta.status_code}")
            datos = respuesta.json()
            if respuesta.status_code != 200:
                logger.error(f"Error de API Wompi para transaccion {transaccion_id}: {datos}")
            return datos.get("data", {})
        except Exception as e:
            logger.error(f"Excepción al consultar transacción {transaccion_id} en Wompi: {str(e)}", exc_info=True)
            return {}

    def verificar_firma_webhook(self, payload: dict) -> bool:
        """
        Verifica la autenticidad del webhook de WOMPI utilizando la firma provista.
        En entorno de pruebas, si la variable de secreto no está configurada,
        se omitirá la verificación y retornará True con un aviso en consola.
        """
        if not self.events_secret:
            logger.warning("WOMPI_WEBHOOK_SECRET/EVENTS_SECRET no configurada. Saltando verificación de firma del webhook en pruebas.")
            return True
            
        try:
            signature_obj = payload.get("signature", {})
            checksum = signature_obj.get("checksum")
            properties = signature_obj.get("properties", [])
            
            if not checksum or not properties:
                logger.warning(f"Webhook recibido sin estructura de firma válida: {signature_obj}")
                return False
                
            cadena_concatenar = ""
            for prop in properties:
                if prop == "timestamp":
                    val = payload.get("timestamp")
                elif prop.startswith("transaction."):
                    field = prop.split(".")[1]
                    val = payload.get("data", {}).get("transaction", {}).get(field)
                else:
                    val = payload.get(prop)
                
                if val is not None:
                    cadena_concatenar += str(val)
                    
            cadena_concatenar += self.events_secret
            hash_resultado = hashlib.sha256(cadena_concatenar.encode('utf-8')).hexdigest()
            
            coincide = (hash_resultado == checksum)
            if coincide:
                logger.info("Firma del webhook validada correctamente.")
            else:
                logger.error(f"Firma del webhook INVÁLIDA. Checksum recibido: {checksum}, calculado: {hash_resultado}")
            return coincide
        except Exception as e:
            logger.error(f"Error al verificar la firma del webhook: {str(e)}", exc_info=True)
            return False



