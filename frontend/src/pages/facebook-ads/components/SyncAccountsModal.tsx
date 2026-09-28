import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RiRefreshLine, RiLoader4Line } from "@remixicon/react";
import type { SyncResult } from "@/services/integrations";

interface SyncAccountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSync: (accessToken: string, businessId: string) => Promise<SyncResult>;
  prefillToken?: string;
  prefillBusinessId?: string;
}

export function SyncAccountsModal({
  open, onOpenChange, onSync, prefillToken, prefillBusinessId,
}: SyncAccountsModalProps) {
  const [accessToken, setAccessToken] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (prefillToken) setAccessToken(prefillToken);
      if (prefillBusinessId) setBusinessId(prefillBusinessId);
      setResult(null);
      setError(null);
    }
  }, [open, prefillToken, prefillBusinessId]);

  const handleSync = useCallback(async () => {
    if (!accessToken.trim() || !businessId.trim()) return;

    setIsSyncing(true);
    setError(null);
    setResult(null);

    try {
      const syncResult = await onSync(accessToken.trim(), businessId.trim());
      setResult(syncResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao sincronizar contas");
    } finally {
      setIsSyncing(false);
    }
  }, [accessToken, businessId, onSync]);

  const handleClose = (v: boolean) => {
    if (!v) {
      setAccessToken("");
      setBusinessId("");
      setResult(null);
      setError(null);
    }
    onOpenChange(v);
  };

  const canSync = accessToken.trim() && businessId.trim() && !isSyncing;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiRefreshLine className="size-5 text-[#1877F2]" />
            Sincronizar Contas
          </DialogTitle>
          <DialogDescription>
            Busca todas as contas de anúncio do Business Manager e adiciona as novas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sync-token">Access Token</Label>
            <Input
              id="sync-token"
              type="password"
              placeholder="Cole o token de acesso"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={isSyncing}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sync-bm-id">Business Manager ID</Label>
            <Input
              id="sync-bm-id"
              placeholder="Ex: 123456789012345"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              disabled={isSyncing}
              className="font-mono text-sm"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {result && (
            <div className="rounded-lg bg-muted/40 border border-border/40 p-3 space-y-1.5">
              <p className="text-sm font-medium text-emerald-500">
                ✓ Sincronização concluída
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold tabular-nums">{result.total_found}</p>
                  <p className="text-[11px] text-muted-foreground">Encontradas</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-emerald-500">{result.added}</p>
                  <p className="text-[11px] text-muted-foreground">Adicionadas</p>
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums text-muted-foreground">{result.skipped}</p>
                  <p className="text-[11px] text-muted-foreground">Já existentes</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isSyncing}>
            {result ? "Fechar" : "Cancelar"}
          </Button>
          {!result && (
            <Button onClick={handleSync} disabled={!canSync} className="gap-1.5">
              {isSyncing ? (
                <RiLoader4Line className="size-4 animate-spin" />
              ) : (
                <RiRefreshLine className="size-4" />
              )}
              {isSyncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
