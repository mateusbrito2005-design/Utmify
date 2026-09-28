/**
 * Opções de país e idioma para targeting do Facebook Ads.
 * Os codes são ISO 3166-1 alpha-2 para países.
 * Os locale keys vêm da Meta Marketing API (type=adlocale).
 */

export interface CountryOption {
  value: string;
  label: string;
}

export interface LocaleOption {
  value: number;
  label: string;
}

/** "WORLDWIDE" = sem filtro de país (geo_locations vazio) */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "BR", label: "Brasil" },
  { value: "WORLDWIDE", label: "Mundo Inteiro" },
  { value: "US", label: "Estados Unidos" },
  { value: "ES", label: "Espanha" },
  { value: "FR", label: "França" },
];

/**
 * Locale keys da Meta Marketing API.
 * 0 = Todos os idiomas (não envia locales na API).
 */
export const LOCALE_OPTIONS: LocaleOption[] = [
  { value: 0, label: "Todos os idiomas" },
  { value: 16, label: "Português" },
  { value: 6, label: "Inglês" },
  { value: 23, label: "Espanhol" },
  { value: 1, label: "Francês" },
  { value: 5, label: "Alemão" },
];

/** Valor padrão para país */
export const DEFAULT_COUNTRY = "BR";

/** Valor padrão para locales — todos os idiomas */
export const DEFAULT_LOCALES: number[] = [];

/**
 * Retorna o label do país pelo value.
 */
export function getCountryLabel(value: string): string {
  return COUNTRY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Retorna labels dos locales selecionados.
 */
export function getLocaleLabels(locales: number[]): string {
  if (locales.length === 0) return "Todos os idiomas";
  return locales
    .map((v) => LOCALE_OPTIONS.find((o) => o.value === v)?.label ?? String(v))
    .join(", ");
}
