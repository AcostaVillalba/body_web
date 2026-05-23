import hashlib
import os
import requests

class WompiService:
    def __init__(self):
        self.secret_integridad = os.getenv("WOMPI_INTEGRITY_SECRET")
        self.public_key = os.getenv("WOMPI_PUBLIC_KEY")
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


