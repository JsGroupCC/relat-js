-- =============================================================================
-- Migration: 20260506000100_org_members_with_email
-- Sprint 3 — função para listar membros de uma org com email do usuário
-- =============================================================================
-- A tabela auth.users não é acessível via RLS. Esta função é security definer
-- e devolve emails apenas para usuários que SÃO membros da org consultada.
-- =============================================================================

create or replace function public.list_organization_members(org_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Permissão: o caller precisa ser membro da org consultada.
  if not public.is_org_member(org_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
    select
      m.user_id,
      u.email::text,
      m.role,
      m.created_at
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.organization_id = org_id
    order by m.created_at asc;
end $$;

revoke all on function public.list_organization_members(uuid) from public;
grant execute on function public.list_organization_members(uuid) to authenticated;

-- =============================================================================
-- Função para resolver user_id por e-mail (usada no convite)
-- =============================================================================
-- Caller só consegue invocar; retorna NULL se o usuário não existir.
-- Usada para "adicionar membro por e-mail" sem expor toda a tabela auth.users.

create or replace function public.find_user_id_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(p_email) limit 1;
  return v_user_id;
end $$;

revoke all on function public.find_user_id_by_email(text) from public;
grant execute on function public.find_user_id_by_email(text) to authenticated;
