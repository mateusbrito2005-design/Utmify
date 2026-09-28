import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccountMetaConfig } from "../hooks/useCampaignForm";
import type { AccountMetaData } from "../hooks/useMetaData";
import type { FacebookAccountAPI } from "@/services/integrations";
import { RiLoader4Line } from "@remixicon/react";

interface AccountMetaConfigCardProps {
  account: FacebookAccountAPI;
  config: AccountMetaConfig;
  metaData: AccountMetaData | undefined;
  onUpdate: (accountId: number, data: Partial<AccountMetaConfig>) => void;
}

export function AccountMetaConfigCard({
  account, config, metaData, onUpdate,
}: AccountMetaConfigCardProps) {
  const pixels = metaData?.pixels ?? [];
  const pages = metaData?.pages ?? [];
  const igAccounts = metaData?.instagramAccounts ?? [];
  const isLoading = metaData?.loading ?? true;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
        <RiLoader4Line className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{account.label} — Carregando...</span>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border space-y-3">
      <p className="text-sm font-medium">{account.label}</p>
      <div className="grid grid-cols-3 gap-3">
        {/* Pixel */}
        <div className="space-y-1">
          <Label className="text-xs">Pixel</Label>
          <Select value={config.pixelId} onValueChange={(v) => onUpdate(account.id, { pixelId: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {pixels.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Página FB */}
        <div className="space-y-1">
          <Label className="text-xs">Página</Label>
          <Select
            value={config.pageId}
            onValueChange={(v) => {
              const page = pages.find((p) => p.id === v);
              onUpdate(account.id, { pageId: v, pageLabel: page?.name ?? "" });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {pages.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Instagram */}
        <div className="space-y-1">
          <Label className="text-xs">Instagram</Label>
          <Select
            value={config.instagramActorId || "none"}
            onValueChange={(v) => {
              const id = v === "none" ? "" : v;
              const ig = igAccounts.find((a) => a.id === v);
              onUpdate(account.id, {
                instagramActorId: id,
                instagramLabel: ig ? `@${ig.username}` : "",
              });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem Instagram</SelectItem>
              {igAccounts.map((ig) => (
                <SelectItem key={ig.id} value={ig.id}>@{ig.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
