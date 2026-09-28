"""
Busca campanhas + insights da conta Meta Ads.
Usa nested fields para obter estrutura e métricas em 1 único request.
"""
from integrations.meta_ads.client import MetaAdsClient
from integrations.meta_ads.schemas import CampaignInsights
from integrations.meta_ads.helpers import (
    extract_action_value, safe_float, safe_int, calc_connect_rate,
)

# Campos de estrutura da campanha
STRUCTURE_FIELDS = "id,name,status,daily_budget,lifetime_budget,objective,bid_strategy"

# Campos de métricas (insights)
INSIGHT_FIELDS = ",".join([
    "spend",
    "impressions",
    "inline_link_clicks",
    "inline_link_click_ctr",
    "cost_per_unique_inline_link_click",
    "actions",
])


def _build_fields(date_start: str, date_end: str) -> str:
    """Monta fields com insights aninhados (1 request ao invés de 2)."""
    time_range = f'{{"since":"{date_start}","until":"{date_end}"}}'
    insights = f"insights.time_range({time_range}){{{INSIGHT_FIELDS}}}"
    return f"{STRUCTURE_FIELDS},{insights}"


async def fetch_campaigns(
    client: MetaAdsClient,
    date_start: str,
    date_end: str,
) -> list[CampaignInsights]:
    """
    Busca todas as campanhas da conta com insights inline.
    1 único request com nested fields (estrutura + métricas juntos).
    """
    fields = _build_fields(date_start, date_end)

    campaigns_raw = await client._get_all_pages(
        f"{client.account_id}/campaigns",
        params={"fields": fields, "limit": "200"},
    )

    results: list[CampaignInsights] = []
    for camp in campaigns_raw:
        insight = _extract_insight(camp)
        actions = insight.get("actions", [])

        lpv = safe_int(extract_action_value(actions, "landing_page_view"))
        initiate = safe_int(extract_action_value(actions, "omni_initiated_checkout"))
        clicks = safe_int(insight.get("inline_link_clicks", 0))
        spend = safe_float(insight.get("spend", 0))
        ctr = safe_float(insight.get("inline_link_click_ctr", 0))
        cpc = safe_float(insight.get("cost_per_unique_inline_link_click", 0))

        budget = safe_float(
            camp.get("daily_budget", 0)
            or camp.get("lifetime_budget", 0)
        ) / 100  # Meta retorna em centavos

        results.append(CampaignInsights(
            id=camp.get("id", ""),
            name=camp.get("name", ""),
            status=_normalize_status(camp.get("status", "")),
            objective=_normalize_objective(camp.get("objective", "")),
            bid_strategy=_normalize_bid_strategy(camp.get("bid_strategy", "")),
            budget=budget,
            spend=spend,
            clicks=clicks,
            impressions=safe_int(insight.get("impressions", 0)),
            cpc=cpc,
            ctr=ctr,
            cpa=0.0,
            landing_page_views=lpv,
            initiate_checkout=initiate,
            connect_rate=calc_connect_rate(lpv, clicks),
        ))

    return results


def _extract_insight(entity: dict) -> dict:
    """Extrai o primeiro registro de insights aninhados."""
    data = entity.get("insights", {}).get("data", [])
    return data[0] if data else {}


def _normalize_status(raw_status: str) -> str:
    """Normaliza o status da Meta para o formato do frontend."""
    mapping = {
        "ACTIVE": "active",
        "PAUSED": "paused",
        "DELETED": "completed",
        "ARCHIVED": "completed",
    }
    return mapping.get(raw_status, "paused")


def _normalize_objective(raw_objective: str) -> str:
    """Normaliza o objetivo da Meta para label amigável."""
    mapping = {
        "OUTCOME_SALES": "sales",
        "OUTCOME_TRAFFIC": "traffic",
        "OUTCOME_ENGAGEMENT": "engagement",
        "OUTCOME_LEADS": "leads",
        "OUTCOME_AWARENESS": "awareness",
        "OUTCOME_APP_PROMOTION": "app_promotion",
        "CONVERSIONS": "sales",
        "LINK_CLICKS": "traffic",
        "POST_ENGAGEMENT": "engagement",
        "LEAD_GENERATION": "leads",
        "BRAND_AWARENESS": "awareness",
        "REACH": "awareness",
        "VIDEO_VIEWS": "engagement",
        "MESSAGES": "engagement",
        "APP_INSTALLS": "app_promotion",
        "PRODUCT_CATALOG_SALES": "sales",
        "STORE_VISITS": "traffic",
    }
    return mapping.get(raw_objective, raw_objective.lower() if raw_objective else "other")


def _normalize_bid_strategy(raw_strategy: str) -> str:
    """Normaliza a estratégia de lance da Meta para label amigável."""
    mapping = {
        "LOWEST_COST_WITHOUT_CAP": "volume",
        "LOWEST_COST_WITH_BID_CAP": "bid_cap",
        "COST_CAP": "cost_cap",
        "LOWEST_COST_WITH_MIN_ROAS": "roas",
    }
    return mapping.get(raw_strategy, raw_strategy.lower() if raw_strategy else "volume")
