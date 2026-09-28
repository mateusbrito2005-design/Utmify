import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FacebookAccountAPI } from "@/services/integrations";
import { RiBankLine } from "@remixicon/react";

export function AccountsReviewCard({ accounts }: { accounts: FacebookAccountAPI[] }) {
  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <RiBankLine className="size-4" /> Contas de Anúncio ({accounts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {accounts.map((acc) => (
            <Badge key={acc.id} variant="secondary" className="text-xs gap-1">
              {acc.label}
              <span className="opacity-60 font-mono">({acc.account_id})</span>
            </Badge>
          ))}
        </div>
        {accounts.length > 1 && (
          <p className="text-xs text-muted-foreground mt-2">
            A mesma estrutura será criada em cada conta acima, sequencialmente.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

export const truncateText = (str: string, max: number) =>
  !str ? "—" : str.length > max ? str.slice(0, max) + "..." : str;
