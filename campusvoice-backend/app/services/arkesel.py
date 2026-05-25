import httpx
from app.config import settings
from app.utils.phone import normalize_phone, chunk_list

ARKESEL_BASE_URL = "https://sms.arkesel.com/api/v2"

class ArkeselService:
    def __init__(self):
        self.api_key = settings.ARKESEL_API_KEY
        self.headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def _is_mock(self) -> bool:
        """
        Returns True if the API key is set to a placeholder, triggering sandbox/mock simulation.
        """
        return not self.api_key or self.api_key.startswith("mock")

    # =====================================================================
    # ASYNC METHODS (FastAPI / HTTP requests)
    # =====================================================================

    async def send_bulk(self, sender: str, message: str, recipients: list[str]) -> dict:
        """
        Asynchronously dispatches a bulk SMS to recipients.
        Automatically normalizes phones and chunks them in batches of 100.
        """
        normalized_recipients = [normalize_phone(r) for r in recipients if r]
        if not normalized_recipients:
            return {"status": "error", "message": "No valid recipients"}

        if self._is_mock():
            print(f"[MOCK SMS] Dispatching to {len(normalized_recipients)} phones from '{sender}': {message}")
            import uuid
            return {
                "code": "1000",
                "status": "success",
                "message": "Mock SMS dispatched successfully",
                "data": {"id": str(uuid.uuid4())}
            }

        batches = chunk_list(normalized_recipients, 100)
        last_response = {}

        async with httpx.AsyncClient() as client:
            for batch in batches:
                payload = {
                    "sender": sender,
                    "message": message,
                    "recipients": batch
                }
                response = await client.post(
                    f"{ARKESEL_BASE_URL}/sms/send",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                last_response = response.json()

        return last_response

    async def check_balance(self) -> dict:
        """
        Asynchronously retrieves the current SMS credit balance from Arkesel.
        """
        if self._is_mock():
            return {
                "status": "success",
                "data": {
                    "balance": 5000,
                    "currency": "GHS"
                }
            }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ARKESEL_BASE_URL}/clients/balance-details",
                headers=self.headers,
                timeout=15.0
            )
            response.raise_for_status()
            return response.json()

    async def get_delivery_report(self, message_id: str) -> dict:
        """
        Asynchronously retrieves the delivery report status for a specific message ID.
        """
        if self._is_mock():
            return {
                "status": "success",
                "data": {
                    "status": "delivered",
                    "recipient": "0241234567"
                }
            }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{ARKESEL_BASE_URL}/sms/{message_id}",
                headers=self.headers,
                timeout=15.0
            )
            response.raise_for_status()
            return response.json()

    # =====================================================================
    # SYNC METHODS (Celery Tasks / Sync workers)
    # =====================================================================

    def send_bulk_sync(self, sender: str, message: str, recipients: list[str]) -> dict:
        """
        Synchronously dispatches bulk SMS (used by Celery workers).
        """
        normalized_recipients = [normalize_phone(r) for r in recipients if r]
        if not normalized_recipients:
            return {"status": "error", "message": "No valid recipients"}

        if self._is_mock():
            print(f"[MOCK SYNC SMS] Dispatching to {len(normalized_recipients)} phones from '{sender}': {message}")
            import uuid
            return {
                "code": "1000",
                "status": "success",
                "message": "Mock SMS dispatched successfully",
                "data": {"id": str(uuid.uuid4())}
            }

        batches = chunk_list(normalized_recipients, 100)
        last_response = {}

        with httpx.Client() as client:
            for batch in batches:
                payload = {
                    "sender": sender,
                    "message": message,
                    "recipients": batch
                }
                response = client.post(
                    f"{ARKESEL_BASE_URL}/sms/send",
                    json=payload,
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()
                last_response = response.json()

        return last_response

    def check_balance_sync(self) -> dict:
        """
        Synchronously retrieves credit balance (used by Celery).
        """
        if self._is_mock():
            return {"status": "success", "data": {"balance": 5000, "currency": "GHS"}}

        with httpx.Client() as client:
            response = client.get(
                f"{ARKESEL_BASE_URL}/clients/balance-details",
                headers=self.headers,
                timeout=15.0
            )
            response.raise_for_status()
            return response.json()

    def get_delivery_report_sync(self, message_id: str) -> dict:
        """
        Synchronously retrieves the delivery status (used by Celery).
        """
        if self._is_mock():
            import random
            statuses = ["delivered", "delivered", "delivered", "failed", "undelivered"]
            # Simulate high delivery rate
            simulated_status = random.choice(statuses)
            return {
                "status": "success",
                "data": {
                    "status": simulated_status,
                    "recipient": "0241234567"
                }
            }

        with httpx.Client() as client:
            response = client.get(
                f"{ARKESEL_BASE_URL}/sms/{message_id}",
                headers=self.headers,
                timeout=15.0
            )
            response.raise_for_status()
            return response.json()

arkesel = ArkeselService()
