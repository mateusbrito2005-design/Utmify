import { useRef } from "react";
import { RiCloseLine, RiFilmLine, RiImageLine, RiUploadCloud2Line } from "@remixicon/react";
import type { AdFormData } from "../hooks/useCampaignForm";

interface AdCardProps {
  ad: AdFormData;
  index: number;
  onUpdate: (data: Partial<AdFormData>) => void;
  onRemove: () => void;
  onReplaceMedia: (file: File) => void;
}

export function AdCard({ ad, index, onUpdate, onRemove, onReplaceMedia }: AdCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    onReplaceMedia(file);
    onUpdate({
      file,
      preview_url: URL.createObjectURL(file),
      media_type: isVideo ? "video" : "image",
    });
    e.target.value = "";
  };
  const isVideo = ad.media_type === "video";

  return (
    <div className="relative group border rounded-lg overflow-hidden bg-card hover:border-primary/30 transition-colors">
      {/* Preview */}
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <video
            src={ad.preview_url}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        ) : (
          <img
            src={ad.preview_url}
            alt={`AD ${String(index + 1).padStart(2, "0")}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Badge tipo */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 text-white text-xs">
            {isVideo ? <RiFilmLine className="size-3" /> : <RiImageLine className="size-3" />}
            {isVideo ? "Vídeo" : "Imagem"}
          </span>
        </div>

        {/* Ações no hover */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1 rounded-full bg-black/50 text-white hover:bg-primary transition-colors"
            title="Alterar mídia"
          >
            <RiUploadCloud2Line className="size-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded-full bg-black/50 text-white hover:bg-destructive transition-colors"
            title="Remover criativo"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>

        {/* Input oculto para troca de mídia */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,video/mp4,video/quicktime"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Nome do criativo */}
      <div className="p-3">
        <input
          className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors pb-1"
          placeholder={`AD ${String(index + 1).padStart(2, "0")}`}
          value={ad.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>
    </div>
  );
}
