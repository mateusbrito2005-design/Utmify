import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RiArrowLeftLine, RiArrowRightLine, RiRocketLine, RiDownloadLine, RiUploadLine } from "@remixicon/react";
import { useFacebookAccounts } from "@/hooks/useFacebookAccounts";
import { useCampaignForm } from "./hooks/useCampaignForm";
import { usePixels, usePages, useInterestSearch, useMultiAccountMeta } from "./hooks/useMetaData";
import { usePublishCampaign } from "./hooks/usePublishCampaign";
import { StepperNav } from "./components/StepperNav";
import { AccountStep } from "./components/AccountStep";
import { CampaignStep } from "./components/CampaignStep";
import { AdSetStep } from "./components/AdSetStep";
import { AdsStep } from "./components/AdsStep";
import { ReviewStep } from "./components/ReviewStep";
import { handleExportCampaign, handleImportCampaign, applyDataToForm } from "./utils/exportImport";

export default function CampaignsCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateApplied = useRef(false);
  const { accounts, isLoading: accountsLoading } = useFacebookAccounts();
  const {
    form, currentStep, updateField, addAd, updateAd, removeAd,
    updateBulkData, updateAccountConfig, resetForm, nextStep, prevStep, goToStep,
  } = useCampaignForm();
  const { pixels, load: loadPixels } = usePixels();
  const { pages, instagramAccounts, load: loadPages } = usePages();
  const { results: interests, search: searchInterest } = useInterestSearch();
  const { dataMap: multiAccountData, loadForAccounts } = useMultiAccountMeta();
  const { isPublishing, handlePublish } = usePublishCampaign(form, resetForm);

  const primaryAccountId = form.accountIds[0] ?? null;

  // Carrega meta data da conta principal (shared mode)
  useEffect(() => {
    if (primaryAccountId) {
      loadPixels(primaryAccountId);
      loadPages(primaryAccountId);
    }
  }, [primaryAccountId, loadPixels, loadPages]);

  // Carrega meta data de todas contas (per-account mode)
  useEffect(() => {
    if (!form.sharedMetaConfig && form.accountIds.length > 1) {
      const missingIds = form.accountIds.filter((id) => !multiAccountData[id]);
      if (missingIds.length > 0) loadForAccounts(missingIds);
    }
  }, [form.sharedMetaConfig, form.accountIds, multiAccountData, loadForAccounts]);

  // Aplicar dados duplicados via navigation state
  useEffect(() => {
    const state = location.state as { duplicateData?: Record<string, unknown> } | null;
    if (state?.duplicateData && !duplicateApplied.current) {
      duplicateApplied.current = true;
      applyDataToForm(state.duplicateData, updateField);
      toast.success("Campanha duplicada! Revise os dados e adicione as mídias.");
      window.history.replaceState({}, "");
    }
  }, [location.state, updateField]);

  // Account handlers
  const handleToggleAccount = useCallback((id: number) => {
    updateField("accountIds",
      form.accountIds.includes(id)
        ? form.accountIds.filter((a) => a !== id)
        : [...form.accountIds, id]
    );
  }, [form.accountIds, updateField]);

  const handleSelectAll = useCallback(() => updateField("accountIds", accounts.map((a) => a.id)), [accounts, updateField]);
  const handleClearAll = useCallback(() => updateField("accountIds", []), [updateField]);

  // Validação por step
  const isStepValid = useCallback((step: number): boolean => {
    if (step === 0) return form.accountIds.length > 0;
    if (step === 1) return !!form.campaignName && form.dailyBudget > 0;
    if (step === 2) {
      if (form.sharedMetaConfig || form.accountIds.length <= 1) return !!form.pixelId && !!form.pageId;
      return form.accountIds.every((id) => {
        const cfg = form.accountMetaConfigs[id];
        return cfg && !!cfg.pixelId && !!cfg.pageId;
      });
    }
    if (step === 3) return form.ads.length > 0;
    return true;
  }, [form]);

  const maxReachedStep = useMemo(() => {
    for (let i = 0; i <= 4; i++) { if (!isStepValid(i)) return i; }
    return 4;
  }, [isStepValid]);

  const safeGoToStep = useCallback((step: number) => {
    if (step <= maxReachedStep) goToStep(step);
  }, [maxReachedStep, goToStep]);

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/campaigns")}>
            <RiArrowLeftLine className="size-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-xl font-bold">Nova Campanha</h1>
          <span className="font-mono text-sm bg-muted px-2.5 py-1 rounded-md text-muted-foreground tracking-wide">
            {form.campaignCount}-{maxReachedStep >= 2 ? form.adsetCount : "x"}-{form.ads.length > 0 ? form.ads.length : "x"}
          </span>
          {form.accountIds.length > 1 && (
            <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
              ×{form.accountIds.length} contas
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleImportCampaign(updateField)}>
            <RiUploadLine className="size-4 mr-1" /> Importar
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExportCampaign(form)} disabled={!form.campaignName}>
            <RiDownloadLine className="size-4 mr-1" /> Exportar
          </Button>
        </div>
      </div>

      <StepperNav currentStep={currentStep} maxReachedStep={maxReachedStep} onStepClick={safeGoToStep} />

      <div className="min-h-[400px] overflow-auto">
        {currentStep === 0 && (
          <AccountStep accounts={accounts} selectedAccountIds={form.accountIds}
            onToggleAccount={handleToggleAccount} onSelectAll={handleSelectAll}
            onClearAll={handleClearAll} onUpdate={updateField} form={form} isLoading={accountsLoading} />
        )}
        {currentStep === 1 && <CampaignStep form={form} onUpdate={updateField} />}
        {currentStep === 2 && (
          <AdSetStep form={form} onUpdate={updateField} onUpdateAccountConfig={updateAccountConfig}
            pixels={pixels} pages={pages} instagramAccounts={instagramAccounts}
            interestResults={interests} onSearchInterest={(q) => primaryAccountId && searchInterest(primaryAccountId, q)}
            accounts={accounts} multiAccountData={multiAccountData} />
        )}
        {currentStep === 3 && (
          <AdsStep form={form} onUpdate={updateField} onAddAd={addAd} onUpdateAd={updateAd} onRemoveAd={removeAd} onUpdateBulk={updateBulkData} />
        )}
        {currentStep === 4 && <ReviewStep form={form} onUpdate={updateField} accounts={accounts} />}
      </div>

      <div className="flex justify-between pt-2 border-t">
        <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
          <RiArrowLeftLine className="size-4 mr-1" /> Anterior
        </Button>
        {currentStep < 4 ? (
          <Button onClick={nextStep} disabled={!isStepValid(currentStep)}>
            Próximo <RiArrowRightLine className="size-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handlePublish} disabled={isPublishing} className="bg-primary">
            <RiRocketLine className="size-4 mr-1" />
            {isPublishing ? "Publicando..." : "Publicar Campanha"}
          </Button>
        )}
      </div>
    </div>
  );
}
