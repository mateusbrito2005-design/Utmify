"""
Descobre e sincroniza contas de anúncio de um Business Manager (BM).
- discover: lista contas do BM (retorna pro frontend selecionar)
- sync: busca contas do BM e faz upsert direto no DB
"""
import os
import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.auth.deps import get_current_user
from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facebook", tags=["facebook"])

GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v25.0")
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class DiscoverRequest(BaseModel):
    access_token: str
    business_id: str


class DiscoveredAccount(BaseModel):
    account_id: str
    name: str


class DiscoverResponse(BaseModel):
    accounts: list[DiscoveredAccount]
    total: int


class SyncResult(BaseModel):
    added: int
    skipped: int
    total_found: int


@router.post("/accounts/discover", response_model=DiscoverResponse)
async def discover_accounts(
    payload: DiscoverRequest,
    _=Depends(get_current_user),
):
    """
    Lista todas as contas de anúncio de um Business Manager.
    Faz paginação automática para BMs com muitas contas.
    """
    accounts = await _fetch_bm_accounts(payload.access_token, payload.business_id)
    return DiscoverResponse(accounts=accounts, total=len(accounts))


@router.post("/accounts/sync", response_model=SyncResult)
async def sync_accounts(
    payload: DiscoverRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Sincroniza contas do BM: busca todas e faz upsert no DB.
    Reutiliza a mesma lógica de fetch do discover.
    """
    discovered = await _fetch_bm_accounts(payload.access_token, payload.business_id)

    if not discovered:
        raise HTTPException(status_code=400, detail="Nenhuma conta encontrada neste Business Manager")

    added = 0
    skipped = 0

    for item in discovered:
        existing = db.query(FacebookAccount).filter(
            FacebookAccount.account_id == item.account_id,
        ).first()

        if existing:
            if not existing.business_id:
                existing.business_id = payload.business_id
            skipped += 1
            continue

        db.add(FacebookAccount(
            label=item.name,
            account_id=item.account_id,
            access_token=payload.access_token,
            business_id=payload.business_id,
        ))
        added += 1

    db.commit()
    return SyncResult(added=added, skipped=skipped, total_found=len(discovered))


async def _fetch_bm_accounts(
    access_token: str, business_id: str,
) -> list[DiscoveredAccount]:
    """Busca todas as contas de anúncio do BM (owned + shared) com paginação."""
    edges = ["owned_ad_accounts", "client_ad_accounts"]
    seen_ids: set[str] = set()
    accounts: list[DiscoveredAccount] = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for edge in edges:
                url = f"{GRAPH_API_BASE}/{business_id}/{edge}"
                params = {
                    "access_token": access_token,
                    "fields": "account_id,name",
                    "limit": 100,
                }

                response = await client.get(url, params=params)

                if response.status_code != 200:
                    if edge == "owned_ad_accounts":
                        error_data = response.json()
                        error_msg = error_data.get("error", {}).get("message", "Erro desconhecido")
                        raise HTTPException(status_code=400, detail=f"Erro na API da Meta: {error_msg}")
                    logger.warning(f"Falha ao buscar {edge}, ignorando: {response.status_code}")
                    continue

                data = response.json()
                for acc in _parse_accounts(data):
                    if acc.account_id not in seen_ids:
                        seen_ids.add(acc.account_id)
                        accounts.append(acc)

                while "paging" in data and "next" in data["paging"]:
                    response = await client.get(data["paging"]["next"])
                    if response.status_code != 200:
                        break
                    data = response.json()
                    for acc in _parse_accounts(data):
                        if acc.account_id not in seen_ids:
                            seen_ids.add(acc.account_id)
                            accounts.append(acc)

    except httpx.RequestError as e:
        logger.error(f"Erro ao conectar com a Meta API: {e}")
        raise HTTPException(status_code=502, detail="Não foi possível conectar com a API da Meta")

    return accounts


def _parse_accounts(data: dict) -> list[DiscoveredAccount]:
    """Extrai contas do payload da Graph API."""
    result = []
    for item in data.get("data", []):
        account_id = item.get("account_id", item.get("id", ""))
        name = item.get("name", account_id)
        if account_id:
            if not account_id.startswith("act_"):
                account_id = f"act_{account_id}"
            result.append(DiscoveredAccount(account_id=account_id, name=name))
    return result
