# Especificação Técnica — Plataforma de Análise Fiscal Automatizada

> **Codinome do projeto:** _(definir)_
> **Versão:** 1.0 — MVP
> **Data:** 2026-05-06

---

## 1. Visão do produto

### 1.1 O problema
Contadores e advogados tributaristas atendem dezenas de empresas e precisam consultar regularmente documentos fiscais emitidos pela Receita Federal e PGFN (Relatório de Situação Fiscal, CND, DARF, DAS, DCTF, etc.). Esses PDFs são de leitura difícil, com formatação monoespaçada, e exigem extração manual de valores para gerar relatórios para os clientes finais.

### 1.2 A solução
Plataforma SaaS multi-tenant onde o profissional faz upload de PDFs fiscais e recebe:
1. **Extração estruturada** dos dados via LLM
2. **Tela de revisão** para confirmar/editar valores antes de processar
3. **Texto explicativo formatado** pronto para entregar ao cliente
4. **Dashboard visual** com indicadores e métricas
5. **Histórico comparativo** entre emissões da mesma empresa ao longo do tempo

### 1.3 Diferencial
- Focado no contexto fiscal brasileiro (não é wrapper genérico de IA)
- Etapa de revisão humana garante precisão dos valores
- Histórico permite acompanhar evolução fiscal das empresas
- Arquitetura extensível para novos tipos de documento

### 1.4 Público-alvo
Contadores, escritórios de contabilidade, advogados tributaristas e empresários que gerenciam múltiplos CNPJs.

---

## 2. Escopo do MVP

### 2.1 Tipos de documento suportados no MVP
- ✅ **Relatório de Situação Fiscal** (Receita Federal + PGFN) — prioridade 1
- 🔜 **CND/CPD-EN** — Certidão de débitos
- 🔜 **DARF** — Documento de Arrecadação
- 🔜 **DAS** — Simples Nacional
- 🔜 **DCTF** — Declaração de débitos

> Arquitetura desde o dia 1 deve suportar adicionar novos tipos sem refatorar o core.

### 2.2 Funcionalidades MVP
- [x] Autenticação multi-tenant (organizations + members)
- [x] Upload de até 3 PDFs por vez
- [x] Detecção automática do tipo de documento
- [x] Extração estruturada via LLM
- [x] Tela de revisão editável
- [x] Geração de texto formatado
- [x] Dashboard por documento
- [x] Histórico por empresa (CNPJ)
- [x] Comparação entre relatórios da mesma empresa

### 2.3 Fora do escopo do MVP
- Integração direta com e-CAC (login automático)
- Notificações automáticas por e-mail
- API pública para terceiros
- App mobile nativo
- OCR de PDFs escaneados (assumimos PDFs com texto nativo)

---

## 3. Arquitetura técnica

### 3.1 Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework web | Next.js (App Router) | 15.x |
| Linguagem | TypeScript | 5.x |
| UI | Tailwind CSS + shadcn/ui | latest |
| Charts | Tremor (preferência) ou Recharts | latest |
| Auth | Supabase Auth | latest |
| Banco | Supabase Postgres | latest |
| Storage | Supabase Storage | latest |
| LLM primário | Claude Sonnet 4.5 (Anthropic) | claude-sonnet-4-5 |
| LLM fallback | GPT-5 (OpenAI) | gpt-5 |
| Validação | Zod | latest |
| Forms | React Hook Form | latest |
| Hosting | Vercel | — |
| Repo | GitHub | — |

### 3.2 Princípios arquiteturais

1. **Separação clara**: extração (LLM) vs cálculos (código). LLM nunca soma valores.
2. **Schema-first**: cada tipo de documento tem JSON Schema validado com Zod.
3. **Provider-agnóstico**: interface `LLMProvider` abstrai Anthropic/OpenAI.
4. **Type-safety**: TypeScript strict, Zod em todas as fronteiras.
5. **RLS sempre**: nenhuma query direta sem Row Level Security.
6. **Server-first**: extração e processamento em Server Actions / Route Handlers.

