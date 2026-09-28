from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import logging
import httpx
import os

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from api.auth.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/facebook", tags=["facebook"])

GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v25.0")
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"


class FacebookAccountCreate(BaseModel):
    label: str
    account_id: str
    access_token: str
    business_id: str | None = None


class FacebookAccountResponse(BaseModel):
    id: int
    label: str
    account_id: str
    access_token: str
    business_id: str | None = None
    token_valid: bool = True
    created_at: datetime | None = None

    class Config:
        from_attributes = True


@router.get("/accounts", response_model=list[FacebookAccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.query(FacebookAccount).order_by(FacebookAccount.id.desc()).all()


@router.post("/accounts", response_model=FacebookAccountResponse, status_code=201)
async def create_account(
    payload: FacebookAccountCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    existing = db.query(FacebookAccount).filter(
        FacebookAccount.account_id == payload.account_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Essa conta já está cadastrada"
        )

    real_name = await _fetch_account_name(payload.access_token, payload.account_id)
    label = real_name or payload.label

    account = FacebookAccount(
        label=label,
        account_id=payload.account_id,
        access_token=payload.access_token,
        business_id=payload.business_id,
        token_valid=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


class FacebookBulkCreate(BaseModel):
    accounts: list[dict]  # [{"label": "...", "account_id": "..."}]
    access_token: str
    business_id: str | None = None


@router.post("/accounts/bulk", response_model=list[FacebookAccountResponse], status_code=201)
async def create_accounts_bulk(
    payload: FacebookBulkCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    created = []
    for item in payload.accounts:
        account_id = item.get("account_id", "").strip()
        fallback_label = item.get("label", "").strip()
        if not account_id:
            continue
        existing = db.query(FacebookAccount).filter(
            FacebookAccount.account_id == account_id
        ).first()
        if existing:
            continue

        real_name = await _fetch_account_name(payload.access_token, account_id)
        label = real_name or fallback_label or account_id

        account = FacebookAccount(
            label=label,
            account_id=account_id,
            access_token=payload.access_token,
            business_id=payload.business_id,
            token_valid=True,
        )
        db.add(account)
        db.flush()
        created.append(account)

    db.commit()
    return created


class FacebookTokenUpdate(BaseModel):
    access_token: str


@router.patch("/accounts/{account_id}/token", response_model=FacebookAccountResponse)
def update_account_token(
    account_id: int,
    payload: FacebookTokenUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Atualiza o token de uma conta e restaura token_valid=True."""
    account = db.query(FacebookAccount).filter(FacebookAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta Facebook não encontrada")
    account.access_token = payload.access_token
    account.token_valid = True
    db.commit()
    db.refresh(account)
    return account


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(
    account_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    account = db.query(FacebookAccount).filter(FacebookAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Conta Facebook não encontrada")
    db.delete(account)
    db.commit()


async def _fetch_account_name(access_token: str, account_id: str) -> str | None:
    """Busca o nome real da conta de anúncio na Graph API."""
    act_id = account_id if account_id.startswith("act_") else f"act_{account_id}"
    url = f"{GRAPH_API_BASE}/{act_id}"
    params = {"access_token": access_token, "fields": "name"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                name = resp.json().get("name", "")
                if name:
                    logger.info(f"Nome real da conta {act_id}: {name}")
                    return name
            logger.warning(f"Falha ao buscar nome de {act_id}: {resp.status_code}")
    except Exception as e:
        logger.warning(f"Erro ao buscar nome de {act_id}: {e}")
    return None
