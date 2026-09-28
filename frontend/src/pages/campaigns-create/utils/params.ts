/**
 * Chaves UTM fixas que já existem nos parâmetros padrão.
 * Caso o usuário repita alguma delas em "Parâmetros Adicionais",
 * elas serão removidas automaticamente na normalização.
 */
const FIXED_UTM_KEYS = new Set([
  "utm_source",
  "utm_campaign",
  "utm_medium",
  "utm_content",
  "utm_term",
]);

/**
 * Sanitiza parâmetros adicionais:
 * 1. Remove "?" inicial (o usuário deve usar apenas "&")
 * 2. Remove "&" iniciais/finais
 * 3. Remove parâmetros que já existem nos UTM fixos
 * 4. Remove entradas vazias (&&)
 */
export function sanitizeExtraParams(raw: string): string {
  if (!raw) return "";

  // Strip leading ? and &
  let cleaned = raw.replace(/^[?&]+/, "").replace(/[&]+$/, "");

  // Split em pares e filtrar
  const pairs = cleaned
    .split("&")
    .map((p) => p.trim())
    .filter((p) => {
      if (!p) return false;
      const key = p.split("=")[0]?.toLowerCase();
      return !FIXED_UTM_KEYS.has(key);
    });

  return pairs.join("&");
}