### 3.3 Estrutura de pastas

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (app)/
│   │   ├── layout.tsx          # layout autenticado com sidebar
│   │   ├── dashboard/          # visão geral da org
│   │   ├── empresas/           # lista e detalhes de empresas (CNPJs)
│   │   │   ├── page.tsx
│   │   │   └── [cnpj]/
│   │   │       ├── page.tsx
│   │   │       └── historico/
│   │   ├── upload/             # upload de PDFs
│   │   ├── relatorios/
│   │   │   └── [id]/
│   │   │       ├── revisar/    # etapa de verificação
│   │   │       └── page.tsx    # dashboard final
│   │   └── configuracoes/
│   ├── api/
│   │   ├── extract/            # POST: dispara extração
│   │   └── webhooks/
│   └── layout.tsx
├── components/
│   ├── ui/                     # shadcn components
│   ├── upload/                 # drop zone, file list
│   ├── review/                 # formulários de revisão
│   ├── dashboard/              # cards, gráficos
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # cliente browser
│   │   ├── server.ts           # cliente server
│   │   └── admin.ts            # service role (cuidado)
│   ├── llm/
│   │   ├── provider.ts         # interface LLMProvider
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   └── index.ts            # factory
│   ├── documents/              # ★ CORE EXTENSÍVEL
│   │   ├── registry.ts         # registro de tipos
│   │   ├── types.ts
│   │   ├── detector.ts         # identifica tipo do PDF
│   │   └── handlers/
│   │       ├── relatorio-situacao-fiscal/
│   │       │   ├── schema.ts
│   │       │   ├── prompt.ts
│   │       │   ├── renderer.tsx
│   │       │   └── index.ts
│   │       ├── cnd/            # placeholder
│   │       ├── darf/           # placeholder
│   │       └── ...
│   ├── calculations/           # somas, totais (puro TS)
│   ├── validators/             # Zod schemas globais
│   └── utils/
├── db/
│   ├── migrations/             # SQL via Supabase CLI
│   └── seed.sql
├── types/
└── tests/
```

### 3.4 O Document Handler Registry (peça central)

Cada tipo de documento implementa a interface:

```typescript
// lib/documents/types.ts
export interface DocumentHandler<T = unknown> {
  // Identificação
  id: string;                          // "relatorio-situacao-fiscal"
  displayName: string;                 // "Relatório de Situação Fiscal"
  category: DocumentCategory;          // "fiscal" | "tributario" | etc

  // Detecção (heurística rápida antes de chamar LLM)
  detect: (pdfText: string) => number; // 0-1 confidence

  // Extração
  schema: z.ZodSchema<T>;              // schema final validado
  extractionPrompt: string;            // prompt da LLM
  extractionSchema: object;            // JSON Schema para structured output

  // Revisão (UI)
  ReviewForm: React.FC<{ data: T; onChange: (d: T) => void }>;

  // Dashboard
  Dashboard: React.FC<{ data: T; history?: T[] }>;

  // Texto formatado
  generateText: (data: T) => string;

  // Cálculos
  computeSummary: (data: T) => DocumentSummary;
}
```

E o registry:

```typescript
// lib/documents/registry.ts
import { relatorioSituacaoFiscalHandler } from "./handlers/relatorio-situacao-fiscal";

export const handlers = {
  "relatorio-situacao-fiscal": relatorioSituacaoFiscalHandler,
  // adicionar novos aqui
} as const;

export type DocumentTypeId = keyof typeof handlers;
```

**Adicionar novo tipo de documento = criar nova pasta em `handlers/` + registrar.** Zero alteração no core.

---

## 4. Modelo de dados

### 4.1 Schema Postgres

```sql
-- Tenants
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text default 'free',
  created_at timestamptz default now()
);

