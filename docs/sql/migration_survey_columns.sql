-- survey_responses 컬럼 교체 마이그레이션
-- 실행 위치: Supabase 대시보드 → SQL Editor

-- 기존 플레이스홀더 컬럼 제거
ALTER TABLE survey_responses DROP COLUMN IF EXISTS subjective_1;
ALTER TABLE survey_responses DROP COLUMN IF EXISTS subjective_2;
ALTER TABLE survey_responses DROP COLUMN IF EXISTS round_id;

-- 회차 번호 직접 저장 (survey_rounds 테이블 미사용)
ALTER TABLE survey_responses ADD COLUMN round_number integer NOT NULL CHECK (round_number BETWEEN 1 AND 3);

-- Part 1: OJT 준비 및 멘토링 태도
ALTER TABLE survey_responses ADD COLUMN q1_1 integer CHECK (q1_1 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q1_2 integer CHECK (q1_2 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q1_3 integer CHECK (q1_3 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q1_4 integer CHECK (q1_4 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q1_5 text;

-- Part 2: 업무 지식 및 기술 전수
ALTER TABLE survey_responses ADD COLUMN q2_1 integer CHECK (q2_1 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q2_2 integer CHECK (q2_2 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q2_3 integer CHECK (q2_3 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q2_4 integer CHECK (q2_4 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q2_5 text;

-- Part 3: 실무 지도 및 피드백
ALTER TABLE survey_responses ADD COLUMN q3_1 integer CHECK (q3_1 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q3_2 integer CHECK (q3_2 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q3_3 integer CHECK (q3_3 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q3_4 integer CHECK (q3_4 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q3_5 text;

-- Part 4: 조직 적응 지원 및 소통
ALTER TABLE survey_responses ADD COLUMN q4_1 integer CHECK (q4_1 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q4_2 integer CHECK (q4_2 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q4_3 integer CHECK (q4_3 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q4_4 integer CHECK (q4_4 BETWEEN 1 AND 5);
ALTER TABLE survey_responses ADD COLUMN q4_5 text;

-- Part 5: 주관식 종합 의견
ALTER TABLE survey_responses ADD COLUMN q5_1 text;
ALTER TABLE survey_responses ADD COLUMN q5_2 text;
ALTER TABLE survey_responses ADD COLUMN q5_3 text;

-- 사용자당 회차별 1건만 제출 가능
ALTER TABLE survey_responses ADD CONSTRAINT unique_user_round UNIQUE (user_id, round_number);
