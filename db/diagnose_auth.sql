-- Diagnóstico rápido — rode no Supabase SQL Editor e me mande os 5 resultados.
-- Não modifica nada, é só select.

-- 1) O usuário existe em auth.users?
select
  id,
  email,
  email_confirmed_at,
  encrypted_password is not null as has_password,
  banned_until,
  deleted_at,
  created_at
from auth.users
where email = 'ianlimajsgroup@gmail.com';

-- 2) Tem identidade de email associada?
select
  i.id,
  i.user_id,
  i.provider,
  i.identity_data->>'email' as email_in_identity,
  i.created_at
from auth.identities i
join auth.users u on u.id = i.user_id
where u.email = 'ianlimajsgroup@gmail.com';

-- 3) A senha confere com 'js2026@'?
-- Se vier 'true', a senha está OK; se vier 'false' ou nada, está errada.
select
  email,
  encrypted_password = crypt('js2026@', encrypted_password) as senha_confere
from auth.users
where email = 'ianlimajsgroup@gmail.com';

-- 4) A org JS Group existe?
select id, name, slug, plan, created_at
from public.organizations
where slug = 'js-group';

-- 5) Existe membership ligando o usuário à org?
select
  m.organization_id,
  m.user_id,
  m.role,
  m.created_at,
  o.name as org_name,
  u.email
from public.organization_members m
join public.organizations o on o.id = m.organization_id
join auth.users u on u.id = m.user_id
where u.email = 'ianlimajsgroup@gmail.com';