create table organization_members (
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  primary key (organization_id, user_id)
);

-- Domínio
create table empresas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  cnpj text not null,
  razao_social text,
  nome_fantasia text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organization_id, cnpj)
);

create table relatorios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  empresa_id uuid references empresas(id) on delete cascade,
  document_type text not null,           -- "relatorio-situacao-fiscal"
  pdf_path text not null,                -- path no Storage
  pdf_filename text not null,
  pdf_size_bytes bigint,
  data_emissao_documento date,           -- data extraída do próprio doc
  status text not null default 'pending' check (
    status in ('pending', 'extracting', 'reviewing', 'verified', 'failed')
  ),
  error_message text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now(),
  verified_at timestamptz
);

create index on relatorios (organization_id, empresa_id, created_at desc);

create table extracoes (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid references relatorios(id) on delete cascade not null,
  raw_json jsonb not null,               -- saída crua da LLM
  verified_json jsonb,                   -- após revisão humana
  llm_provider text,                     -- "anthropic" | "openai"
  llm_model text,
  tokens_input int,
  tokens_output int,
  cost_usd numeric(10, 6),
  created_at timestamptz default now()
);

create table debitos (
  -- tabela normalizada pra queries de série temporal
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  empresa_id uuid references empresas(id) on delete cascade not null,
  relatorio_id uuid references relatorios(id) on delete cascade not null,
  tipo text not null,                    -- "sief" | "suspenso" | "pgfn"
  receita_codigo text,
  receita_descricao text,
  periodo_apuracao text,
  data_vencimento date,
  valor_original numeric(14, 2),
  saldo_devedor numeric(14, 2),
  multa numeric(14, 2),
  juros numeric(14, 2),
  saldo_consolidado numeric(14, 2),
  situacao text,
  created_at timestamptz default now()
);

create index on debitos (empresa_id, periodo_apuracao);
create index on debitos (organization_id, tipo);

-- Auditoria
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_id uuid references auth.users(id),
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
```

### 4.2 Row Level Security (obrigatório)

```sql
-- Exemplo para empresas. Replicar padrão para todas as tabelas.
alter table empresas enable row level security;

create policy "membros veem empresas da própria org"
  on empresas for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

