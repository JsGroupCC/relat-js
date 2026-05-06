-- =============================================================================
-- Seed inicial — cria usuário admin "ianlimajsgroup@gmail.com" + org "JS Group"
-- =============================================================================
-- Como rodar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cole este arquivo inteiro
--   3. Run
--
-- O bloco é idempotente: pode rodar múltiplas vezes sem duplicar.
-- =============================================================================

do $$
declare
  v_email      text := 'ianlimajsgroup@gmail.com';
  v_password   text := 'js2026@';                     -- ⚠️ senha fraca; troque depois
  v_org_name   text := 'JS Group';
  v_org_slug   text := 'js-group';
  v_user_id    uuid;
  v_org_id     uuid;
begin
  -- ── 1) Usuário em auth.users (idempotente) ──────────────────────────────
  select id into v_user_id from auth.users where email = v_email limit 1;

  if v_user_id is null then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      '{}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    returning id into v_user_id;

    -- Identidade ligada ao provider 'email' (necessário em alguns projetos
    -- para Auth funcionar com password login).
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      now(),
      now(),
      now()
    );

    raise notice 'Usuário criado: % (id=%)', v_email, v_user_id;
  else
    raise notice 'Usuário já existe: % (id=%) — pulando insert.', v_email, v_user_id;
  end if;

  -- ── 2) Organização (idempotente por slug) ───────────────────────────────
  select id into v_org_id from public.organizations where slug = v_org_slug limit 1;

  if v_org_id is null then
    insert into public.organizations (name, slug, plan)
    values (v_org_name, v_org_slug, 'free')
    returning id into v_org_id;
    raise notice 'Org criada: % (id=%)', v_org_name, v_org_id;
  else
    raise notice 'Org já existe: % (id=%) — pulando insert.', v_org_name, v_org_id;
  end if;

  -- ── 3) Membership (idempotente) ─────────────────────────────────────────
  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  raise notice 'Pronto. Login: % / senha: % / org: %', v_email, v_password, v_org_slug;
end $$;
