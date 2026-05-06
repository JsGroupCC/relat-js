# relat-js

Plataforma SaaS multi-tenant para análise automatizada de documentos fiscais
brasileiros (Relatório de Situação Fiscal RFB/PGFN, CND, DARF, DAS, DCTF…).

Especificação técnica completa em [`SPEC.md`](./SPEC.md).

## Stack

| Camada            | Tecnologia                                       |
| ----------------- | ------------------------------------------------ |
| Framework         | Next.js 16 (App Router) + React 19 + Turbopack   |
| Linguagem         | TypeScript 5 (strict)                            |
| UI                | Tailwind CSS v4 + shadcn/ui                      |
| Charts            | Recharts¹                                        |
| Auth + DB + Files | Supabase (Auth, Postgres, Storage)               |
| LLM primário      | Anthropic Claude Sonnet 4.5                      |
| LLM fallback      | OpenAI GPT-5                                     |
| Validação         | Zod                                              |
| Forms             | React Hook Form + @hookform/resolvers            |
| Hosting           | Vercel                                           |

¹ A SPEC pede Tremor com fallback para Recharts. Tremor v3 ainda exige
React 18; v4 está em beta. Como Next 16 traz React 19, adotamos Recharts
diretamente — é a base que o próprio Tremor usa.

## Estado atual

**Sprint 0 — fundação** ✅

- Projeto Next.js 16 + TypeScript strict + Tailwind v4 + ESLint
- shadcn/ui inicializado com `button`, `input`, `card`, `dialog`, `form`,
  `table`, `sonner`, `label`
- Estrutura de pastas conforme [SPEC §3.3](./SPEC.md)
- Clientes Supabase (`lib/supabase/{client,server,admin}.ts`) com
  `@supabase/ssr`
- `proxy.ts` (Next 16, ex-`middleware.ts`) com refresh de sessão e proteção
  de rotas privadas
- Migration SQL inicial com RLS em todas as tabelas e bucket de Storage
- Esqueletos do Document Handler Registry e do LLMProvider

Próximo: **Sprint 1 — upload + extração end-to-end** (ver [SPEC §10](./SPEC.md)).

## Setup local

### 1. Requisitos

- Node.js 20+ (recomendado 22 LTS ou 24)
- npm 10+
- Conta no [Supabase](https://supabase.com) (free tier serve)
- Chave da [Anthropic API](https://console.anthropic.com/settings/keys)
- Opcional: chave da [OpenAI API](https://platform.openai.com/api-keys)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local`:

| Variável                          | Onde obter                                                           |
| --------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase → Project Settings → API                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | idem                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`       | idem (⚠ apenas server-side, nunca exponha)                          |
| `ANTHROPIC_API_KEY`               | console.anthropic.com → Settings → API Keys                          |
| `OPENAI_API_KEY`                  | platform.openai.com → API Keys (opcional, para fallback)             |
| `LLM_PRIMARY_PROVIDER`            | `anthropic` (padrão) ou `openai`                                     |

### 4. Aplicar a migration no Supabase

Pelo dashboard SQL Editor:

1. Abra o projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. SQL Editor → **New query**
3. Cole o conteúdo de `db/migrations/20260506000000_initial_schema.sql`
4. **Run**

Ou via Supabase CLI (recomendado quando tiver vários ambientes):

```bash
npm install -g supabase
supabase link --project-ref <seu-project-ref>
supabase db push
```

### 5. Rodar em dev

```bash
npm run dev
```

App abre em http://localhost:3000.

- `/` redireciona para `/login` se você não estiver autenticado
- `/dashboard`, `/empresas`, `/upload`, `/configuracoes` exigem autenticação
  (placeholders no Sprint 0; conteúdo real chega nos próximos sprints)

## Scripts

| Comando         | Descrição                                  |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Dev server com Turbopack                   |
| `npm run build` | Build de produção                          |
| `npm start`     | Roda o build de produção                   |
| `npm run lint`  | ESLint                                     |
| `npx tsc --noEmit` | Type-check sem emitir arquivos          |

## Estrutura

```
app/                 # rotas App Router (auth + app + api)
components/          # UI (shadcn em components/ui, domínio em subpastas)
lib/
  supabase/          # client, server, admin
  llm/               # interface LLMProvider e implementações
  documents/         # registry + handlers por tipo de documento
  calculations/      # cálculos puros (LLM nunca soma)
  validators/        # schemas Zod compartilhados
db/
  migrations/        # SQL versionado
  seed.sql           # dados de dev
types/
  database.ts        # tipos do banco (regerar com supabase gen types)
proxy.ts             # Next 16 — refresh de sessão Supabase
```

Detalhes em [SPEC §3.3](./SPEC.md) e [SPEC §3.4](./SPEC.md) (Document Handler
Registry).

## Princípios não-negociáveis

1. **RLS em todas as tabelas** desde o dia 1
2. **LLM extrai, código calcula** (nunca somar valores na LLM)
3. **Schema-first** com Zod em todas as fronteiras
4. **Document Handler Registry** para extensibilidade (CND, DARF…)
5. **TypeScript strict**, sem `any`

## Licença

Privado.
