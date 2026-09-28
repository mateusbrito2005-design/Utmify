"""
Criação de ads em lote para um Ad Set.
Upload de mídia + creative + ad para cada item.
"""
import logging
from integrations.meta_ads.create_ad import create_ad_creative, create_ad
from integrations.meta_ads.upload_media import upload_image, upload_video

logger = logging.getLogger(__name__)


async def create_ads_batch(
    token: str,
    act_id: str,
    adset_id: str,
    ads: list[dict],
    file_bytes_list: list[tuple[bytes, str, bool]],
    page_id: str,
    instagram_actor_id: str | None,
    status: str,
    errors: list[str],
    label: str = "",
) -> int:
    """Cria múltiplos ads com upload de mídia para um dado adset_id.
    Cancela a operação inteira no primeiro erro de upload ou creative."""
    created_count = 0

    for i, ad_data in enumerate(ads):
        media_index = ad_data.get("media_index", i)
        if media_index >= len(file_bytes_list):
            errors.append(f"{label} AD {i+1}: Arquivo de mídia não encontrado")
            break

        file_bytes, filename, is_video = file_bytes_list[media_index]
        media_result = await _upload_media(token, act_id, file_bytes, filename, is_video)

        if not media_result["success"]:
            errors.append(f"{label} AD {i+1}: Upload falhou — {media_result['error']}")
            break

        link = ad_data.get("link", "")
        url_tags = _build_url_tags(
            ad_data.get("utm_params", ""),
            ad_data.get("extra_params", ""),
        )

        creative_result = await create_ad_creative(
            access_token=token, account_id=act_id,
            name=ad_data.get("name", f"AD {str(i+1).zfill(2)}"),
            page_id=page_id, instagram_actor_id=instagram_actor_id,
            link=link, primary_text=ad_data.get("primary_text", ""),
            headline=ad_data.get("headline", ""),
            description=ad_data.get("description", ""),
            cta_type=ad_data.get("cta_type", "SHOP_NOW"),
            image_hash=media_result.get("image_hash"),
            video_id=media_result.get("video_id"),
            url_tags=url_tags,
            display_url=ad_data.get("display_url", ""),
        )

        if not creative_result["success"]:
            errors.append(f"{label} AD {i+1}: Creative falhou — {creative_result['error']}")
            break

        ad_result = await create_ad(
            access_token=token, account_id=act_id,
            name=ad_data.get("name", f"AD {str(i+1).zfill(2)}"),
            adset_id=adset_id, creative_id=creative_result["creative_id"],
            status=status,
        )

        if ad_result["success"]:
            created_count += 1
        else:
            errors.append(f"{label} AD {i+1}: {ad_result['error']}")
            break

    return created_count


async def _upload_media(token, act_id, file_bytes: bytes, filename: str, is_video: bool) -> dict:
    if is_video:
        return await upload_video(token, act_id, file_bytes, filename)
    return await upload_image(token, act_id, file_bytes, filename)


def _build_url_tags(utm_params: str | dict = "", extra_params: str = "") -> str:
    """Constrói url_tags string (UTM + extra params). Não inclui o link base."""
    if isinstance(utm_params, dict):
        utm_str = "&".join(f"{k}={v}" for k, v in utm_params.items() if v)
    else:
        utm_str = str(utm_params).strip() if utm_params else ""

    # Strip leading ? e & — o frontend já sanitiza, mas garantimos aqui
    utm_str = utm_str.lstrip("?&")
    extra = extra_params.strip().lstrip("?&").rstrip("&") if extra_params else ""

    parts = [p for p in [utm_str, extra] if p]
    return "&".join(parts)

