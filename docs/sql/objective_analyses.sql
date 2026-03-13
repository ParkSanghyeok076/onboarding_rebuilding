-- =====================================================
-- 객관식 시계열 분석 테이블
-- 실행: Supabase SQL Editor에서 실행
-- 목적: 신입사원의 3차 설문 객관식 점수 시계열 분석 + Claude 총평 저장
-- =====================================================

CREATE TABLE IF NOT EXISTS objective_analyses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  analyzed_at  timestamptz DEFAULT now(),
  chart_data   jsonb NOT NULL,  -- [{round:"1차",part1:4.25,part2:3.75,...}, ...]
  summary      text NOT NULL,   -- Claude가 생성한 한국어 총평
  UNIQUE(user_id)
);

ALTER TABLE objective_analyses ENABLE ROW LEVEL SECURITY;

-- hr_admin만 접근 가능
CREATE POLICY "objective_analyses_admin" ON objective_analyses
  FOR ALL USING (is_hr_admin());
