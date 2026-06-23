do $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  -- 1. Inserir no auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'nc.marketingrj@gmail.com',
    crypt('ncmarketing2026', gen_salt('bf')),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

  -- 2. Inserir no auth.identities
  insert into auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, 'nc.marketingrj@gmail.com')::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- 3. Inserir na nossa tabela customizada
  insert into public.admin_users (id, nome, role)
  values (new_user_id, 'Master Admin', 'admin');

end;
$$;
