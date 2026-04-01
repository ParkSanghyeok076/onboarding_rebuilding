-- =====================================================
-- 테스트 Admin 계정 생성
-- ID (email): test1456@company.internal
-- PW: test1456
-- role: hr_admin
-- 실행 위치: Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN

  -- 1. Supabase Auth 계정 생성
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'test1456@company.internal',
    crypt('test1456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

  -- 2. public.users 프로필 생성 (hr_admin 권한)
  INSERT INTO public.users (
    id,
    email,
    name,
    employee_id,
    role,
    created_at
  ) VALUES (
    new_user_id,
    'test1456@company.internal',
    '테스트관리자',
    'test1456',
    'hr_admin',
    now()
  );

END $$;
