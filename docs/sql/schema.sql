-- =====================================================
-- 온보딩 시스템 DB 스키마
-- 담당: 인사기획팀 박상혁 선임
-- 실행 위치: Supabase SQL Editor
-- =====================================================

-- ① 사용자 프로필 (Supabase Auth와 연동)
CREATE TABLE users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text UNIQUE NOT NULL,
  name              text NOT NULL,
  employee_id       text UNIQUE NOT NULL,  -- 사번
  employee_type     text CHECK (employee_type IN ('신입', '경력')),
  hire_date         date,
  department        text,
  position          text,
  role              text DEFAULT 'employee' CHECK (role IN ('employee', 'hr_admin')),
  mentor_id         uuid REFERENCES users(id),
  mentor_name       text,
  mentor_email      text,
  team_leader_id    uuid REFERENCES users(id),
  team_leader_name  text,
  team_leader_email text,
  period_1_start    date,
  period_1_end      date,
  period_2_start    date,
  period_2_end      date,
  period_3_start    date,
  period_3_end      date,
  created_at        timestamptz DEFAULT now()
);

-- ② 공지사항
CREATE TABLE announcements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  content      text NOT NULL,
  author       text NOT NULL,
  is_pinned    boolean DEFAULT false,
  published_at timestamptz DEFAULT now(),
  pdf_url      text
);

-- ③ 온보딩 프로그램 제출
-- 이미지는 Supabase Storage 'onboarding-images' 버킷에 저장
-- 교육 기간 종료 후 Admin이 직접 삭제 가능
CREATE TABLE onboarding_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  program_id   int CHECK (program_id BETWEEN 1 AND 6),
  image_url    text,
  submitted_at timestamptz DEFAULT now(),
  status       text DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  UNIQUE(user_id, program_id)
);

-- ④ 설문 회차
CREATE TABLE survey_rounds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number int CHECK (round_number BETWEEN 1 AND 3),
  target_type  text CHECK (target_type IN ('신입', '경력', 'all')),
  title        text NOT NULL,
  open_date    date,
  close_date   date
);

-- ⑤ 설문 응답
-- 주관식 컬럼은 세션 3 시작 전 설문 문항 PDF 확인 후 추가 예정
CREATE TABLE survey_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  round_id     uuid REFERENCES survey_rounds(id),
  submitted_at timestamptz DEFAULT now(),
  subjective_1 text,
  subjective_2 text
);

-- ⑥ ABSA 분석 결과 (HR Admin 전용)
CREATE TABLE analysis_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES survey_responses(id) ON DELETE CASCADE,
  analyzed_at timestamptz DEFAULT now(),
  aspects     jsonb,  -- [{aspect, sentiment, quote, score}, ...]
  raw_result  text
);

-- ⑦ 이메일 초안 (HR Admin 전용)
CREATE TABLE email_drafts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    uuid REFERENCES survey_responses(id) ON DELETE CASCADE,
  recipient_type text CHECK (recipient_type IN ('mentor', 'team_leader')),
  subject        text,
  body           text,
  created_at     timestamptz DEFAULT now()
);

-- =====================================================
-- RLS (Row Level Security) 정책
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- users: 본인 읽기, hr_admin 전체 접근
CREATE POLICY "users_self_read" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- announcements: 로그인한 사용자 읽기, admin 쓰기
CREATE POLICY "announcements_read" ON announcements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- onboarding_submissions: 본인 읽기/쓰기, admin 전체
CREATE POLICY "submissions_self" ON onboarding_submissions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "submissions_admin" ON onboarding_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- survey_rounds: 로그인한 사용자 읽기, admin 쓰기
CREATE POLICY "rounds_read" ON survey_rounds
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "rounds_admin_write" ON survey_rounds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- survey_responses: 본인 읽기/쓰기, admin 읽기
CREATE POLICY "responses_self" ON survey_responses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "responses_admin_read" ON survey_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- analysis_results: admin만
CREATE POLICY "analysis_admin" ON analysis_results
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- email_drafts: admin만
CREATE POLICY "drafts_admin" ON email_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'hr_admin')
  );

-- =====================================================
-- Storage 버킷 생성 (Supabase 대시보드에서 직접 생성 필요)
-- Storage → New Bucket:
--   - announcements-files (Public: false)
--   - onboarding-images   (Public: false)
-- =====================================================
