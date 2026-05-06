-- =============================================================================
-- Migration: 20260506000200_relatorio_shares
-- Sprint 4 — link público de visualização do relatório para o cliente
-- =============================================================================
-- Cria token aleatório opaco que o profissional manda no WhatsApp.
-- A rota /share/[token] no Next consulta esta tabela via service-role bypass
-- (não respeita RLS), valida expiração, e retorna a visão simplificada.
-- =============================================================================

create table public.relatorio_shares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  relatorio_id uuid not null references relatorios(id) on delete cascade,
  token text not null unique,                                -- 32 chars hex
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,                                    -- null = não expira
  revoked_at timestamptz,                                    -- soft revoke
  view_count int not null default 0,
  last_viewed_at timestamptz
);

create index relatorio_shares_token_idx on relatorio_shares (token);
create index relatorio_shares_relatorio_idx on relatorio_shares (relatorio_id);

-- =============================================================================
-- RLS — só membros da org podem listar/criar/revogar shares
-- =============================================================================
alter table relatorio_shares enable row level security;

create policy "members read shares of their org"
  on relatorio_shares for select
  using (public.is_org_member(organization_id));

create policy "members create shares for their org"
  on relatorio_shares for insert
  with check (public.is_org_member(organization_id));

create policy "members update shares of their org"
  on relatorio_shares for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "members delete shares of their org"
  on relatorio_shares for delete
  using (public.is_org_member(organization_id));

-- =============================================================================
-- Função pública: consulta share por token (bypass RLS)
-- =============================================================================
-- Esta é a única forma de a rota /share/[token] (acesso anônimo) ler o share.
-- security definer + checa revogação/expiração internamente.
-- Retorna NULL se token inválido/expirado/revogado, sem leak de existência.
-- =============================================================================
create or replace function public.resolve_share_token(p_token text)
returns table (
  share_id uuid,
  relatorio_id uuid,
  organization_id uuid,
  expires_at timestamptz,
  view_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
    select
      s.id,
      s.relatorio_id,
      s.organization_id,
      s.expires_at,
      s.view_count
    from public.relatorio_shares s
    where s.token = p_token
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
    limit 1;
end $$;

revoke all on function public.resolve_share_token(text) from public;
grant execute on function public.resolve_share_token(text) to anon, authenticated;

-- =============================================================================
-- Função pública: incrementa view_count após renderizar
-- =============================================================================
create or replace function public.increment_share_view(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.relatorio_shares
  set view_count = view_count + 1, last_viewed_at = now()
  where token = p_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());
end $$;

revoke all on function public.increment_share_view(text) from public;
grant execute on function public.increment_share_view(text) to anon, authenticated;

-- =============================================================================
-- Função pública: retorna tudo que /share/[token] precisa em uma chamada
-- =============================================================================
-- Junta relatorio + extracao + empresa em um objeto JSON. Security definer
-- valida o token internamente — só responde se ainda válido. Devolve NULL
-- silenciosamente para tokens inválidos/expirados/revogados, sem leak.
-- =============================================================================
create or replace function public.get_shared_relatorio(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_share record;
  v_result jsonb;
begin
  select s.relatorio_id, s.organization_id
    into v_share
  from public.relatorio_shares s
  where s.token = p_token
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'relatorio', jsonb_build_object(
      'id', r.id,
      'document_type', r.document_type,
      'pdf_filename', r.pdf_filename,
      'data_emissao_documento', r.data_emissao_documento,
      'status', r.status
    ),
    'extracao', (
      select coalesce(e.verified_json, e.raw_json)
      from public.extracoes e
      where e.relatorio_id = r.id
      order by e.created_at desc
      limit 1
    ),
    'empresa', case
      when emp.id is not null then jsonb_build_object(
        'cnpj', emp.cnpj,
        'razao_social', emp.razao_social,
        'nome_fantasia', emp.nome_fantasia
      )
      else null
    end
  )
    into v_result
  from public.relatorios r
  left join public.empresas emp on emp.id = r.empresa_id
  where r.id = v_share.relatorio_id
    and r.status = 'verified'
  limit 1;

  return v_result;
end $$;

revoke all on function public.get_shared_relatorio(text) from public;
grant execute on function public.get_shared_relatorio(text) to anon, authenticated;
