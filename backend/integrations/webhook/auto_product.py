"""
Auto-criação de produtos a partir de dados do webhook.

Quando um webhook chega, verificamos se o produto já existe.
Se não existir, criamos automaticamente com os dados recebidos.
Se existir, garantimos que o alias (nome completo) está registrado.

Regra do "|":
  Nome recebido: "Produto X | Ticket 247"
  Nome base:     "Produto X"
  Se "Produto X" já existe → pula criação, mas garante alias do nome completo.
  Se não existe → cria "Produto X" + alias do nome completo.
"""
import logging
from sqlalchemy.orm import Session

from integrations.webhook.schemas import StandardizedWebhookEvent
from database.models.product import Product
from database.models.product_alias import ProductAlias
from database.models.product_items import Checkout, CheckoutPlatform
from database.models.transaction import PaymentPlatform

logger = logging.getLogger(__name__)


# ── Mapeamento de plataformas ────────────────────────────────
# PaymentPlatform (webhook) → CheckoutPlatform (checkout)
# Extensível: ao adicionar nova plataforma, só precisa adicionar aqui.
PLATFORM_MAP: dict[PaymentPlatform, CheckoutPlatform | None] = {
    PaymentPlatform.KIWIFY: CheckoutPlatform.KIWIFY,
    PaymentPlatform.PAYT: CheckoutPlatform.PAYT,
    PaymentPlatform.API: None,  # API direta não tem checkout
}


def extract_base_name(full_name: str) -> str:
    """
    Extrai o nome base do produto (antes do "|").
    Ex: "Produto X | Ticket 247" → "Produto X"
    Ex: "Produto Y" → "Produto Y"
    """
    if "|" in full_name:
        return full_name.split("|")[0].strip()
    return full_name.strip()


def _find_product_by_name(db: Session, name: str) -> Product | None:
    """Busca produto pelo nome exato (case-sensitive)."""
    return db.query(Product).filter(Product.name == name).first()


def _find_product_by_alias(db: Session, alias: str) -> Product | None:
    """Busca produto que tenha esse alias cadastrado."""
    pa = db.query(ProductAlias).filter(ProductAlias.alias == alias).first()
    if pa:
        return db.query(Product).filter(Product.id == pa.product_id).first()
    return None


def _alias_exists(db: Session, product_id: int, alias: str) -> bool:
    """Verifica se o alias já está cadastrado naquele produto."""
    return db.query(ProductAlias).filter(
        ProductAlias.product_id == product_id,
        ProductAlias.alias == alias,
    ).first() is not None


def _create_alias(db: Session, product_id: int, alias: str):
    """Cria um alias para o produto."""
    new_alias = ProductAlias(product_id=product_id, alias=alias)
    db.add(new_alias)
    logger.info(f"Auto-alias criado: '{alias}' → produto #{product_id}")


def _create_checkout_from_event(
    db: Session, product_id: int, event: StandardizedWebhookEvent
):
    """
    Cria um checkout vinculado ao produto a partir dos dados do webhook.
    Cada plataforma tem seu formato de checkout_url:
      - Kiwify: "https://pay.kiwify.com.br/{checkout_link}"
      - PayT: URL completa no campo checkout_url
    """
    checkout_platform = PLATFORM_MAP.get(event.platform)
    if not checkout_platform:
        return

    checkout_url = event.checkout_url or ""
    checkout_code = None

    # PayT envia checkout_code no campo product_external_id
    if checkout_platform == CheckoutPlatform.PAYT and event.product_external_id:
        checkout_code = event.product_external_id

    # Verificar se já existe checkout com a mesma URL (evita duplicatas)
    if checkout_url:
        existing = db.query(Checkout).filter(
            Checkout.product_id == product_id,
            Checkout.url == checkout_url,
        ).first()
        if existing:
            return

    checkout = Checkout(
        product_id=product_id,
        url=checkout_url,
        price=event.product_price,
        platform=checkout_platform,
        checkout_code=checkout_code,
    )
    db.add(checkout)
    logger.info(
        f"Auto-checkout criado: {checkout_platform.value} | "
        f"Produto #{product_id} | Preço: {event.product_price}"
    )


def ensure_product_from_webhook(
    db: Session, event: StandardizedWebhookEvent
) -> Product | None:
    """
    Garante que o produto do webhook existe no sistema.
    Retorna o Product encontrado ou criado, ou None se não há dados suficientes.

    Fluxo:
    1. Extrai nome base (antes do "|")
    2. Busca produto por nome base → se existe, garante alias + retorna
    3. Busca produto por nome completo (caso o nome sem "|" seja exatamente o do produto)
    4. Busca por alias existente → se acha, garante alias + retorna
    5. Nada encontrado → cria produto novo + checkout + alias
    """
    full_name = (event.product_name or "").strip()
    if not full_name:
        return None

    base_name = extract_base_name(full_name)
    has_separator = "|" in event.product_name

    # 1) Buscar produto pelo nome base
    product = _find_product_by_name(db, base_name)
    if product:
        _ensure_alias_if_needed(db, product, full_name, base_name, has_separator)
        return product

    # 2) Se tem "|", buscar também pelo nome completo
    if has_separator:
        product = _find_product_by_name(db, full_name)
        if product:
            return product

    # 3) Buscar por alias (nome base ou nome completo)
    product = _find_product_by_alias(db, base_name)
    if not product and has_separator:
        product = _find_product_by_alias(db, full_name)

    if product:
        _ensure_alias_if_needed(db, product, full_name, base_name, has_separator)
        return product

    # 4) Nada encontrado → criar produto novo
    product = _create_product(db, base_name, event)
    if product and has_separator:
        _ensure_alias_if_needed(db, product, full_name, base_name, has_separator)

    return product


def _ensure_alias_if_needed(
    db: Session,
    product: Product,
    full_name: str,
    base_name: str,
    has_separator: bool,
):
    """
    Se o nome completo é diferente do nome do produto,
    garante que o nome completo está cadastrado como alias.
    """
    if not has_separator:
        return
    if full_name == product.name:
        return
    if not _alias_exists(db, product.id, full_name):
        _create_alias(db, product.id, full_name)


def _create_product(
    db: Session, name: str, event: StandardizedWebhookEvent
) -> Product | None:
    """Cria um novo produto com checkout automático."""
    product = Product(name=name)
    db.add(product)
    db.flush()  # Precisamos do ID para criar checkout

    logger.info(
        f"Auto-produto criado: '{name}' (#{product.id}) | "
        f"Plataforma: {event.platform.value}"
    )

    # Criar checkout vinculado
    _create_checkout_from_event(db, product.id, event)

    return product
