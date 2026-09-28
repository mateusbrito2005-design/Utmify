import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiAlertLine } from "@remixicon/react";

interface UpdateTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (accessToken: string) => Promise<void>;
  accountLabel: string;
  isLoading: boolean;
}

export function UpdateTokenModal({
  open,
  onOpenChange,
  onUpdate,
  accountLabel,
  isLoading,
}: UpdateTokenModalProps) {
  const [token, setToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    await onUpdate(token.trim());
    setToken("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RiAlertLine className="size-5 text-destructive" />
            Atualizar Token — {accountLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          O token dessa conta está inválido ou expirado. Gere um novo token no
          Meta for Developers e cole abaixo para restaurar a integração.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-token">Novo Access Token</Label>
            <Input
              id="new-token"
              placeholder="Cole o novo token aqui..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!token.trim() || isLoading}>
              {isLoading ? "Salvando..." : "Atualizar Token"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
