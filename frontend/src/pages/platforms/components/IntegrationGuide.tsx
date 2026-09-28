import { RiQuestionLine, RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { PlatformLogo } from "@/components/PlatformLogo";

const KIWIFY_STEPS = [
  'Acesse o painel da Kiwify e clique em "Apps"',
  'Clique em "Webhooks"',
  'Clique em "Criar Webhook"',
  "Coloque um nome para o webhook",
  "Cole a URL criada aqui no campo de URL",
  'Deixe marcado "Todos que sou produtor" (já vem marcado)',
  'Em evento, clique em "Selecionar todos" para selecionar todos os eventos',
  "Salve o webhook",
];

const PAYT_STEPS = [
  'Acesse o painel da PayT e clique em "Ferramentas"',
  'Clique em "Postbacks"',
  'Clique em "Cadastrar" e coloque um nome',
  'Clique em "Selecionar produto" e marque "Todos os produtos"',
  'Em tipo, selecione "PayT V1"',
  "Cole a URL criada aqui no campo de URL",
  "Em eventos, selecione todos",
  'Clique em "Testar URL"',
  'Clique em "Salvar e Voltar"',
];

const WIAPY_STEPS = [
  'Acesse o painel da Wiapy e clique em "Configurações"',
  'Clique em "Webhooks" ou "Integrações"',
  'Clique em "Adicionar Webhook" / "Novo Webhook"',
  "Cole a URL criada aqui no campo de URL",
  "Marque todos os eventos (pagamento aprovado, pendente, reembolso, chargeback)",
  "Salve o webhook",
];

const API_FIELDS = [
  { field: "external_id", type: "string", required: true,  desc: "ID único da transação no seu sistema" },
  { field: "status",      type: "string", required: true,  desc: '"approved" | "pending" | "refunded" | "chargeback" | "trial"' },
  { field: "amount",      type: "float",  required: true,  desc: "Valor em reais. Ex: 197.00" },
  { field: "product_external_id", type: "string", required: true, desc: "ID do produto no seu sistema" },
  { field: "product_name",        type: "string", required: true, desc: "Nome do produto (deve coincidir com o cadastrado)" },
  { field: "customer_email",      type: "string", required: true, desc: "E-mail do comprador" },
  { field: "customer_name",       type: "string", required: false, desc: "Nome completo do comprador" },
  { field: "customer_cpf",        type: "string", required: false, desc: "CPF apenas números" },
  { field: "customer_phone",      type: "string", required: false, desc: "Telefone com DDD" },
  { field: "utm_source",          type: "string", required: false, desc: 'Ex: "facebook"' },
  { field: "utm_medium",          type: "string", required: false, desc: 'Ex: "cpc"' },
  { field: "utm_campaign",        type: "string", required: false, desc: "Nome da campanha" },
  { field: "utm_content",         type: "string", required: false, desc: "Criativo / anúncio" },
  { field: "utm_term",            type: "string", required: false, desc: "Termo de busca" },
  { field: "src",                 type: "string", required: false, desc: "SRC personalizado" },
  { field: "checkout_url",        type: "string", required: false, desc: "URL do checkout da venda" },
  { field: "order_bumps",         type: "array",  required: false, desc: '[{ "name": "...", "amount": 27.00 }]' },
];

const EXAMPLE_PAYLOAD = `POST /api/webhook/api/{slug}
Content-Type: application/json

{
  "external_id": "ORD-001",
  "status": "approved",
  "amount": 197.00,
  "product_external_id": "PROD-001",
  "product_name": "Curso de Marketing",
  "customer_email": "joao@exemplo.com",
  "customer_name": "João da Silva",
  "utm_source": "facebook",
  "utm_campaign": "camp-principal"
}`;

function StepsList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1.5 pl-1">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed">
          <span className="shrink-0 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold mt-0.5">
            {i + 1}
          </span>
          <span className="text-foreground/80">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="absolute top-2 right-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
    >
      {copied ? <RiCheckLine className="size-3 text-green-500" /> : <RiFileCopyLine className="size-3" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function ApiSection() {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Endpoint</p>
        <code className="block text-[11px] bg-muted rounded px-2 py-1.5 font-mono text-foreground/80 break-all">
          POST /api/webhook/api/<span className="text-primary">{"{slug}"}</span>
        </code>
        <p className="text-[10px] text-muted-foreground">
          O <span className="font-semibold text-foreground/70">{"{slug}"}</span> é gerado automaticamente ao criar o endpoint — copie a URL completa exibida no card.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Campos do payload</p>
        <div className="rounded-md border border-border/50 overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Campo</th>
                <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Tipo</th>
                <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {API_FIELDS.map((f, i) => (
                <tr key={f.field} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-2 py-1.5 font-mono text-foreground/80 whitespace-nowrap">
                    {f.field}
                    {f.required && <span className="ml-1 text-red-500">*</span>}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{f.type}</td>
                  <td className="px-2 py-1.5 text-muted-foreground leading-relaxed">{f.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-muted-foreground"><span className="text-red-500">*</span> Obrigatório</p>
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Exemplo</p>
        <div className="relative">
          <pre className="text-[10px] bg-muted rounded px-2.5 py-2 font-mono text-foreground/80 overflow-x-auto leading-relaxed whitespace-pre-wrap pr-16">
            {EXAMPLE_PAYLOAD}
          </pre>
          <CopyButton text={EXAMPLE_PAYLOAD} />
        </div>
      </div>
    </div>
  );
}

export function IntegrationGuide() {
  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="size-9">
                <RiQuestionLine className="size-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Como integrar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-[460px] p-0">
        <div className="max-h-[80vh] overflow-y-auto p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Como configurar Webhooks</h4>
            <p className="text-[11px] text-muted-foreground">
              Siga o tutorial da sua plataforma de pagamento ou use a API direta
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="kiwify" className="border-border/50">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <PlatformLogo platform="kiwify" size="md" />
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <StepsList steps={KIWIFY_STEPS} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payt" className="border-border/50">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <PlatformLogo platform="payt" size="md" />
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <StepsList steps={PAYT_STEPS} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="wiapy" className="border-border/50">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <PlatformLogo platform="wiapy" size="md" />
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <StepsList steps={WIAPY_STEPS} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="api" className="border-border/50">
              <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                <span className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center size-6 rounded bg-primary/10 text-primary text-[10px] font-bold">{"{}"}</span>
                  <span>API Direta</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3 pt-1">
                <ApiSection />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <p className="text-[10px] text-primary/80 leading-relaxed">
              <strong>Dica:</strong> Após criar o endpoint aqui no Log Pose, copie
              a URL gerada e cole na plataforma de pagamento seguindo o tutorial acima.
              Selecione todos os eventos para capturar vendas, reembolsos e abandonos.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
