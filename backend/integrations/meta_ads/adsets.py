"""
Busca conjuntos de anúncios (ad sets) + insights da conta Meta Ads.
Usa nested fields para obter estrutura e métricas em 1 único request.
"""
from integrations.meta_ads.client import MetaAdsClient
from integrations.meta_ads.schemas import AdSetInsights
from integrations.meta_ads.helpers import (
    extract_action_value, safe_float, safe_int, calc_connect_rate,
)

# Campos de estrutura do adset
STRUCTURE_FIELDS = "id,name,status,campaign_id,daily_budget,lifetime_budget"

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


async def fetch_adsets(
    client: MetaAdsClient,
    date_start: str,
    date_end: str,
) -> list[AdSetInsights]:
    """
    Busca todos os ad sets da conta com insights inline.
    1 único request com nested fields (estrutura + métricas juntos).
    """
    fields = _build_fields(date_start, date_end)

    adsets_raw = await client._get_all_pages(
        f"{client.account_id}/adsets",
        params={"fields": fields, "limit": "200"},
    )

    results: list[AdSetInsights] = []
    for adset in adsets_raw:
        insight = _extract_insight(adset)
        actions = insight.get("actions", [])

        lpv = safe_int(extract_action_value(actions, "landing_page_view"))
        initiate = safe_int(extract_action_value(actions, "omni_initiated_checkout"))
        clicks = safe_int(insight.get("inline_link_clicks", 0))
        ctr = safe_float(insight.get("inline_link_click_ctr", 0))
        cpc = safe_float(insight.get("cost_per_unique_inline_link_click", 0))

        budget = safe_float(
            adset.get("daily_budget", 0)
            or adset.get("lifetime_budget", 0)
        ) / 100

        results.append(AdSetInsights(
            id=adset.get("id", ""),
            campaign_id=adset.get("campaign_id", ""),
            name=adset.get("name", ""),
            status=_normalize_status(adset.get("status", "")),
            budget=budget,
            spend=safe_float(insight.get("spend", 0)),
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
    mapping = {
        "ACTIVE": "active",
        "PAUSED": "paused",
        "DELETED": "completed",
        "ARCHIVED": "completed",
    }
    return mapping.get(raw_status, "paused")
