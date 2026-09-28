import { useState, useCallback } from "react";
import { DEFAULT_UTM_PARAMS, DEFAULT_CTA } from "../utils/defaults";
import { DEFAULT_COUNTRY, DEFAULT_LOCALES } from "../utils/targeting";
import { getNextMidnightSP } from "../utils/schedule";
import type {
  AdFormData, BulkEditData, AccountMetaConfig, CampaignFormState,
} from "../types";
import { INITIAL_BULK_DATA } from "../types";

// Re-export para retrocompatibilidade dos imports existentes
export type { AdFormData, BulkEditData, AccountMetaConfig, CampaignFormState };
export { INITIAL_BULK_DATA };

const INITIAL_STATE: CampaignFormState = {
  accountIds: [],
  videoId: "",
  videoLabel: "",
  checkoutId: "",
  checkoutLabel: "",
  productId: "",
  productLabel: "",
  campaignName: "",
  campaignCount: 1,
  dailyBudget: 0,
  bidStrategy: "VOLUME",
  bidAmount: null,
  roasFloor: null,
  adsetName: "",
  adsetCount: 1,
  pixelId: "",
  startTime: getNextMidnightSP(),
  ageMin: 18,
  ageMax: 65,
  gender: 0,
  country: DEFAULT_COUNTRY,
  locales: [...DEFAULT_LOCALES],
  interests: [],
  pageId: "",
  pageLabel: "",
  instagramActorId: "",
  instagramLabel: "",
  sharedMetaConfig: true,
  accountMetaConfigs: {},
  batchMode: true,
  bulkData: { ...INITIAL_BULK_DATA },
  ads: [],
  publishActive: false,
};

export function useCampaignForm() {
  const [form, setForm] = useState<CampaignFormState>({ ...INITIAL_STATE });
  const [currentStep, setCurrentStep] = useState(0);

  const updateField = useCallback(
    <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "bidStrategy") {
          next.bidAmount = null;
          next.roasFloor = null;
        }
        return next;
      });
    },
    []
  );

  const addAd = useCallback((file: File) => {
    const isVideo = file.type.startsWith("video/");
    setForm((prev) => {
      const bulk = prev.bulkData;
      const firstAd = prev.ads[0];
      const source = prev.batchMode ? bulk : (firstAd || bulk);
      const newAd: AdFormData = {
        name: "",
        primary_text: source.primary_text || "",
        headline: source.headline || "",
        description: source.description || "",
        link: source.link || "",
        display_url: source.display_url || "",
        utm_params: DEFAULT_UTM_PARAMS,
        extra_params: source.extra_params || "",
        cta_type: source.cta_type || DEFAULT_CTA,
        media_type: isVideo ? "video" : "image",
        file,
        preview_url: URL.createObjectURL(file),
      };
      return { ...prev, ads: [...prev.ads, newAd] };
    });
  }, []);

  const updateAd = useCallback((index: number, data: Partial<AdFormData>) => {
    setForm((prev) => {
      const ads = [...prev.ads];
      ads[index] = { ...ads[index], ...data };
      return { ...prev, ads };
    });
  }, []);

  const removeAd = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, ads: prev.ads.filter((_, i) => i !== index) }));
  }, []);

  const updateBulkData = useCallback((data: Partial<BulkEditData>) => {
    setForm((prev) => {
      const newBulk = { ...prev.bulkData, ...data };
      const ads = prev.ads.map((ad) => ({ ...ad, ...data }));
      return { ...prev, bulkData: newBulk, ads };
    });
  }, []);

  const updateAccountConfig = useCallback(
    (accountId: number, data: Partial<AccountMetaConfig>) => {
      setForm((prev) => ({
        ...prev,
        accountMetaConfigs: {
          ...prev.accountMetaConfigs,
          [accountId]: {
            pixelId: prev.accountMetaConfigs[accountId]?.pixelId ?? "",
            pageId: prev.accountMetaConfigs[accountId]?.pageId ?? "",
            pageLabel: prev.accountMetaConfigs[accountId]?.pageLabel ?? "",
            instagramActorId: prev.accountMetaConfigs[accountId]?.instagramActorId ?? "",
            instagramLabel: prev.accountMetaConfigs[accountId]?.instagramLabel ?? "",
            ...data,
          },
        },
      }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_STATE, startTime: getNextMidnightSP() });
    setCurrentStep(0);
  }, []);

  const nextStep = useCallback(() => setCurrentStep((s) => Math.min(s + 1, 4)), []);
  const prevStep = useCallback(() => setCurrentStep((s) => Math.max(s - 1, 0)), []);
  const goToStep = useCallback((step: number) => setCurrentStep(step), []);

  return {
    form, currentStep, updateField, addAd, updateAd, removeAd,
    updateBulkData, updateAccountConfig, resetForm, nextStep, prevStep, goToStep,
  };
}
