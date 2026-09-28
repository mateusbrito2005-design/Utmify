import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FacebookAccountAPI } from "@/services/integrations";
import {
  RiArrowDownSLine,
  RiCloseLine,
  RiSearchLine,
} from "@remixicon/react";

interface AccountMultiSelectProps {
  accounts: FacebookAccountAPI[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function AccountMultiSelect({
  accounts, selectedIds, onToggle, onSelectAll, onClearAll,
}: AccountMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return accounts;
    const q = search.toLowerCase();
    return accounts.filter(
      (a) => a.label.toLowerCase().includes(q) || a.account_id.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const allSelected = selectedIds.length === accounts.length && accounts.length > 0;

  return (
    <div className="space-y-2">
      {/* Trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="
              flex items-center justify-between w-full px-3 py-2 text-sm
              border rounded-md bg-background hover:bg-muted/50
              transition-colors duration-150
            "
          >
            <span className={selectedIds.length === 0 ? "text-muted-foreground" : ""}>
              {selectedIds.length === 0
                ? "Selecionar contas de anúncio..."
                : `${selectedIds.length} conta${selectedIds.length > 1 ? "s" : ""} selecionada${selectedIds.length > 1 ? "s" : ""}`}
            </span>
            <RiArrowDownSLine className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          {/* Search + actions */}
          <div className="flex items-center gap-2 p-2 border-b">
            <RiSearchLine className="size-3.5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Buscar conta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
            />
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 border-b">
            <span className="text-[11px] text-muted-foreground">
              {filtered.length} conta{filtered.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={allSelected ? onClearAll : onSelectAll}
              className="text-[11px] text-primary hover:underline"
            >
              {allSelected ? "Desmarcar todas" : "Selecionar todas"}
            </button>
          </div>

          {/* List */}
          <ScrollArea className="max-h-[220px]">
            <div className="py-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma conta encontrada
                </p>
              ) : (
                filtered.map((acc) => {
                  const checked = selectedIds.includes(acc.id);
                  return (
                    <label
                      key={acc.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox checked={checked} onCheckedChange={() => onToggle(acc.id)} />
                      <span className="text-sm truncate flex-1">{acc.label}</span>
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                        {acc.account_id}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected tags */}
      {selectedIds.length > 0 && (
        <SelectedTags
          accounts={accounts}
          selectedIds={selectedIds}
          onRemove={onToggle}
          onClearAll={onClearAll}
        />
      )}
    </div>
  );
}

// ─── Selected Tags ───────────────────────────────────────────────────

interface SelectedTagsProps {
  accounts: FacebookAccountAPI[];
  selectedIds: number[];
  onRemove: (id: number) => void;
  onClearAll: () => void;
}

function SelectedTags({ accounts, selectedIds, onRemove, onClearAll }: SelectedTagsProps) {
  const selected = accounts.filter((a) => selectedIds.includes(a.id));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {selected.map((acc) => (
        <Badge
          key={acc.id}
          variant="secondary"
          className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal cursor-default"
        >
          {acc.label}
          <button
            type="button"
            onClick={() => onRemove(acc.id)}
            className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
          >
            <RiCloseLine className="size-3" />
          </button>
        </Badge>
      ))}
      {selected.length > 2 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
        >
          Limpar todas
        </button>
      )}
    </div>
  );
}
