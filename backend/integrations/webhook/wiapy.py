from typing import Any, Dict, Optional
import logging
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)


def _map_status(payment_status: str) -> TransactionStatus:
    status = (payment_status or "").lower()
    if status == "paid" or "approved" in status:
        return TransactionStatus.APPROVED
    if status == "refunded":
        return TransactionStatus.REFUNDED
    if status == "chargeback":
        return TransactionStatus.CHARGEBACK
    return TransactionStatus.PENDING


def parse_wiapy_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """
    Parseia o payload bruto da Wiapy e retorna o formato padronizado.

    Formato do payload: { payment: { id, status, amount (em centavos),
    payment_method, ... }, customer: { name, email, ... },
    checkout: { id, title, amount }, products: [...], tracking: { src, sck,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term } }.
    "tracking.src"/"tracking.sck" carregam o click_id repassado pelo link
    de rastreamento (mesma convenção usada pela Hotmart/Kiwify).
    """
    try:
        payment = payload.get("payment") or {}
        customer = payload.get("customer") or {}
        checkout = payload.get("checkout") or {}
        products = payload.get("products") or []
        tracking = payload.get("tracking") or {}
        if not isinstance(tracking, dict):
            tracking = {}

        payment_status = str(payment.get("status", ""))
        status = _map_status(payment_status)

        amount_cents = payment.get("amount", checkout.get("amount", 0)) or 0
        amount = float(amount_cents) / 100.0

        product_name = checkout.get("title") or (products[0].get("name") if products else "")

        customer_email = customer.get("email") or ""
        if not customer_email:
            # StandardizedWebhookEvent exige e-mail válido; sem ele não há
            # como conciliar o cliente, então descartamos o evento.
            logger.info("Webhook da Wiapy ignorado: sem e-mail do cliente")
            return None

        return StandardizedWebhookEvent(
            external_id=str(payment.get("id") or checkout.get("id") or ""),
            platform=PaymentPlatform.WIAPY,
            status=status,
            amount=amount,
            original_status=payment_status,
            payment_method=payment.get("payment_method", ""),
            payment_status=payment_status,
            product_external_id=str(checkout.get("id", "")),
            product_name=product_name or "",
            product_price=amount,
            customer_email=customer_email,
            customer_name=customer.get("name", ""),
            customer_cpf=customer.get("document", ""),
            customer_phone=customer.get("mobile_phone", ""),
            utm_source=tracking.get("utm_source"),
            utm_medium=tracking.get("utm_medium"),
            utm_campaign=tracking.get("utm_campaign"),
            utm_content=tracking.get("utm_content"),
            utm_term=tracking.get("utm_term"),
            src=tracking.get("src") or tracking.get("sck"),
            checkout_url=None,
            order_bumps=[],
        )
    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Wiapy: {e}", exc_info=True)
        return None
