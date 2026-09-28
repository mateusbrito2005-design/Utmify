from typing import Any, Dict, Optional
import logging
from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.transaction import TransactionStatus, PaymentPlatform

logger = logging.getLogger(__name__)

# A Cakto identifica o tipo de evento pelo campo "event" (ex: purchase_approved,
# pix_gerado, chargeback...). Às vezes também repete um "status" equivalente
# dentro de "data" (ex: "paid"). Normalizamos ambos para o mesmo mapa.
_STATUS_MAP = {
    "PURCHASE_APPROVED": TransactionStatus.APPROVED,
    "PAID": TransactionStatus.APPROVED,
    "APPROVED": TransactionStatus.APPROVED,
    "SUBSCRIPTION_CREATED": TransactionStatus.APPROVED,
    "SUBSCRIPTION_RENEWED": TransactionStatus.APPROVED,

    "PURCHASE_REFUSED": TransactionStatus.PENDING,
    "REFUSED": TransactionStatus.PENDING,
    "SUBSCRIPTION_RENEWAL_REFUSED": TransactionStatus.PENDING,

    "REFUND": TransactionStatus.REFUNDED,
    "REFUNDED": TransactionStatus.REFUNDED,

    "CHARGEBACK": TransactionStatus.CHARGEBACK,
    "CHARGEDBACK": TransactionStatus.CHARGEBACK,

    "WAITING_PAYMENT": TransactionStatus.PENDING,
    "PENDING": TransactionStatus.PENDING,
    "PIX_GERADO": TransactionStatus.PENDING,
    "BOLETO_GERADO": TransactionStatus.PENDING,
    "PICPAY_GERADO": TransactionStatus.PENDING,
    "OPENFINANCE_NUBANK_GERADO": TransactionStatus.PENDING,
    "INITIATE_CHECKOUT": TransactionStatus.PENDING,
    "CHECKOUT_ABANDONMENT": TransactionStatus.PENDING,
    "ABANDONED_CART": TransactionStatus.PENDING,
    "SUBSCRIPTION_CANCELED": TransactionStatus.PENDING,
}

# Estado semântico usado em original_status/payment_status para alimentar a
# classificação de recovery (recovery_helper.classify_recovery_type), que
# procura por substrings como "waiting" e "refused" ou o valor "abandoned".
_SEMANTIC_STATE = {
    "PURCHASE_APPROVED": "paid",
    "PAID": "paid",
    "APPROVED": "paid",
    "SUBSCRIPTION_CREATED": "paid",
    "SUBSCRIPTION_RENEWED": "paid",

    "PURCHASE_REFUSED": "refused",
    "REFUSED": "refused",
    "SUBSCRIPTION_RENEWAL_REFUSED": "refused",

    "REFUND": "refunded",
    "REFUNDED": "refunded",
    "CHARGEBACK": "chargeback",
    "CHARGEDBACK": "chargeback",

    "WAITING_PAYMENT": "waiting_payment",
    "PENDING": "waiting_payment",
    "PIX_GERADO": "waiting_payment",
    "BOLETO_GERADO": "waiting_payment",
    "PICPAY_GERADO": "waiting_payment",
    "OPENFINANCE_NUBANK_GERADO": "waiting_payment",

    "INITIATE_CHECKOUT": "abandoned",
    "CHECKOUT_ABANDONMENT": "abandoned",
    "ABANDONED_CART": "abandoned",
    "SUBSCRIPTION_CANCELED": "canceled",
}

_PAYMENT_METHOD_BY_EVENT = {
    "PIX_GERADO": "pix",
    "BOLETO_GERADO": "boleto",
    "PICPAY_GERADO": "picpay",
    "OPENFINANCE_NUBANK_GERADO": "openfinance_nubank",
}


def _normalize_key(raw: Optional[str]) -> str:
    return (raw or "").strip().upper().replace("-", "_").replace(" ", "_")


def _map_status(event_key: str, data_status_key: str) -> TransactionStatus:
    if event_key in _STATUS_MAP:
        return _STATUS_MAP[event_key]
    return _STATUS_MAP.get(data_status_key, TransactionStatus.PENDING)


def _semantic_state(event_key: str, data_status_key: str) -> str:
    if event_key in _SEMANTIC_STATE:
        return _SEMANTIC_STATE[event_key]
    return _SEMANTIC_STATE.get(data_status_key, "")


def _normalize_payment_method(raw: Optional[str]) -> str:
    if not raw:
        return ""
    s = raw.lower()
    if "pix" in s:
        return "pix"
    if "credit" in s or "cartao" in s or "card" in s:
        return "credit_card"
    if "boleto" in s or "slip" in s:
        return "boleto"
    if "picpay" in s:
        return "picpay"
    if "nubank" in s:
        return "openfinance_nubank"
    return s


