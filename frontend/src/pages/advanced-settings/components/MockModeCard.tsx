import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RiTestTubeLine } from "@remixicon/react";
import { useMockMode } from "@/hooks/useMockMode";
import { toast } from "sonner";

export function MockModeCard() {
  const { isMock, deactivateMock } = useMockMode();

  const handleToggle = (checked: boolean) => {
    if (checked) {
      sessionStorage.setItem("mock_mode", "true");
      toast.success("Dados de exemplo ativados");
      // Adiciona ?mock=true na URL e recarrega para inicializar o interceptor
      const url = new URL(window.location.href);
      url.searchParams.set("mock", "true");
      window.location.replace(url.toString());
    } else {
      deactivateMock();
      toast.success("Dados de exemplo desativados");
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2">
            <RiTestTubeLine className="size-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Dados de Exemplo</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visualize o dashboard com dados fictícios para demonstração
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="mock-toggle" className="text-sm font-medium">
              Ativar modo de demonstração
            </Label>
            <p className="text-xs text-muted-foreground">
              Substitui todas as requisições por dados mockados — não afeta o banco de dados
            </p>
          </div>
          <Switch
            id="mock-toggle"
            checked={isMock}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
