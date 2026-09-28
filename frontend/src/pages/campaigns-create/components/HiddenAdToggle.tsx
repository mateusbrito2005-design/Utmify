import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RiEyeOffLine, RiInformationLine, RiLinksLine } from "@remixicon/react";

interface HiddenAdToggleProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Toggle de "Esconder Anúncio" com input de display link.
 * O display link é exibido no anúncio no lugar do link real, dificultando
 * que concorrentes encontrem os criativos.
 */
export function HiddenAdToggle({ value, onChange }: HiddenAdToggleProps) {
  const [enabled, setEnabled] = useState(!!value);
  const [touched, setTouched] = useState(false);

  const handleToggle = useCallback(
    (active: boolean) => {
      setEnabled(active);
      if (!active) onChange("");
    },
    [onChange]
  );

  const handleChange = useCallback(
    (raw: string) => {
      let cleaned = raw.replace(/^https?:\/\//, "").trim();
      const qIdx = cleaned.indexOf("?");
      if (qIdx >= 0) cleaned = cleaned.slice(0, qIdx);
      onChange(cleaned ? `https://${cleaned}` : "");
    },
    [onChange]
  );

  const displayValue = value.replace(/^https?:\/\//, "");
  const isValid = !value || isValidUrl(value);
  const showError = touched && value && !isValid;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <RiEyeOffLine className="size-3.5 text-muted-foreground" />
          <Label className="text-xs cursor-pointer" htmlFor="hidden-ad-toggle">
            Esconder Anúncio
          </Label>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <RiInformationLine className="size-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="flex flex-col gap-1 max-w-64 text-xs leading-relaxed p-3">
                <p className="font-semibold">O que é o Display Link?</p>
                <p>
                  O Facebook usa o <strong>display link</strong> como o domínio
                  exibido no anúncio — não a URL real de destino.
                </p>
                <p>
                  Ao inserir um link diferente aqui, concorrentes que souberem
                  o domínio real da sua oferta <strong>não encontrarão</strong> seus
                  criativos facilmente na biblioteca de anúncios.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Switch
          id="hidden-ad-toggle"
          checked={enabled}
          onCheckedChange={handleToggle}
          className="scale-75"
        />
      </div>

      {/* Input — aparece apenas quando ativado */}
      {enabled && (
        <div className="space-y-1.5">
          <div className="flex">
            <div className="flex items-center gap-1 px-2.5 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm shrink-0">
              <RiLinksLine className="size-3.5" />
              <span className="text-xs font-mono">https://</span>
            </div>
            <Input
              className={`rounded-l-none font-mono text-xs ${
                showError ? "border-destructive focus-visible:ring-destructive/30" : ""
              }`}
              placeholder="link-qualquer-aleatorio.com"
              value={displayValue}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => setTouched(true)}
              autoComplete="off"
            />
          </div>
          {showError && (
            <p className="text-[11px] text-destructive">
              URL inválida. Exemplo: cloaker.com/oferta
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Esse link aparece no anúncio no lugar do link real (display link). Use qualquer domínio válido.
          </p>
        </div>
      )}
    </div>
  );
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}
