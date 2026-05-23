import hashlib
import os
import requests

class WompiService:
    def __init__(self):
        self.secret_integridad = os.getenv("WOMPI_INTEGRITY_SECRET")
        self.public_key = os.getenv("WOMPI_PUBLIC_KEY")
        self.events_secret = os.getenv("WOMPI_EVENTS_SECRET")
        self.url_base = "https://sandbox.wompi.co/v1"

    def obtener_token_aceptacion(self) -> str:
        url = f"{self.url_base}/merchants/{self.public_key}"
        respuesta = requests.get(url).json()
        return respuesta["data"]["presigned_acceptance"]["acceptance_token"]

    def generar_firma_integridad(self, referencia: str, monto_centavos: int) -> str:
        # Cadena requerida por Wompi: Referencia + Monto + Moneda + Secreto
        cadena_unida = f"{referencia}{monto_centavos}COP{self.secret_integridad}"
        hash_resultado = hashlib.sha256(cadena_unida.encode('utf-8'))
        return hash_resultado.hexdigest()

    def obtener_detalle_transaccion(self, transaccion_id: str) -> dict:
        url = f"{self.url_base}/transactions/{transaccion_id}"
        respuesta = requests.get(url).json()
        return respuesta.get("data", {})

    def verificar_firma_webhook(self, payload: dict) -> bool:
        """
        Verifica la autenticidad del webhook de WOMPI utilizando la firma provista.
        En entorno de pruebas, si la variable WOMPI_EVENTS_SECRET no está configurada,
        se omitirá la verificación y retornará True con un aviso en consola.
        """
        if not self.events_secret:
            print("WARNING: WOMPI_EVENTS_SECRET no configurada. Saltando verificación de firma del webhook en pruebas.")
            return True
            
        try:
            signature_obj = payload.get("signature", {})
            checksum = signature_obj.get("checksum")
            properties = signature_obj.get("properties", [])
            
            if not checksum or not properties:
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
            
            return hash_resultado == checksum
        except Exception as e:
            print(f"Error al verificar la firma del webhook: {str(e)}")
            return False