create policy "membros podem inserir empresas na própria org"
  on empresas for insert
  with check (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

-- ... policies análogas pra update/delete e demais tabelas
```

### 4.3 Storage policies

Bucket `fiscal-documents`:
- Path pattern: `{organization_id}/{relatorio_id}/{filename}`
- Política: usuário só lê/escreve em paths da sua org

---

## 5. Schema de extração — Relatório de Situação Fiscal

```typescript
// lib/documents/handlers/relatorio-situacao-fiscal/schema.ts
import { z } from "zod";

export const debitoSchema = z.object({
  receita_codigo: z.string(),           // "1082-07"
  receita_descricao: z.string(),        // "CP-SEGUR."
  periodo_apuracao: z.string(),         // "03/2025"
  data_vencimento: z.string(),          // ISO date
  valor_original: z.number(),
  saldo_devedor: z.number(),
  multa: z.number().nullable(),
  juros: z.number().nullable(),
  saldo_consolidado: z.number().nullable(),
  situacao: z.string(),
});

export const relatorioSituacaoFiscalSchema = z.object({
  empresa: z.object({
    cnpj: z.string(),
    razao_social: z.string(),
    responsavel: z.object({
      cpf: z.string(),
      nome: z.string(),
    }).nullable(),
    endereco: z.object({
      logradouro: z.string().nullable(),
      bairro: z.string().nullable(),
      cep: z.string().nullable(),
      municipio: z.string().nullable(),
      uf: z.string().nullable(),
    }),
    natureza_juridica: z.string().nullable(),
    cnae: z.object({
      codigo: z.string(),
      descricao: z.string(),
    }).nullable(),
    porte: z.string().nullable(),
    situacao: z.string(),                // "ATIVA" etc
    data_abertura: z.string().nullable(),
    regime_tributario: z.object({
      simples_nacional: z.object({
        optante: z.boolean(),
        data_inclusao: z.string().nullable(),
        data_exclusao: z.string().nullable(),
      }),
      simei: z.object({
        optante: z.boolean(),
        data_inclusao: z.string().nullable(),
        data_exclusao: z.string().nullable(),
      }),
    }),
  }),
  pendencias_sief: z.array(debitoSchema),
  debitos_exigibilidade_suspensa: z.array(debitoSchema),
  pgfn: z.object({
    tem_pendencia: z.boolean(),
    debitos: z.array(debitoSchema),
  }),
  metadados_relatorio: z.object({
    data_emissao: z.string(),
    cpf_certificado: z.string().nullable(),
    paginas: z.number(),
  }),
});

export type RelatorioSituacaoFiscal = z.infer<typeof relatorioSituacaoFiscalSchema>;
```

### 5.1 Cálculos derivados (no código, não na LLM)

```typescript
// lib/documents/handlers/relatorio-situacao-fiscal/compute.ts
export function computeSummary(data: RelatorioSituacaoFiscal) {
  const totalSief = data.pendencias_sief.reduce(
    (sum, d) => sum + (d.saldo_consolidado ?? d.saldo_devedor), 0
  );
  const totalSuspenso = data.debitos_exigibilidade_suspensa.reduce(
    (sum, d) => sum + d.saldo_devedor, 0
  );
  const totalPgfn = data.pgfn.debitos.reduce(
    (sum, d) => sum + d.saldo_devedor, 0
  );

  return {
    total_pendencias_sief: totalSief,
    total_exigibilidade_suspensa: totalSuspenso,
    total_pgfn: totalPgfn,
    total_geral: totalSief + totalPgfn,  // suspenso não conta pra CND
    quantidade_debitos:
      data.pendencias_sief.length +
      data.debitos_exigibilidade_suspensa.length +
      data.pgfn.debitos.length,
    pode_emitir_cnd: totalSief === 0 && totalPgfn === 0,
    pode_emitir_cpd_en: totalSief === 0 && totalPgfn === 0 &&
      data.debitos_exigibilidade_suspensa.length === 0,
  };
}
```

---

## 6. Pipeline de processamento

```
[Upload]
   │
   ▼
[Salva PDF no Storage + cria relatorio com status='pending']
   │
   ▼
[Extrai texto bruto do PDF (pdf-parse) → 500 chars]
   │
   ▼
[Detector: classifica tipo de documento]
   │   - heurística rápida (regex de cabeçalhos)
   │   - se incerto: chamada barata pra LLM com classifier prompt
   │
   ▼
[status='extracting']
   │
   ▼
[LLM extrai JSON estruturado usando schema do tipo identificado]
   │   - PDF é enviado nativo pra Anthropic/OpenAI
   │   - structured output garante JSON válido
   │
   ▼
[Valida com Zod]
   │   - falha → status='failed', salva erro
   │   - sucesso → salva extracoes.raw_json
   │
   ▼
[status='reviewing']
   │
   ▼
[Usuário revisa em /relatorios/[id]/revisar]
   │   - vê PDF original lado a lado
   │   - edita campos
   │   - confirma
   │
   ▼
[Salva extracoes.verified_json + popula tabela debitos]
   │
   ▼
[status='verified']
   │
   ▼
[Renderiza dashboard em /relatorios/[id]]
```

---

## 7. Telas (rotas e componentes principais)

| Rota | Descrição | Componente principal |
|---|---|---|
| `/login` | Login (Supabase Auth UI) | `LoginForm` |
| `/signup` | Cadastro + criar org | `SignupFlow` |
| `/dashboard` | Visão geral da org (KPIs, atividade recente) | `OrgDashboard` |
| `/empresas` | Lista de empresas (CNPJs) | `EmpresasList` |
| `/empresas/[cnpj]` | Detalhe de uma empresa | `EmpresaDetail` |
| `/empresas/[cnpj]/historico` | Linha do tempo de relatórios | `HistoricoTimeline` |
| `/upload` | Drag-and-drop até 3 PDFs | `UploadDropzone` |
| `/relatorios/[id]/revisar` | Etapa de revisão | `ReviewForm` (do handler) |
| `/relatorios/[id]` | Dashboard do relatório | `Dashboard` (do handler) |
| `/configuracoes` | Org, membros, billing | `SettingsTabs` |

---

## 8. Variáveis de ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # cuidado: só server-side

# LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=                    # fallback
LLM_PRIMARY_PROVIDER=anthropic

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 9. Segurança

- ✅ RLS em todas as tabelas
- ✅ Service role key nunca exposta no client
- ✅ Validação Zod em toda entrada (forms e API)
- ✅ Rate limiting nas rotas de upload e extract (Vercel KV ou Upstash)
- ✅ Logs de auditoria para ações sensíveis
- ✅ Sanitização de filenames de upload
- ✅ Tamanho máximo de PDF: 10 MB
- ✅ Apenas `application/pdf` aceito
- ✅ CSP headers configurados

---

## 10. Roadmap de implementação (sprints sugeridos)

### Sprint 0 — Fundação (1-2 dias)
- [ ] Setup do projeto Next.js + TS + Tailwind + shadcn
- [ ] Supabase project + migrations iniciais
- [ ] Auth funcionando (login/signup)
- [ ] Estrutura de pastas conforme spec
- [ ] CI básico no GitHub Actions

### Sprint 1 — Core de upload e extração (3-5 dias)
- [ ] Upload com Storage
- [ ] LLM provider abstraction
- [ ] Document handler registry + 1º handler (Relatório Situação Fiscal)
- [ ] Extração end-to-end (sem revisão ainda)
- [ ] Schema Zod + validação

### Sprint 2 — Revisão e dashboard (3-5 dias)
- [ ] Tela de revisão editável
- [ ] Persistência do verified_json
- [ ] Population de tabela `debitos`
- [ ] Dashboard do relatório
- [ ] Geração de texto formatado

### Sprint 3 — Multi-tenant e empresas (2-3 dias)
- [ ] Organizations + members + RLS completo
- [ ] CRUD de empresas
- [ ] Vinculação relatório ↔ empresa por CNPJ
- [ ] Histórico por empresa

### Sprint 4 — Polish e expansão (contínuo)
- [ ] Comparação entre relatórios
- [ ] Exportar texto como PDF/DOCX
- [ ] Adicionar 2º tipo de documento (CND)
- [ ] Onboarding e empty states
- [ ] Testes (Vitest + Playwright)

---

## 11. Critérios de aceite do MVP

1. Contador faz signup, cria org, convida membro
2. Membro faz upload de Relatório de Situação Fiscal real
3. Sistema detecta o tipo, extrai dados em ≤ 30s
4. Tela de revisão mostra todos os débitos editáveis
5. Após confirmação, dashboard mostra: total devido, lista de débitos, status CND
6. Texto explicativo gerado é coerente e correto
7. Subir 2º relatório da mesma empresa cria histórico comparável
8. Outra org não consegue ver dados desta org (testar RLS)

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| LLM extrai valor errado | Etapa de revisão obrigatória + diff visual com PDF |
| Custo de LLM escala mal | Cache de extrações + limite por plano |
| PDF escaneado (sem texto) | Detectar e mostrar erro claro; OCR fica pra v2 |
| LLM provider fora do ar | Fallback automático para o secundário |
| Vazamento entre tenants | RLS + testes automatizados de isolamento |
| Mudança de layout do PDF da Receita | Versionamento de prompts + alertas em falhas |
