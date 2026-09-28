import { useCachedQuery } from "./useCachedQuery";
import {
  fetchFacebookAccounts,
  createFacebookAccount,
  deleteFacebookAccount,
  bulkCreateFacebookAccounts,
  syncFacebookAccounts,
  updateFacebookAccountToken,
  type FacebookAccountAPI,
  type SyncResult,
} from "@/services/integrations";
import { invalidateCacheByPrefix } from "@/lib/queryCache";

export function useFacebookAccounts() {
  const { data, isLoading, error, reload } = useCachedQuery<FacebookAccountAPI[]>({
    cachePrefix: "facebook-accounts",
    queryFn: fetchFacebookAccounts,
  });

  const addAccount = async (label: string, accountId: string, accessToken: string, businessId?: string) => {
    const newAccount = await createFacebookAccount(label, accountId, accessToken, businessId);
    invalidateCacheByPrefix("facebook-accounts");
    await reload();
    return newAccount;
  };

  const bulkAddAccounts = async (
    items: { label: string; account_id: string }[],
    accessToken: string,
    businessId?: string,
  ) => {
    const created = await bulkCreateFacebookAccounts(items, accessToken, businessId);
    invalidateCacheByPrefix("facebook-accounts");
    await reload();
    return created;
  };

  const removeAccount = async (id: number) => {
    await deleteFacebookAccount(id);
    invalidateCacheByPrefix("facebook-accounts");
    await reload();
  };

  const removeAccounts = async (ids: number[]) => {
    await Promise.all(ids.map((id) => deleteFacebookAccount(id)));
    invalidateCacheByPrefix("facebook-accounts");
    await reload();
  };

  const syncAccounts = async (
    accessToken: string,
    businessId: string,
  ): Promise<SyncResult> => {
    const result = await syncFacebookAccounts(accessToken, businessId);
    invalidateCacheByPrefix("facebook-accounts");
    await reload();
    return result;
  };

  const updateToken = async (id: number, accessToken: string) => {
    const updated = await updateFacebookAccountToken(id, accessToken);
    invalidateCacheByPrefix("facebook-accounts");
    invalidateCacheByPrefix("dashboard");
    await reload();
    return updated;
  };

  return {
    accounts: data ?? [],
    isLoading,
    error,
    addAccount,
    bulkAddAccounts,
    removeAccount,
    removeAccounts,
    syncAccounts,
    updateToken,
    reload,
  };
}
