-- ══════════════════════════════════════════════════════
-- 멘토 RLS 정책
-- 실행 전: Supabase SQL Editor에서 순서대로 실행
-- ══════════════════════════════════════════════════════

-- 1. 멘토가 자기 멘티 목록을 조회할 수 있도록 users SELECT 정책 추가
--    (멘티의 mentor_id = 멘토의 employee_id 매칭)
CREATE POLICY "users_mentor_select_mentees"
  ON users FOR SELECT
  USING (
    mentor_id = (
      SELECT employee_id FROM users WHERE id = auth.uid()
    )
  );

-- 2. 멘토가 자기 멘티의 OJT 일지를 조회할 수 있는 정책
CREATE POLICY "ojt_mentor_select"
  ON ojt_journals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS mentee
      WHERE mentee.id = ojt_journals.user_id
        AND mentee.mentor_id = (
          SELECT employee_id FROM users WHERE id = auth.uid()
        )
    )
  );

-- 3. 멘토가 자기 멘티의 OJT 일지에 코멘트 작성 및 승인 처리
CREATE POLICY "ojt_mentor_update"
  ON ojt_journals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS mentee
      WHERE mentee.id = ojt_journals.user_id
        AND mentee.mentor_id = (
          SELECT employee_id FROM users WHERE id = auth.uid()
        )
    )
  );

-- ──────────────────────────────────────────────────────
-- 멘토 계정 등록 방법 (Supabase Dashboard > Authentication > Users)
-- 1. 이메일: {사번}@yura.com  (예: 211072@yura.com)
-- 2. 비밀번호: y{사번}       (예: y211072)
-- 3. users 테이블에 row 삽입:
--    INSERT INTO users (id, name, team, employee_id, role)
--    VALUES ('{auth_uuid}', '김진기', '소속팀', '211072', 'mentor');
-- ──────────────────────────────────────────────────────
