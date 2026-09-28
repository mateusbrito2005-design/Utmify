import { RiQuestionLine, RiExternalLinkLine } from "@remixicon/react";
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

const SECTIONS = [
  {
    value: "app",
    label: "1. Criar App de Desenvolvedor",
    steps: [
      'Acesse developers.facebook.com e faça login com sua conta Meta',
      'Clique em "Meus Apps" → "Criar App"',
      'Em tipo, selecione "Outro" e clique em "Avançar"',
      'Selecione "Business" como categoria e clique em "Avançar"',
      'Dê um nome ao app (ex: "Log Pose Integration") e clique em "Criar App"',
      'Associe o app ao seu Business Manager quando solicitado',
    ],
  },
  {
    value: "marketing",
    label: "2. Adicionar Marketing API",
    steps: [
      'No painel do app, clique em "Adicionar produto" no menu lateral',
      'Encontre "Marketing API" e clique em "Configurar"',
      'Na seção "Marketing API", clique em "Ferramentas" (no sub-menu)',
      'Anote: você está agora na tela de geração de tokens',
    ],
  },
  {
    value: "system_user",
    label: "3. Criar Usuário de Sistema",
    steps: [
      'Acesse business.facebook.com → "Configurações do negócio"',
      'No menu lateral, vá em "Usuários" → "Usuários do sistema"',
      'Clique em "Adicionar" e dê um nome (ex: "Log Pose Bot")',
      'Defina o papel como "Administrador" e clique em "Criar usuário do sistema"',
    ],
  },
  {
    value: "connect_user",
    label: "4. Conectar Usuário ao App",
    steps: [
      'Ainda em "Usuários do sistema", selecione o usuário criado',
      'Clique em "Adicionar ativos"',
      'Selecione "Apps" e marque o app de desenvolvedor que você criou',
      'Marque a permissão "Gerenciar campanhas" e clique em "Salvar alterações"',
      'Também adicione a conta de anúncio: em "Adicionar ativos" → "Contas de anúncio"',
      'Marque a conta e habilite "Gerenciar campanhas" → "Salvar alterações"',
    ],
  },
  {
    value: "token",
    label: "5. Gerar Token de Acesso Permanente",
    steps: [
      'Na tela "Usuários do sistema", selecione o usuário e clique em "Gerar novo token"',
      'Selecione o app que você criou na lista',
      'Em permissões, marque: ads_read, ads_management, business_management, read_insights',
      'Defina a validade como "Sem data de validade" (token permanente)',
      'Clique em "Gerar token" e copie o token exibido — guarde em local seguro!',
      'Cole esse token no campo "Access Token" do modal de configuração aqui no Log Pose',
    ],
  },
  {
    value: "account_id",
    label: "6. Obter Ad Account ID / BM ID",
    steps: [
      'Para o Ad Account ID: acesse business.facebook.com → "Contas de anúncio"',
      'Selecione a conta — o ID aparece no formato "act_XXXXXXXXXX" na URL e no painel',
      'Cole apenas os números (sem "act_") no campo "Ad Account ID" do Log Pose',
      'Para o BM ID (Business Manager): acesse business.facebook.com → "Configurações do negócio"',
      'O ID aparece na URL: business.facebook.com/XXXXXXXXXX/settings — copie esse número',
      'Alternativamente, em "Informações da empresa" o ID fica visível na página',
    ],
  },
];

function StepsList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-1.5 pl-1">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed">
          <span className="shrink-0 flex size-5 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2] text-[10px] font-bold mt-0.5">
            {i + 1}
          </span>
          <span className="text-foreground/80">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function FacebookAdsGuide() {
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
            <p>Como configurar o Facebook Ads</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-[420px] p-0">
        <div className="p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Como configurar o Facebook Ads</h4>
            <p className="text-[11px] text-muted-foreground">
              Siga o passo a passo para obter o Access Token e o Ad Account ID
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {SECTIONS.map((section) => (
              <AccordionItem key={section.value} value={section.value} className="border-border/50">
                <AccordionTrigger className="text-xs font-semibold py-2.5 hover:no-underline">
                  {section.label}
                </AccordionTrigger>
                <AccordionContent className="pb-3 pt-1">
                  <StepsList steps={section.steps} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="rounded-lg border border-[#1877F2]/20 bg-[#1877F2]/5 p-2.5 space-y-1.5">
            <p className="text-[10px] text-[#1877F2]/80 leading-relaxed">
              <strong>Dica:</strong> Use um Usuário de Sistema em vez do seu usuário pessoal para garantir que o token não expire e não fique vinculado a uma pessoa.
            </p>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-[#1877F2] hover:underline"
            >
              <RiExternalLinkLine className="size-3" />
              Abrir Facebook for Developers
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
