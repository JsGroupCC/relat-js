-- =============================================================================
-- Migration: 20260506000000_initial_schema
-- Sprint 0 — schema inicial + RLS para todas as tabelas
-- Referência: SPEC.md seções 4.1, 4.2, 4.3
-- =============================================================================

-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================
create extension if not exists "pgcrypto";

-- =============================================================================
-- 2. TENANTS (organizations + members)
-- =============================================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on organization_members (user_id);

-- =============================================================================
-- 3. DOMAIN: empresas, relatorios, extracoes, debitos
-- =============================================================================
create table empresas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  cnpj text not null,
  razao_social text,
  nome_fantasia text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, cnpj)
);

create index empresas_org_idx on empresas (organization_id);

create table relatorios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade,
  document_type text not null,                            -- ex: "relatorio-situacao-fiscal"
  pdf_path text not null,                                 -- path no Storage
  pdf_filename text not null,
  pdf_size_bytes bigint,
  data_emissao_documento date,                            -- extraída do próprio PDF
  status text not null default 'pending' check (
    status in ('pending', 'extracting', 'reviewing', 'verified', 'failed')
  ),
  error_message text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

create index relatorios_org_empresa_created_idx
  on relatorios (organization_id, empresa_id, created_at desc);
create index relatorios_status_idx on relatorios (status);

create table extracoes (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references relatorios(id) on delete cascade,
  raw_json jsonb not null,
  verified_json jsonb,
  llm_provider text,
  llm_model text,
  tokens_input int,
  tokens_output int,
  cost_usd numeric(10, 6),
  created_at timestamptz not null default now()
);

create index extracoes_relatorio_idx on extracoes (relatorio_id);

create table debitos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  relatorio_id uuid not null references relatorios(id) on delete cascade,
  tipo text not null,                                     -- "sief" | "suspenso" | "pgfn"
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
  created_at timestamptz not null default now()
);

create index debitos_empresa_periodo_idx on debitos (empresa_id, periodo_apuracao);
create index debitos_org_tipo_idx on debitos (organization_id, tipo);

-- =============================================================================
-- 4. AUDIT
-- =============================================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  user_id uuid references auth.users(id),
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_created_idx on audit_log (organization_id, created_at desc);

-- =============================================================================
-- 5. HELPER FUNCTION (security definer) — evita recursão e overhead em RLS
-- =============================================================================
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

-- ---- organizations ---------------------------------------------------------
alter table organizations enable row level security;

create policy "members read their org"
  on organizations for select
  using (public.is_org_member(id));

create policy "any authenticated user can create an organization"
  on organizations for insert
  with check (auth.uid() is not null);

create policy "owners and admins update their org"
  on organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

create policy "owners delete their org"
  on organizations for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- ---- organization_members --------------------------------------------------
alter table organization_members enable row level security;

create policy "members read members of their org"
  on organization_members for select
  using (public.is_org_member(organization_id));

create policy "owners and admins manage members"
  on organization_members for insert
  with check (
    -- caso especial: criador da org se torna o primeiro owner
    (
      user_id = auth.uid()
      and role = 'owner'
      and not exists (
        select 1 from public.organization_members
        where organization_id = organization_members.organization_id
      )
    )
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "owners and admins update members"
  on organization_members for update
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy "owners and admins delete members"
  on organization_members for delete
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- ---- empresas --------------------------------------------------------------
alter table empresas enable row level security;

create policy "members read empresas in their org"
  on empresas for select
  using (public.is_org_member(organization_id));

create policy "members insert empresas in their org"
  on empresas for insert
  with check (public.is_org_member(organization_id));

create policy "members update empresas in their org"
  on empresas for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "members delete empresas in their org"
  on empresas for delete
  using (public.is_org_member(organization_id));

-- ---- relatorios ------------------------------------------------------------
alter table relatorios enable row level security;

create policy "members read relatorios in their org"
  on relatorios for select
  using (public.is_org_member(organization_id));

create policy "members insert relatorios in their org"
  on relatorios for insert
  with check (public.is_org_member(organization_id));

create policy "members update relatorios in their org"
  on relatorios for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "members delete relatorios in their org"
  on relatorios for delete
  using (public.is_org_member(organization_id));

-- ---- extracoes (escopo via relatorios.organization_id) ---------------------
alter table extracoes enable row level security;

create policy "members read extracoes via relatorio"
  on extracoes for select
  using (
    exists (
      select 1 from public.relatorios r
      where r.id = extracoes.relatorio_id
        and public.is_org_member(r.organization_id)
    )
  );

create policy "members insert extracoes via relatorio"
  on extracoes for insert
  with check (
    exists (
      select 1 from public.relatorios r
      where r.id = extracoes.relatorio_id
        and public.is_org_member(r.organization_id)
    )
  );

create policy "members update extracoes via relatorio"
  on extracoes for update
  using (
    exists (
      select 1 from public.relatorios r
      where r.id = extracoes.relatorio_id
        and public.is_org_member(r.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.relatorios r
      where r.id = extracoes.relatorio_id
        and public.is_org_member(r.organization_id)
    )
  );

create policy "members delete extracoes via relatorio"
  on extracoes for delete
  using (
    exists (
      select 1 from public.relatorios r
      where r.id = extracoes.relatorio_id
        and public.is_org_member(r.organization_id)
    )
  );

-- ---- debitos ---------------------------------------------------------------
alter table debitos enable row level security;

create policy "members read debitos in their org"
  on debitos for select
  using (public.is_org_member(organization_id));

create policy "members insert debitos in their org"
  on debitos for insert
  with check (public.is_org_member(organization_id));

create policy "members update debitos in their org"
  on debitos for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "members delete debitos in their org"
  on debitos for delete
  using (public.is_org_member(organization_id));

-- ---- audit_log (read-only para membros; writes só via service role) --------
alter table audit_log enable row level security;

create policy "members read audit_log of their org"
  on audit_log for select
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

-- =============================================================================
-- 7. STORAGE BUCKET + POLICIES
-- =============================================================================
-- Bucket: fiscal-documents
-- Path pattern: {organization_id}/{relatorio_id}/{filename}
-- Apenas application/pdf, max 10 MB.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fiscal-documents',
  'fiscal-documents',
  false,
  10485760,                        -- 10 MB
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "members read fiscal-documents of their org"
  on storage.objects for select
  using (
    bucket_id = 'fiscal-documents'
    and public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

create policy "members upload fiscal-documents to their org"
  on storage.objects for insert
  with check (
    bucket_id = 'fiscal-documents'
    and public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

create policy "members update fiscal-documents of their org"
  on storage.objects for update
  using (
    bucket_id = 'fiscal-documents'
    and public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  )
  with check (
    bucket_id = 'fiscal-documents'
    and public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

create policy "members delete fiscal-documents of their org"
  on storage.objects for delete
  using (
    bucket_id = 'fiscal-documents'
    and public.is_org_member((string_to_array(name, '/'))[1]::uuid)
  );

-- =============================================================================
-- 8. UPDATED_AT TRIGGERS
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger empresas_set_updated_at
  before update on empresas
  for each row execute function public.set_updated_at();
