import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { CampaignFormState } from "./useCampaignForm";
import { generateAdName } from "../utils/naming";
import { buildExportPayload } from "../utils/exportImport";
import { usePublishProgress } from "@/contexts/PublishProgressContext";

/**
 * Hook que encapsula a lógica de publicação de campanha.
 * Monta payload (shared ou per-account), envia e trata resultado via contexto global.
 */
export function usePublishCampaign(
  form: CampaignFormState,
  resetForm: () => void,
) {
  const navigate = useNavigate();
  const { isPublishing, publish } = usePublishProgress();

  const handlePublish = useCallback(async () => {
    const files = form.ads.map((ad) => ad.file).filter(Boolean) as File[];
    const ads = form.ads.map((ad, i) => ({
      name: ad.name || generateAdName(form.campaignName, i),
      primary_text: ad.primary_text, headline: ad.headline,
      description: ad.description, link: ad.link, display_url: ad.display_url,
      utm_params: ad.utm_params, extra_params: ad.extra_params, cta_type: ad.cta_type,
      media_type: ad.media_type, media_index: i,
    }));

    // Per-account configs (quando não compartilhado)
    const accountConfigs = !form.sharedMetaConfig && form.accountIds.length > 1
      ? Object.fromEntries(
          form.accountIds.map((id) => {
            const cfg = form.accountMetaConfigs[id] ?? {};
            return [id, {
              pixel_id: cfg.pixelId || "",
              page_id: cfg.pageId || "",
              instagram_actor_id: cfg.instagramActorId || "",
            }];
          })
        )
      : undefined;

    const payload = {
      ...buildExportPayload(form),
      account_ids: form.accountIds,
      campaign_count: form.campaignCount,
      ads,
      ...(accountConfigs ? { account_configs: accountConfigs } : {}),
    };

    await publish(payload, files, () => {
      resetForm();
      navigate("/campaigns");
    });
  }, [form, resetForm, navigate, publish]);

  return { isPublishing, handlePublish };
}