def parse_cakto_webhook(payload: Dict[str, Any]) -> Optional[StandardizedWebhookEvent]:
    """
    Parseia o payload bruto da Cakto e retorna o formato padronizado.

    Formato: { "event": "purchase_approved", "secret": "...", "data": {...} }.
    Eventos de compra/assinatura (purchase_approved, purchase_refused,
    pix_gerado, boleto_gerado, picpay_gerado, openfinance_nubank_gerado,
    chargeback, refund, subscription_*) trazem "data.customer" aninhado
    ({name, email, phone, docNumber}) e "data.id" como identificador estável
    ao longo de todo o ciclo de vida da transação (o mesmo id se repete do
    pix_gerado até o purchase_approved).

    Eventos de checkout (initiate_checkout, checkout_abandonment) não têm
    "data.id" (ainda não existe cobrança) e usam campos de cliente no nível
    raiz do data ({customerName, customerEmail, customerCellphone}).

    UTMs (utm_source/utm_medium/utm_campaign/utm_content/utm_term) e o par
    src/sck de rastreamento de click_id vêm soltos, direto em "data".
    """
    try:
        event_name = str(payload.get("event", ""))
        event_key = _normalize_key(event_name)

        data = payload.get("data")
        if not isinstance(data, dict):
            data = {}

        data_status_key = _normalize_key(str(data.get("status", "")))
        status = _map_status(event_key, data_status_key)
        semantic_state = _semantic_state(event_key, data_status_key)

        customer = data.get("customer")
        if not isinstance(customer, dict):
            customer = {}

        customer_email = (
            customer.get("email")
            or data.get("customerEmail")
            or ""
        )
        if not customer_email:
            # StandardizedWebhookEvent exige e-mail válido; sem ele não há
            # como conciliar o cliente, então descartamos o evento.
            logger.info(f"Webhook da Cakto ignorado ({event_name}): sem e-mail do cliente")
            return None

        customer_name = customer.get("name") or data.get("customerName") or ""
        customer_phone = (
            customer.get("phone")
            or data.get("customerCellphone")
            or data.get("customerPhone")
            or ""
        )
        customer_cpf = customer.get("docNumber") or customer.get("document") or ""

        offer = data.get("offer")
        if not isinstance(offer, dict):
            offer = {}
        product = data.get("product")
        if not isinstance(product, dict):
            product = {}

        amount = data.get("amount")
        if amount is None:
            amount = data.get("baseAmount")
        if amount is None:
            amount = offer.get("price")
        amount = float(amount) if amount is not None else 0.0

        product_name = product.get("name") or offer.get("name") or ""
        product_external_id = str(product.get("id") or offer.get("id") or "")

        payment_method = _normalize_payment_method(
            data.get("paymentMethod") or _PAYMENT_METHOD_BY_EVENT.get(event_key, "")
        )

        # data.id é o identificador estável da cobrança (permanece o mesmo do
        # pix_gerado até o purchase_approved). Eventos de checkout, que
        # acontecem antes de existir uma cobrança, não têm esse id — geramos
        # um identificador sintético e estável por oferta+e-mail para evitar
        # colidir com o external_id (único) de uma compra real.
        external_id = data.get("id") or data.get("transaction_id") or data.get("order_id")
        if not external_id:
            external_id = f"cakto_checkout_{product_external_id}_{customer_email}"

        order_bumps_raw = data.get("orderBumps")
        order_bumps = order_bumps_raw if isinstance(order_bumps_raw, list) else []

        return StandardizedWebhookEvent(
            external_id=str(external_id),
            platform=PaymentPlatform.CAKTO,
            status=status,
            amount=amount,
            original_status=semantic_state or event_name.lower(),
            payment_method=payment_method,
            payment_status=semantic_state or event_name.lower(),
            product_external_id=product_external_id,
            product_name=product_name,
            product_price=float(offer.get("price")) if offer.get("price") is not None else amount,
            customer_email=customer_email,
            customer_name=customer_name,
            customer_cpf=customer_cpf,
            customer_phone=customer_phone,
            utm_source=data.get("utm_source"),
            utm_medium=data.get("utm_medium"),
            utm_campaign=data.get("utm_campaign"),
            utm_content=data.get("utm_content"),
            utm_term=data.get("utm_term"),
            src=data.get("src") or data.get("sck"),
            checkout_url=data.get("checkoutUrl"),
            order_bumps=order_bumps,
        )
    except Exception as e:
        logger.error(f"Erro ao parsear webhook da Cakto: {e}", exc_info=True)
        return None
