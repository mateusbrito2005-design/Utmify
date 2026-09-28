import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CampaignFormState } from "../hooks/useCampaignForm";
import type { FacebookAccountAPI } from "@/services/integrations";
import { BID_STRATEGY_OPTIONS, CTA_OPTIONS, bidFieldLabel } from "../utils/defaults";
import { formatScheduleDisplay } from "../utils/schedule";
import { getCountryLabel, getLocaleLabels } from "../utils/targeting";
import { RiRocketLine, RiMegaphoneLine, RiFocus2Line, RiBrushLine } from "@remixicon/react";
import { AccountsReviewCard, ReviewRow, truncateText } from "./ReviewHelpers";

interface ReviewStepProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  accounts: FacebookAccountAPI[];
}

export function ReviewStep({ form, onUpdate, accounts }: ReviewStepProps) {
  const strategyLabel =
    BID_STRATEGY_OPTIONS.find((o) => o.value === form.bidStrategy)?.label ?? form.bidStrategy;
  const genderLabel = form.gender === 1 ? "Masculino" : form.gender === 2 ? "Feminino" : "Todos";
  const firstAd = form.ads[0];
  const adData = form.batchMode
    ? { ...form.bulkData }
    : firstAd ?? { cta_type: "", link: "", extra_params: "", primary_text: "", headline: "" };
  const ctaLabel = CTA_OPTIONS.find((o) => o.value === adData.cta_type)?.label ?? adData.cta_type;

  const selectedAccounts = accounts.filter((a) => form.accountIds.includes(a.id));

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <RiRocketLine className="size-5 text-primary" />
              <div>
                <p className="font-semibold">
                  Estrutura: {form.campaignCount}-{form.adsetCount}-{form.ads.length} — {form.campaignCount} campanha{form.campaignCount > 1 ? "s" : ""}, {form.adsetCount} conjunto{form.adsetCount > 1 ? "s" : ""} cada, {form.ads.length} anúncio{form.ads.length > 1 ? "s" : ""} cada
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {selectedAccounts.length > 1
                    ? `Replicado em ${selectedAccounts.length} contas de anúncio.`
                    : form.publishActive
                      ? "Tudo será criado como ATIVO."
                      : "Tudo será criado como PAUSADO. Ative quando estiver pronto."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="publish-active" className="text-xs text-muted-foreground cursor-pointer">
                {form.publishActive ? "Ligado" : "Desativado"}
              </Label>
              <Switch
                id="publish-active"
                checked={form.publishActive}
                onCheckedChange={(v) => onUpdate("publishActive", v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contas selecionadas */}
      <AccountsReviewCard accounts={selectedAccounts} />

      {/* Campanha */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <RiMegaphoneLine className="size-4" /> Campanha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <ReviewRow label="Nome" value={form.campaignName} />
          <ReviewRow label="Orçamento Diário" value={`R$ ${form.dailyBudget.toFixed(2)}`} />
          <ReviewRow label="Estratégia" value={strategyLabel} />
          {form.bidAmount && (
            <ReviewRow label={bidFieldLabel(form.bidStrategy)} value={`R$ ${form.bidAmount.toFixed(2)}`} />
          )}
          {form.roasFloor && <ReviewRow label="ROAS Mínimo" value={`${form.roasFloor}x`} />}
          {form.videoLabel && <ReviewRow label="Vídeo" value={form.videoLabel} />}
          {form.checkoutLabel && <ReviewRow label="Checkout" value={form.checkoutLabel} />}
          {form.productLabel && <ReviewRow label="Produto" value={form.productLabel} />}
        </CardContent>
      </Card>

      {/* Conjunto */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <RiFocus2Line className="size-4" /> Conjunto de Anúncios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <ReviewRow label="Nome" value={form.adsetName} />
          {(form.sharedMetaConfig || selectedAccounts.length <= 1) ? (
            <>
              <ReviewRow label="Pixel" value={form.pixelId} />
              <ReviewRow label="Página" value={
                form.pageLabel
                  ? `${form.pageLabel} (${form.pageId})`
                  : form.pageId || "—"
              } />
              <ReviewRow label="Instagram" value={
                form.instagramActorId
                  ? `${form.instagramLabel || "ID"}: ${form.instagramActorId}`
                  : "Sem Instagram (page-backed)"
              } />
            </>
          ) : (
            <div className="space-y-1.5 mt-1">
              <span className="text-xs text-muted-foreground">Config. por conta:</span>
              {selectedAccounts.map((acc) => {
                const cfg = form.accountMetaConfigs[acc.id];
                return (
                  <div key={acc.id} className="flex items-center gap-2 py-0.5 pl-2 border-l-2 border-muted">
                    <span className="text-muted-foreground text-xs w-32 shrink-0 truncate">{acc.label}</span>
                    <span className="text-xs font-medium">
                      Pixel: {cfg?.pixelId || "—"} · Página: {cfg?.pageLabel || "—"} · IG: {cfg?.instagramLabel || "Sem"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <ReviewRow label="Programação" value={formatScheduleDisplay(form.startTime)} />
          <ReviewRow label="País" value={getCountryLabel(form.country)} />
          <ReviewRow label="Idioma" value={getLocaleLabels(form.locales)} />
          <ReviewRow label="Idade" value={`${form.ageMin} — ${form.ageMax === 65 ? "65+" : form.ageMax}`} />
          <ReviewRow label="Gênero" value={genderLabel} />
          {form.interests.length > 0 && (
            <div className="flex items-start gap-2 py-1">
              <span className="text-muted-foreground w-28 shrink-0">Interesses</span>
              <div className="flex flex-wrap gap-1">
                {form.interests.map((i) => (
                  <Badge key={i.id} variant="secondary" className="text-xs">{i.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anúncios */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <RiBrushLine className="size-4" /> Anúncios ({form.ads.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {(adData.cta_type || adData.link || adData.primary_text) && (
            <>
              <ReviewRow label="CTA" value={ctaLabel} />
              <ReviewRow label="Link" value={adData.link || "—"} />
              {adData.extra_params && <ReviewRow label="Params Extra" value={adData.extra_params} />}
              <ReviewRow label="Texto" value={truncateText(adData.primary_text, 80)} />
              <ReviewRow label="Título" value={adData.headline || "—"} />
            </>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {form.ads.map((ad, i) => (
              <div key={i} className="w-16 h-16 rounded overflow-hidden border bg-muted">
                {ad.media_type === "video" ? (
                  <video src={ad.preview_url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={ad.preview_url} className="w-full h-full object-cover" alt="" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
