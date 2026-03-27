-- OJT 일지 테이블
-- education_content: 날짜별 교육 내용 자유 텍스트 (예: "03월 27일 : 배운 내용")
CREATE TABLE IF NOT EXISTS ojt_journals (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number       integer NOT NULL,
  week_start_date   date NOT NULL,
  week_end_date     date NOT NULL,
  education_content text,           -- 세부 교육 내용 (날짜 직접 타이핑)
  challenges        text,           -- 어려웠던 점
  next_week_goals   text,           -- 다음 주 목표
  status            text DEFAULT 'draft'
                    CHECK (status IN ('draft','submitted','approved','rejected')),
  mentor_comment    text,           -- 지도의견 (멘토 작성)
  submitted_at      timestamptz,
  approved_at       timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, week_number)
);

-- RLS 활성화
ALTER TABLE ojt_journals ENABLE ROW LEVEL SECURITY;

-- 본인 조회
CREATE POLICY "ojt_self_select"
  ON ojt_journals FOR SELECT
  USING (auth.uid() = user_id);

-- 본인 INSERT
CREATE POLICY "ojt_self_insert"
  ON ojt_journals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인 UPDATE (draft 상태만)
CREATE POLICY "ojt_self_update"
  ON ojt_journals FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft');

-- HR Admin 전체 조회
CREATE POLICY "ojt_admin_select"
  ON ojt_journals FOR SELECT
  USING (is_hr_admin());

-- HR Admin UPDATE (승인/코멘트)
CREATE POLICY "ojt_admin_update"
  ON ojt_journals FOR UPDATE
  USING (is_hr_admin());
