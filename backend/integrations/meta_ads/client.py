"""
HTTP client para a Meta Marketing API (Graph API).
Inclui retry com backoff para rate limits e paginação automática.
"""
import os
import asyncio
import logging
import httpx
from typing import Any

logger = logging.getLogger(__name__)


class MetaAuthError(Exception):
    """
    Erro permanente de autenticação na Meta API.
    Indica token inválido, expirado ou app deletado.
    Não deve ser retryado.
    """
    def __init__(self, message: str, error_code: int = 0):
        super().__init__(message)
        self.error_code = error_code


# Códigos de erro da Meta que indicam falha permanente de autenticação
# Referência: https://developers.facebook.com/docs/graph-api/guides/error-handling
FATAL_AUTH_CODES = {
    190,  # Invalid OAuth 2.0 Access Token (token inválido, expirado, app deletado)
    102,  # Session key invalid or no longer valid
    2500, # Error parsing OAuth token (general)
}

# Versão da Graph API via ENV (padrão v25.0)
GRAPH_API_VERSION = os.getenv("META_GRAPH_API_VERSION", "v25.0")
GRAPH_API_BASE = f"https://graph.facebook.com/{GRAPH_API_VERSION}"

# Timeout padrão para requests (em segundos)
DEFAULT_TIMEOUT = 30.0

# Retry config
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # segundos


class MetaAdsClient:
    """
    HTTP client para a Meta Marketing API (Graph API).
    Usa httpx.AsyncClient com retry automático para rate limits.
    """

    def __init__(self, access_token: str, account_id: str):
        self.access_token = access_token
        self.account_id = (
            account_id if account_id.startswith("act_")
            else f"act_{account_id}"
        )
        self._client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT)

    async def _request_with_retry(
        self,
        url: str,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        """
        Faz GET com retry automático para rate limit (429/17).
        A Meta retorna código 400 com error code 17 para rate limit.
        """
        for attempt in range(MAX_RETRIES):
            response = await self._client.get(url, params=params)

            # Sucesso
            if response.status_code == 200:
                return response

            # Verifica se é erro fatal de autenticação (não retryar)
            auth_error = self._get_auth_error(response)
            if auth_error:
                raise auth_error

            # Verifica se é rate limit
            if self._is_rate_limited(response):
                wait_time = INITIAL_BACKOFF * (2 ** attempt)
                logger.warning(
                    f"Rate limit atingido (tentativa {attempt + 1}/{MAX_RETRIES}). "
                    f"Aguardando {wait_time}s antes de tentar novamente."
                )
                await asyncio.sleep(wait_time)
                continue

            # Outro erro — raise normalmente
            response.raise_for_status()

        # Última tentativa esgotada — tenta uma vez e levanta erro
        response = await self._client.get(url, params=params)
        response.raise_for_status()
        return response

    @staticmethod
    def _get_auth_error(response: httpx.Response) -> MetaAuthError | None:
        """Verifica se a resposta é um erro fatal de autenticação (sem retry)."""
        if response.status_code in (400, 401, 403):
            try:
                body = response.json()
                error = body.get("error", {})
                code = error.get("code", 0)
                message = error.get("message", "Token inválido")
                if code in FATAL_AUTH_CODES:
                    logger.error(
                        f"Erro fatal de autenticação Meta (code={code}): {message}"
                    )
                    return MetaAuthError(message, error_code=code)
            except Exception:
                pass
        return None

    @staticmethod
    def _is_rate_limited(response: httpx.Response) -> bool:
        """Verifica se a resposta é rate limit da Meta."""
        if response.status_code == 429:
            return True
        if response.status_code == 400:
            try:
                body = response.json()
                error = body.get("error", {})
                # Código 17 = rate limit, 32 = too many calls
                return error.get("code") in (17, 32, 4)
            except Exception:
                pass
        return False

    async def _get(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Faz GET na Graph API com retry."""
        url = f"{GRAPH_API_BASE}/{endpoint}"
        request_params = {"access_token": self.access_token}
        if params:
            request_params.update(params)

        response = await self._request_with_retry(url, request_params)
        return response.json()

    async def _get_all_pages(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Busca todas as páginas de resultado (paginação automática).
        Usa retry com backoff para rate limits.
        """
        all_data: list[dict[str, Any]] = []
        url = f"{GRAPH_API_BASE}/{endpoint}"
        request_params = {"access_token": self.access_token}
        if params:
            request_params.update(params)

        while url:
            try:
                response = await self._request_with_retry(
                    url, request_params,
                )
            except MetaAuthError:
                # Propaga erros de auth para tratamento pelo serviço
                raise
            except httpx.HTTPStatusError as e:
                logger.warning(
                    f"Paginação parou com status {e.response.status_code} "
                    f"({len(all_data)} itens coletados). Endpoint: {endpoint}"
                )
                break

            data = response.json()
            all_data.extend(data.get("data", []))

            # Próxima página (cursor-based pagination)
            paging = data.get("paging", {})
            url = paging.get("next")
            # Na próxima iteração, os params já estão na URL next
            request_params = None

        return all_data

    async def close(self):
        await self._client.aclose()
