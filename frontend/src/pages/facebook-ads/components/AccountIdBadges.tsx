import { useState, useCallback, type KeyboardEvent } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RiCloseLine, RiAddCircleLine } from "@remixicon/react";
import { Button } from "@/components/ui/button";

interface AccountIdBadgesProps {
  accountIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  hideList?: boolean;
}

/** Strips "act_" prefix if present and returns only the numeric part */
function stripActPrefix(value: string): string {
  return value.replace(/^act_/i, "").trim();
}

/** Ensures the final ID always has "act_" prefix */
function ensureActPrefix(value: string): string {
  const raw = stripActPrefix(value);
  return raw ? `act_${raw}` : "";
}

export function AccountIdBadges({ accountIds, onChange, disabled, hideList }: AccountIdBadgesProps) {
  const [inputValue, setInputValue] = useState("");

  const addId = useCallback(() => {
    const fullId = ensureActPrefix(inputValue);
    if (!fullId || fullId === "act_") return;
    if (accountIds.includes(fullId)) {
      setInputValue("");
      return;
    }
    onChange([...accountIds, fullId]);
    setInputValue("");
  }, [inputValue, accountIds, onChange]);

  const removeId = (id: string) => {
    onChange(accountIds.filter((v) => v !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addId();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip "act_" if user pastes the full ID — we already show the prefix visually
    const raw = stripActPrefix(e.target.value);
    setInputValue(raw);
  };

  return (
    <div className="space-y-2">
      <Label>
        Ad Account ID
        {!hideList && accountIds.length > 0 && (
          <span className="ml-1.5 text-xs text-muted-foreground">
            ({accountIds.length} {accountIds.length === 1 ? "conta" : "contas"})
          </span>
        )}
      </Label>

      {!hideList && accountIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30 max-h-[120px] overflow-y-auto">
          {accountIds.map((id) => (
            <Badge
              key={id}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-mono"
            >
              {id}
              <button
                type="button"
                onClick={() => removeId(id)}
                className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5 transition-colors"
                disabled={disabled}
              >
                <RiCloseLine className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <span className="pl-3 text-sm font-mono text-muted-foreground select-none">
            act_
          </span>
          <input
            placeholder="XXXXXXXXXX"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="flex-1 bg-transparent py-2 pr-3 pl-0 text-sm font-mono outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addId}
          disabled={disabled || !inputValue.trim()}
          className="shrink-0"
        >
          <RiAddCircleLine className="size-4" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Pressione <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd> ou clique no <span className="font-bold">+</span> para adicionar. Adicione múltiplas contas para cadastrá-las com o mesmo token.
      </p>
    </div>
  );
}
