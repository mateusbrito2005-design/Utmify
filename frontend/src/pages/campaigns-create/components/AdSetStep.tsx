import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CampaignFormState, AccountMetaConfig } from "../hooks/useCampaignForm";
import type { PixelData, PageData, InstagramAccount, InterestData } from "@/services/campaignCreator";
import type { AccountMetaData } from "../hooks/useMetaData";
import type { FacebookAccountAPI } from "@/services/integrations";
import { generateAdSetName } from "../utils/naming";
import { RiLightbulbLine } from "@remixicon/react";
import { TargetingSection } from "./TargetingSection";
import { DateTimePicker } from "./DateTimePicker";
import { SharedMetaSelectors } from "./SharedMetaSelectors";
import { AccountMetaConfigCard } from "./AccountMetaConfigCard";

interface AdSetStepProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  onUpdateAccountConfig: (accountId: number, data: Partial<AccountMetaConfig>) => void;
  pixels: PixelData[];
  pages: PageData[];
  instagramAccounts: InstagramAccount[];
  interestResults: InterestData[];
  onSearchInterest: (query: string) => void;
  accounts: FacebookAccountAPI[];
  multiAccountData: Record<number, AccountMetaData>;
}

export function AdSetStep({
  form, onUpdate, onUpdateAccountConfig, pixels, pages, instagramAccounts,
  interestResults, onSearchInterest, accounts, multiAccountData,
}: AdSetStepProps) {
  const suggestedName = generateAdSetName(
    form.campaignName.split(" | ")[1] || form.campaignName,
    form.ageMin, form.ageMax, form.gender, form.interests.length > 0
  );

  const isMultiAccount = form.accountIds.length > 1;
  const selectedAccounts = accounts.filter((a) => form.accountIds.includes(a.id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Conjunto de Anúncios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nome do Conjunto + Quantidade */}
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="space-y-2">
              <Label>Nome do Conjunto</Label>
              <Input
                value={form.adsetName}
                onChange={(e) => onUpdate("adsetName", e.target.value)}
                placeholder="Ex: CJ | Oferta | Aberto | 18-65+ | All"
                autoComplete="off"
              />
              {form.campaignName && (
                <button
                  onClick={() => onUpdate("adsetName", suggestedName)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
                >
                  <RiLightbulbLine className="size-3.5" />
                  Sugestão: {suggestedName}
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label>Qtd. Conjuntos</Label>
              <Input
                type="number" min={1} max={50}
                value={form.adsetCount}
                onChange={(e) => onUpdate("adsetCount", Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>

          {/* Toggle — só aparece com multi-account */}
          {isMultiAccount && (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <p className="text-sm font-medium">Mesmo Pixel / Página em todas as contas</p>
                <p className="text-xs text-muted-foreground">
                  {form.sharedMetaConfig
                    ? "Todas as contas usarão o mesmo pixel, página e Instagram"
                    : "Configure pixel, página e Instagram por conta"}
                </p>
              </div>
              <Switch
                checked={form.sharedMetaConfig}
                onCheckedChange={(v) => onUpdate("sharedMetaConfig", v)}
              />
            </div>
          )}

          {/* Shared selectors (default) */}
          {(form.sharedMetaConfig || !isMultiAccount) && (
            <SharedMetaSelectors
              form={form} onUpdate={onUpdate}
              pixels={pixels} pages={pages} instagramAccounts={instagramAccounts}
            />
          )}

          {/* Per-account selectors */}
          {!form.sharedMetaConfig && isMultiAccount && (
            <div className="space-y-2">
              {selectedAccounts.map((account) => (
                <AccountMetaConfigCard
                  key={account.id}
                  account={account}
                  config={form.accountMetaConfigs[account.id] ?? {
                    pixelId: "", pageId: "", pageLabel: "",
                    instagramActorId: "", instagramLabel: "",
                  }}
                  metaData={multiAccountData[account.id]}
                  onUpdate={onUpdateAccountConfig}
                />
              ))}
            </div>
          )}

          {/* Programação */}
          <div className="space-y-2">
            <Label>Programação (Timezone São Paulo)</Label>
            <DateTimePicker value={form.startTime} onChange={(iso) => onUpdate("startTime", iso)} />
            <p className="text-xs text-muted-foreground">
              Padrão: próxima meia-noite. Selecione a data e hora de início.
            </p>
          </div>
        </CardContent>
      </Card>

      <TargetingSection
        form={form} onUpdate={onUpdate}
        interestResults={interestResults} onSearchInterest={onSearchInterest}
      />
    </div>
  );
}
