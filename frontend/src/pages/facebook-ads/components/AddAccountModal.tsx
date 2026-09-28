import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AccountIdBadges } from "./AccountIdBadges";
import { AccountItemsList, type AccountItem } from "./AccountItemsList";
import { AutoImportToggle } from "./AutoImportToggle";
import type { DiscoveredAccount } from "@/services/integrations";

export interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (label: string, accountId: string, accessToken: string, businessId?: string) => void;
  onBulkAdd?: (items: { label: string; account_id: string }[], accessToken: string, businessId?: string) => void;
  isLoading?: boolean;
  prefillToken?: string;
}

export function AddAccountModal({
  open, onOpenChange, onAdd, onBulkAdd, isLoading, prefillToken,
}: AddAccountModalProps) {
  const [businessId, setBusinessId] = useState("");
  const [accountItems, setAccountItems] = useState<AccountItem[]>([]);
  const [accessToken, setAccessToken] = useState("");
  const [autoMode, setAutoMode] = useState(false);

  const isDuplicate = !!prefillToken;

  useEffect(() => {
    if (open && prefillToken) {
      setAccessToken(prefillToken);
    }
  }, [open, prefillToken]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken.trim()) return;
    if (accountItems.length === 0) return;

    const bmId = businessId.trim() || undefined;

    if (accountItems.length === 1) {
      const item = accountItems[0];
      onAdd(item.label || item.account_id, item.account_id, accessToken.trim(), bmId);
    } else if (onBulkAdd) {
      const items = accountItems.map((item) => ({
        label: item.label || item.account_id,
        account_id: item.account_id,
      }));
      onBulkAdd(items, accessToken.trim(), bmId);
    }

    resetFields();
  }, [accessToken, accountItems, businessId, onAdd, onBulkAdd]);

  const resetFields = () => {
    setBusinessId("");
    setAccountItems([]);
    setAccessToken("");
    setAutoMode(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) resetFields();
    onOpenChange(v);
  };

  // Auto-import: recebe contas com nome real do Facebook
  const handleAccountsDiscovered = (accounts: DiscoveredAccount[]) => {
    const existingIds = new Set(accountItems.map((i) => i.account_id));
    const newItems = accounts
      .filter((a) => !existingIds.has(a.account_id))
      .map((a) => ({ account_id: a.account_id, label: a.name }));
    setAccountItems((prev) => [...prev, ...newItems]);
  };

  // Manual add: recebe IDs do AccountIdBadges
  const handleManualIdsChange = (ids: string[]) => {
    const existingIds = new Set(accountItems.map((i) => i.account_id));
    const newItems = ids
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ account_id: id, label: id }));

    // Mantém os existentes que ainda estão nos ids + adiciona novos
    const keptItems = accountItems.filter((i) => ids.includes(i.account_id));
    setAccountItems([...keptItems, ...newItems]);
  };

  const canSubmit = accessToken.trim() && accountItems.length > 0;
  const manualIds = accountItems.map((i) => i.account_id);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isDuplicate ? "Duplicar Conta" : "Adicionar Conta"}
          </DialogTitle>
          <DialogDescription>
            {isDuplicate
              ? "Adicione novas contas usando o mesmo Access Token"
              : "Insira os dados da sua conta de anúncios do Facebook"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-4">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <Label htmlFor="fb-token">Access Token</Label>
              <Input
                id="fb-token"
                type="password"
                placeholder="Cole o token de acesso"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={isLoading || isDuplicate}
                required
                autoComplete="off"
              />
            </div>
            <AutoImportToggle
              accessToken={accessToken}
              onAccountsDiscovered={handleAccountsDiscovered}
              onBusinessIdDiscovered={(id) => setBusinessId(id)}
              onAutoModeChange={setAutoMode}
              disabled={isLoading}
            />

            {/* Lista editável das contas importadas */}
            <AccountItemsList
              items={accountItems}
              onChange={setAccountItems}
              disabled={isLoading}
            />

            {/* Input manual — só aparece quando importação automática está desativada */}
            {!autoMode && (
              <AccountIdBadges
                accountIds={manualIds}
                onChange={handleManualIdsChange}
                disabled={isLoading}
                hideList
              />
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>Cancelar</Button>
            <Button type="submit" disabled={isLoading || !canSubmit}>
              {isLoading
                ? "Adicionando..."
                : accountItems.length > 1
                  ? `Adicionar ${accountItems.length} Contas`
                  : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
