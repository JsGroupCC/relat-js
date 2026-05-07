-- =============================================================================
-- Carteira snapshots — histórico do total da carteira por organização.
-- =============================================================================
-- Cada vez que um relatório é confirmado/deletado, um snapshot DIÁRIO é gravado
-- (idempotente: se já tem um snapshot do mesmo dia para a mesma org, atualiza
-- em vez de inserir). Isso permite plotar evolução semanal/mensal sem custo
-- por evento.
--
-- Writes só por código server-side confiável (service role). Usuários só leem.

create table carteira_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- Dia (UTC) do snapshot. UNIQUE com organization_id pra dedup diária.
  snapshot_date date not null default (now() at time zone 'utc')::date,
  total_geral numeric(14, 2) not null default 0,
  total_federal numeric(14, 2) not null default 0,
  total_estadual numeric(14, 2) not null default 0,
  total_municipal numeric(14, 2) not null default 0,
  total_outros numeric(14, 2) not null default 0,
  qtd_empresas_com_debito int not null default 0,
  qtd_empresas_total int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, snapshot_date)
);

create index carteira_snapshots_org_date_idx
  on carteira_snapshots (organization_id, snapshot_date desc);

alter table carteira_snapshots enable row level security;

create policy "members read carteira_snapshots of their org"
  on carteira_snapshots for select
  using (public.is_org_member(organization_id));
