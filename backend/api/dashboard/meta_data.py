"""
Busca dados da Meta Ads para o dashboard.
Reutiliza MetaAdsService configurado em campanhas.
Captura erros de autenticação e invalida tokens no banco.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session

from database.models.facebook_account import FacebookAccount
from integrations.meta_ads.service import MetaAdsService
from integrations.meta_ads.client import MetaAuthError
from integrations.meta_ads.schemas import AccountInsightsSummary, CampaignInsights

logger = logging.getLogger(__name__)


def get_fb_account(db: Session) -> Optional[FacebookAccount]:
    """Retorna a primeira conta FB com token válido."""
    return (
        db.query(FacebookAccount)
        .filter(FacebookAccount.token_valid.is_(True))
        .first()
    )


def _mark_token_invalid(db: Session, account: FacebookAccount) -> None:
    """Marca a conta como token inválido para suprimir futuras chamadas."""
    account.token_valid = False
    db.commit()
    logger.warning(
        f"Token da conta Facebook '{account.label}' ({account.account_id}) "
        "marcado como inválido. Atualize o token na página de integrações."
    )


async def fetch_meta_account_summary(
    db: Session,
    date_start: str,
    date_end: str,
) -> tuple[Optional[AccountInsightsSummary], Optional[str]]:
    """
    Busca métricas agregadas da conta Meta Ads.
    Retorna (summary, error_message).
    """
    fb = get_fb_account(db)
    if not fb:
        # Verifica se existe conta mas token inválido
        has_invalid = db.query(FacebookAccount).filter(
            FacebookAccount.token_valid.is_(False)
        ).first()
        if has_invalid:
            return None, "token_invalid"
        return None, None

    service = MetaAdsService(fb.access_token, fb.account_id)
    try:
        summary = await service.get_account_summary(date_start, date_end)
        return summary, None
    except MetaAuthError as e:
        _mark_token_invalid(db, fb)
        return None, "token_invalid"
    except Exception as e:
        logger.error(f"Erro ao buscar account summary da Meta: {e}")
        return None, None
    finally:
        await service.close()


async def fetch_meta_campaigns_for_dashboard(
    db: Session,
    date_start: str,
    date_end: str,
) -> list[CampaignInsights]:
    """Busca campanhas da Meta Ads para top campaigns do dashboard."""
    fb = get_fb_account(db)
    if not fb:
        return []

    service = MetaAdsService(fb.access_token, fb.account_id)
    try:
        campaigns = await service.get_campaigns(date_start, date_end)
        return campaigns
    except MetaAuthError as e:
        _mark_token_invalid(db, fb)
        return []
    except Exception as e:
        logger.error(f"Erro ao buscar campanhas da Meta: {e}")
        return []
    finally:
        await service.close()
