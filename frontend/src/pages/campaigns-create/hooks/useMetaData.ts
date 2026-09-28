import { useState, useCallback, useRef } from "react";
import {
  fetchPixels,
  fetchPages,
  searchInterests,
  type PixelData,
  type PageData,
  type InstagramAccount,
  type InterestData,
} from "@/services/campaignCreator";

/**
 * Hook para buscar pixels da conta de anúncio selecionada.
 */
export function usePixels() {
  const [pixels, setPixels] = useState<PixelData[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (accountId: number) => {
    setLoading(true);
    try {
      const data = await fetchPixels(accountId);
      setPixels(data);
    } catch (err) {
      console.error("Erro ao buscar pixels:", err);
      setPixels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { pixels, loading, load };
}

/**
 * Hook para buscar páginas FB + contas IG da conta de anúncio.
 */
export function usePages() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (accountId: number) => {
    setLoading(true);
    try {
      const data = await fetchPages(accountId);
      setPages(data.pages);
      setInstagramAccounts(data.instagram_accounts);
    } catch (err) {
      console.error("Erro ao buscar páginas:", err);
      setPages([]);
      setInstagramAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { pages, instagramAccounts, loading, load };
}

/** Dados Meta (pixels, pages, IG) carregados por conta */
export interface AccountMetaData {
  pixels: PixelData[];
  pages: PageData[];
  instagramAccounts: InstagramAccount[];
  loading: boolean;
}

/**
 * Hook para carregar pixels/pages/ig de múltiplas contas simultaneamente.
 * Retorna um mapa accountId → AccountMetaData.
 */
export function useMultiAccountMeta() {
  const [dataMap, setDataMap] = useState<Record<number, AccountMetaData>>({});

  const loadForAccount = useCallback(async (accountId: number) => {
    setDataMap((prev) => ({
      ...prev,
      [accountId]: { ...{ pixels: [], pages: [], instagramAccounts: [], loading: true }, ...prev[accountId], loading: true },
    }));

    try {
      const [pixelsData, pagesData] = await Promise.all([
        fetchPixels(accountId),
        fetchPages(accountId),
      ]);
      setDataMap((prev) => ({
        ...prev,
        [accountId]: {
          pixels: pixelsData,
          pages: pagesData.pages,
          instagramAccounts: pagesData.instagram_accounts,
          loading: false,
        },
      }));
    } catch (err) {
      console.error(`Erro ao buscar meta data da conta ${accountId}:`, err);
      setDataMap((prev) => ({
        ...prev,
        [accountId]: { pixels: [], pages: [], instagramAccounts: [], loading: false },
      }));
    }
  }, []);

  const loadForAccounts = useCallback(async (accountIds: number[]) => {
    await Promise.all(accountIds.map(loadForAccount));
  }, [loadForAccount]);

  return { dataMap, loadForAccount, loadForAccounts };
}

/**
 * Hook para busca de interesses com debounce.
 */
export function useInterestSearch() {
  const [results, setResults] = useState<InterestData[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((accountId: number, query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < 1) {
      setResults([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchInterests(accountId, query);
        setResults(data);
      } catch (err) {
        console.error("Erro na busca de interesses:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clear = useCallback(() => setResults([]), []);

  return { results, loading, search, clear };
}
