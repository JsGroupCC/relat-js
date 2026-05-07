# E2E tests (Playwright)

Cobertura mínima de fluxo: login → dashboard → empresas (CRUD) → atividade.

## Como rodar

Pré-requisitos:

- `.env.local` populado com:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Migrations aplicadas no projeto Supabase apontado.

Primeira execução (instala o browser do Playwright):

```bash
npx playwright install chromium
```

Rodar:

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # modo UI (debug visual)
```

O config sobe `next dev` automaticamente em `localhost:3000` se ainda não tiver
nada rodando. Se você já tá com `npm run dev` aberto, ele reusa.

## Como funciona o auth

`auth.setup.ts` roda uma vez no início:

1. Cria (ou reusa) um usuário `e2e@relat-js.test` via service role com
   `email_confirm=true` (pula confirmação de email).
2. Garante uma org vinculada como `owner`.
3. Faz login pela UI e salva o storage state em `tests/e2e/.auth/user.json`
   (gitignored).

Outros tests reusam esse storage state — não precisam logar de novo.

Para usar credenciais customizadas:

```bash
E2E_USER_EMAIL=meu@test.com E2E_USER_PASSWORD=secret npm run test:e2e
```

## ⚠️ Aviso

Os tests usam a `service_role` key. **Nunca rode contra produção** —
dados de teste vão pra um projeto Supabase de QA/dev descartável.

## Adicionando tests

- Nome `*.spec.ts` em `tests/e2e/`.
- Cleanup ao final do test (delete via service role) pra não acumular lixo.
- Use `test.describe.serial` quando o teste depende do estado criado por
  outro — Playwright roda em paralelo por padrão.
