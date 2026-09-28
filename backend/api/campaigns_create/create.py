"""
Endpoint principal para criar campanhas completas.
Recebe JSON + arquivos multipart e orquestra toda a criação.
Suporta multi-account: replica a mesma estrutura em N contas de anúncio.
"""
import json
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from database.core.connection import get_db
from database.models.facebook_account import FacebookAccount
from api.auth.deps import get_current_user
from api.campaigns_create.schemas import (
    CampaignCreateResponse,
    AccountResult,
)
from api.campaigns_create.create_helper import (
    create_for_single_account,
    VIDEO_EXTENSIONS,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/campaigns/create",
    tags=["campaign-creator"],
)


@router.post("/publish", response_model=CampaignCreateResponse)
async def publish_campaign(
    payload: str = Form(...),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Cria campanha(s) completa(s): Campaign → Ad Sets → Ads.
    Suporta multi-account via account_ids (lista de IDs internos).
    A mesma estrutura é replicada sequencialmente em cada conta.
    """
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Payload JSON inválido")

    # Resolver lista de contas (multi-account ou retrocompatibilidade)
    fb_accounts = _resolve_accounts(db, data)
    if not fb_accounts:
        raise HTTPException(status_code=404, detail="Nenhuma conta Facebook encontrada")

    publish_active = data.get("publish_active", False)
    status = "ACTIVE" if publish_active else "PAUSED"

    # Pré-lê todos os arquivos em memória (multipart só pode ser lido uma vez)
    file_bytes_list = await _read_files(files)

    # Orquestra criação em cada conta
    all_errors: list[str] = []
    account_results: list[AccountResult] = []
    total_campaigns = 0
    total_ads = 0
    first_campaign_id: str | None = None
    first_adset_id: str | None = None

    # Per-account configs (pixel/page/instagram override)
    account_configs: dict = data.get("account_configs", {})

    import asyncio
    
    # Processa contas em paralelo
    tasks = []
    for account in fb_accounts:
        acc_label = account.label or account.account_id
        logger.info(f"Criando estrutura na conta: {acc_label} ({account.account_id})")

        acc_data = dict(data)
        acc_cfg = account_configs.get(str(account.id), {})
        if acc_cfg:
            if acc_cfg.get("pixel_id"):
                acc_data["pixel_id"] = acc_cfg["pixel_id"]
            if acc_cfg.get("page_id"):
                acc_data["page_id"] = acc_cfg["page_id"]
            if acc_cfg.get("instagram_actor_id") is not None:
                acc_data["instagram_actor_id"] = acc_cfg["instagram_actor_id"]

        tasks.append(
            create_for_single_account(
                token=account.access_token,
                act_id=account.account_id,
                data=acc_data,
                file_bytes_list=file_bytes_list,
                status=status,
                account_label=acc_label,
                account_id_db=account.id,
            )
        )

    results = await asyncio.gather(*tasks)

    for result in results:
        acc_result = AccountResult(
            account_id=result["account_id_db"],
            account_label=result["account_label"],
            success=len(result["errors"]) == 0,
            campaigns_created=result["campaigns_created"],
            ads_created=result["ads_created"],
            errors=result["errors"],
        )
        account_results.append(acc_result)

        total_campaigns += result["campaigns_created"]
        total_ads += result["ads_created"]
        all_errors.extend(result["errors"])

        if first_campaign_id is None and result["first_campaign_id"]:
            first_campaign_id = result["first_campaign_id"]
        if first_adset_id is None and result["first_adset_id"]:
            first_adset_id = result["first_adset_id"]

    return CampaignCreateResponse(
        success=len(all_errors) == 0,
        campaign_id=first_campaign_id,
        adset_id=first_adset_id,
        campaigns_created=total_campaigns,
        ads_created=total_ads,
        errors=all_errors,
        account_results=account_results,
    )


def _resolve_accounts(db: Session, data: dict) -> list[FacebookAccount]:
    """Resolve contas a partir de account_ids ou account_id (retrocompat)."""
    account_ids: list[int] = data.get("account_ids", [])

    # Retrocompatibilidade: se não tiver account_ids, usa account_id
    if not account_ids and data.get("account_id"):
        account_ids = [int(data["account_id"])]

    if not account_ids:
        return []

    accounts = (
        db.query(FacebookAccount)
        .filter(FacebookAccount.id.in_(account_ids))
        .all()
    )

    # Manter a ordem original do payload
    order_map = {aid: idx for idx, aid in enumerate(account_ids)}
    accounts.sort(key=lambda a: order_map.get(a.id, 999))

    return accounts


async def _read_files(files: list[UploadFile]) -> list[tuple[bytes, str, bool]]:
    """Lê todos os arquivos multipart em memória."""
    result: list[tuple[bytes, str, bool]] = []
    for f in files:
        raw = await f.read()
        ext = (f.filename or "").rsplit(".", 1)[-1].lower()
        is_video = f".{ext}" in VIDEO_EXTENSIONS
        result.append((raw, f.filename or f"media_{len(result)}", is_video))
    return result
