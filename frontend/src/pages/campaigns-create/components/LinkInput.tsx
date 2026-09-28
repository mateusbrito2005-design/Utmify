import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiLinksLine } from "@remixicon/react";

interface LinkInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

/**
 * Input de URL com prefixo https:// fixo e validação visual.
 * - Auto-prepend https:// se o usuário colar sem protocolo
 * - Validação visual (borda vermelha) se URL inválida
 * - Strip de query params (? e tudo depois)
 */
export function LinkInput({ value, onChange, label = "Link de Destino" }: LinkInputProps) {
  const [touched, setTouched] = useState(false);

  // Remove https:// do display (o prefixo visual é fixo)
  const displayValue = value.replace(/^https?:\/\//, "");

  const handleChange = useCallback((raw: string) => {
    // Remove protocolo caso o user cole a URL inteira
    let cleaned = raw.replace(/^https?:\/\//, "").trim();

    // Strip query params
    const qIdx = cleaned.indexOf("?");
    if (qIdx >= 0) cleaned = cleaned.slice(0, qIdx);

    // Salva sempre com https://
    onChange(cleaned ? `https://${cleaned}` : "");
  }, [onChange]);

  const isValid = !value || isValidUrl(value);
  const showError = touched && value && !isValid;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex">
        <div className="flex items-center gap-1 px-2.5 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm shrink-0">
          <RiLinksLine className="size-3.5" />
          <span className="text-xs font-mono">https://</span>
        </div>
        <Input
          className={`rounded-l-none ${showError ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
          placeholder="suaoferta.com/checkout"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => setTouched(true)}
          autoComplete="off"
        />
      </div>
      {showError && (
        <p className="text-[11px] text-destructive">URL inválida. Exemplo: suaoferta.com/checkout</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Apenas a URL base. Parâmetros ?x=x devem ser adicionados em "Parâmetros Adicionais".
      </p>
    </div>
  );
}

/** Valida se é uma URL https válida */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.includes(".");
  } catch {
    return false;
  }
}
