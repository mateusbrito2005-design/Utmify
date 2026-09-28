import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiCloseLine } from "@remixicon/react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AccountItem {
  account_id: string;
  label: string;
}

interface AccountItemsListProps {
  items: AccountItem[];
  onChange: (items: AccountItem[]) => void;
  disabled?: boolean;
}

/**
 * Lista de contas com label editável + account_id compacto.
 * Após o auto-import (discover), mostra cada conta com o nome real
 * vindo do Facebook, permitindo que o usuário edite antes de salvar.
 */
export function AccountItemsList({ items, onChange, disabled }: AccountItemsListProps) {
  if (items.length === 0) return null;

  const updateLabel = (index: number, label: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], label };
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>
        Contas Importadas
        <span className="ml-1.5 text-xs text-muted-foreground">
          ({items.length} {items.length === 1 ? "conta" : "contas"})
        </span>
      </Label>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1.5 pr-2">
          {items.map((item, index) => (
            <div
              key={item.account_id}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
            >
              <Input
                value={item.label}
                onChange={(e) => updateLabel(index, e.target.value)}
                disabled={disabled}
                className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1 flex-1 min-w-0"
                placeholder="Nome da conta"
                autoComplete="off"
              />
              <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0 select-none">
                {item.account_id}
              </span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled}
                className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors p-0.5 rounded"
              >
                <RiCloseLine className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
