-- mentor_evaluations 테이블 생성
-- 멘토가 신규입사자를 월별(차수별) 평가하는 테이블

CREATE TABLE IF NOT EXISTS mentor_evaluations (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id     text        NOT NULL,          -- 멘토 사번 (users.employee_id)
  mentee_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_number int         NOT NULL CHECK (period_number IN (1, 2, 3)),
  responses     jsonb       NOT NULL DEFAULT '{}',
  submitted_at  timestamptz,                   -- NULL = 임시저장, NOT NULL = 제출완료
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, mentee_id, period_number)
);

-- RLS 활성화
ALTER TABLE mentor_evaluations ENABLE ROW LEVEL SECURITY;

-- 멘토 본인 + hr_admin 접근 허용
CREATE POLICY "mentor_eval_access" ON mentor_evaluations
  FOR ALL TO authenticated
  USING (
    mentor_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  )
  WITH CHECK (
    mentor_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );
