-- =====================================================
-- Migration: mentor_id 컬럼 타입 변경 (uuid → text) + 직원 self-update RLS
-- 실행 위치: Supabase SQL Editor
-- =====================================================

-- 1. mentor_id의 FK 제약 제거 (멘토는 users 테이블에 없는 기존 직원)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mentor_id_fkey;

-- 2. mentor_id 타입을 uuid → text 로 변경 (멘토 사번 저장용)
ALTER TABLE users ALTER COLUMN mentor_id TYPE text;

-- 3. 직원이 자신의 row를 UPDATE할 수 있는 RLS 정책 추가
--    (멘토 성명/사번 입력을 위해 필요)
CREATE POLICY "users_self_update"
  ON users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
