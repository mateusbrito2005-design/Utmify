import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CampaignFormState } from "../hooks/useCampaignForm";
import type { PixelData, PageData, InstagramAccount } from "@/services/campaignCreator";

interface SharedMetaSelectorsProps {
  form: CampaignFormState;
  onUpdate: <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) => void;
  pixels: PixelData[];
  pages: PageData[];
  instagramAccounts: InstagramAccount[];
}

export function SharedMetaSelectors({
  form, onUpdate, pixels, pages, instagramAccounts,
}: SharedMetaSelectorsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Pixel</Label>
        <Select value={form.pixelId} onValueChange={(v) => onUpdate("pixelId", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {pixels.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Página do Facebook</Label>
        <Select value={form.pageId} onValueChange={(v) => {
          onUpdate("pageId", v);
          const page = pages.find((p) => p.id === v);
          onUpdate("pageLabel", page?.name ?? "");
        }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {pages.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Instagram</Label>
        <Select
          value={form.instagramActorId || "none"}
          onValueChange={(v) => {
            const id = v === "none" ? "" : v;
            onUpdate("instagramActorId", id);
            const ig = instagramAccounts.find((a) => a.id === v);
            onUpdate("instagramLabel", ig ? `@${ig.username}` : "");
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem Instagram</SelectItem>
            {instagramAccounts.map((ig) => (
              <SelectItem key={ig.id} value={ig.id}>@{ig.username} ({ig.id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
