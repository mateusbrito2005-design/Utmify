import type { InterestData } from "@/services/campaignCreator";
import { DEFAULT_CTA } from "./utils/defaults";

export interface AdFormData {
  name: string;
  primary_text: string;
  headline: string;
  description: string;
  link: string;
  display_url: string;
  utm_params: string;
  extra_params: string;
  cta_type: string;
  media_type: "image" | "video";
  file: File | null;
  preview_url: string;
}

/** Dados da edição em massa — persistem independente dos ads */
export interface BulkEditData {
  primary_text: string;
  headline: string;
  description: string;
  link: string;
  display_url: string;
  extra_params: string;
  cta_type: string;
}

export const INITIAL_BULK_DATA: BulkEditData = {
  primary_text: "",
  headline: "",
  description: "",
  link: "",
  display_url: "",
  extra_params: "",
  cta_type: DEFAULT_CTA,
};

/** Configuração Meta (pixel/page/ig) por conta de anúncio */
export interface AccountMetaConfig {
  pixelId: string;
  pageId: string;
  pageLabel: string;
  instagramActorId: string;
  instagramLabel: string;
}

export interface CampaignFormState {
  // Step 0 — Contas de anúncio (multi-select)
  accountIds: number[];
  videoId: string;
  videoLabel: string;
  checkoutId: string;
  checkoutLabel: string;
  productId: string;
  productLabel: string;
  // Step 1 — Campanha
  campaignName: string;
  campaignCount: number;
  dailyBudget: number;
  bidStrategy: string;
  bidAmount: number | null;
  roasFloor: number | null;
  // Step 2 — Conjunto
  adsetName: string;
  adsetCount: number;
  pixelId: string;
  startTime: string;
  ageMin: number;
  ageMax: number;
  gender: number;
  country: string;
  locales: number[];
  interests: InterestData[];
  pageId: string;
  pageLabel: string;
  instagramActorId: string;
  instagramLabel: string;
  // Multi-account meta config
  sharedMetaConfig: boolean;
  accountMetaConfigs: Record<number, AccountMetaConfig>;
  // Step 3 — Anúncios
  batchMode: boolean;
  bulkData: BulkEditData;
  ads: AdFormData[];
  // Step 4 — Revisão
  publishActive: boolean;
}
