-- =============================================================================
-- Migration: 20260506000300_pdf_hash_cache
-- Sprint 5 Fase A.2 — cache de extração por hash do PDF
-- =============================================================================
-- Evita re-chamar a LLM (custo + latência) quando o usuário sobe duas vezes
-- o mesmo arquivo. O hash é calculado server-side em /api/extract antes da
-- chamada à LLM. Escopo do cache: organização (por design — orgs diferentes
-- não compartilham extrações).
-- =============================================================================

alter table public.relatorios
  add column if not exists pdf_sha256 text;

create index if not exists relatorios_pdf_sha256_idx
  on public.relatorios (organization_id, pdf_sha256)
  where pdf_sha256 is not null;
