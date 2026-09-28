import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { publishCampaign } from "@/services/campaignCreator";
import { toast } from "sonner";
import { RiUploadCloud2Line, RiCheckLine, RiErrorWarningLine } from "@remixicon/react";

interface PublishProgressContextType {
  isPublishing: boolean;
  progress: number;
  publish: (payload: any, files: File[], onSuccess: () => void) => Promise<void>;
}

const PublishProgressContext = createContext<PublishProgressContextType | undefined>(undefined);

export function PublishProgressProvider({ children }: { children: ReactNode }) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"publishing" | "success" | "error">("publishing");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPublishing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isPublishing]);

  const publish = async (payload: any, files: File[], onSuccess: () => void) => {
    setIsPublishing(true);
    setProgress(0);
    setStatus("publishing");
    setStatusMessage("Criando campanhas e conjuntos...");

    // Simular progresso enquanto espera
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p < 30) return p + 2;
        if (p < 60) return p + 1;
        if (p < 85) return p + 0.5;
        if (p < 95) return p + 0.1;
        return p;
      });
    }, 500);

    try {
      const result = await publishCampaign(payload, files);
      clearInterval(interval);
      setProgress(100);
      
      if (result.success) {
        setStatus("success");
        const camps = result.campaigns_created ?? 1;
        const plural = camps > 1 ? `${camps} campanhas` : "1 campanha";
        setStatusMessage(`${plural} publicada(s) com sucesso!`);
        toast.success(`${plural} criada(s)! ${result.ads_created} anúncio(s) publicados.`);
        onSuccess();
        setTimeout(() => setIsPublishing(false), 3000); // esconde depois de 3s
      } else {
        setStatus("error");
        const firstError = result.errors[0] || "Erro desconhecido ao publicar";
        setStatusMessage(firstError);
        toast.error(firstError);
        setTimeout(() => setIsPublishing(false), 6000);
      }
    } catch (err) {
      clearInterval(interval);
      setProgress(100);
      setStatus("error");
      const errMessage = err instanceof Error ? err.message : "Erro ao publicar";
      setStatusMessage(errMessage);
      toast.error(errMessage);
      setTimeout(() => setIsPublishing(false), 6000);
    }
  };

  return (
    <PublishProgressContext.Provider value={{ isPublishing, progress, publish }}>
      {children}
      
      {isPublishing && (
        <div className="fixed bottom-6 right-6 w-80 bg-card border border-border shadow-xl rounded-xl overflow-hidden z-[9999] flex flex-col pointer-events-auto">
          <div className="p-4 flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-1.5 flex-shrink-0 ${
              status === "publishing" ? "bg-primary/10 text-primary" :
              status === "success" ? "bg-green-500/10 text-green-500" :
              "bg-destructive/10 text-destructive"
            }`}>
              {status === "publishing" && <RiUploadCloud2Line className="size-5 animate-pulse" />}
              {status === "success" && <RiCheckLine className="size-5" />}
              {status === "error" && <RiErrorWarningLine className="size-5" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm font-semibold leading-none truncate">
                {status === "publishing" ? "Publicando..." :
                 status === "success" ? "Concluído!" : "Falha na publicação"}
              </p>
              <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                {statusMessage}
              </p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-secondary overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ease-out ${
                status === "error" ? "bg-destructive" :
                status === "success" ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      )}
    </PublishProgressContext.Provider>
  );
}

export function usePublishProgress() {
  const context = useContext(PublishProgressContext);
  if (context === undefined) {
    throw new Error("usePublishProgress must be used within a PublishProgressProvider");
  }
  return context;
}
