-- =====================================================
-- IT부서 소개용 시연 샘플 데이터
-- 신입사원 6명 + 멘토 2명 + HR 관리자 1명
-- 3차 설문 응답 18건 + ABSA 분석 결과 사전 탑재
-- =====================================================
-- 실행 방법: Supabase SQL Editor에 전체 붙여넣기 후 실행
-- 주의: 기존 demo 계정이 있으면 ON CONFLICT로 무시됨
-- =====================================================

DO $$
DECLARE
  -- HR 관리자
  admin_id    uuid := gen_random_uuid();

  -- 멘토 2명
  mentor1_id  uuid := gen_random_uuid();
  mentor2_id  uuid := gen_random_uuid();

  -- 신입사원 6명
  emp1_id     uuid := gen_random_uuid();
  emp2_id     uuid := gen_random_uuid();
  emp3_id     uuid := gen_random_uuid();
  emp4_id     uuid := gen_random_uuid();
  emp5_id     uuid := gen_random_uuid();
  emp6_id     uuid := gen_random_uuid();

  -- survey_response ID (ABSA 분석 결과 연결용)
  sr_e1_r1    uuid := gen_random_uuid();
  sr_e1_r2    uuid := gen_random_uuid();
  sr_e1_r3    uuid := gen_random_uuid();
  sr_e2_r1    uuid := gen_random_uuid();
  sr_e2_r2    uuid := gen_random_uuid();
  sr_e2_r3    uuid := gen_random_uuid();
  sr_e3_r1    uuid := gen_random_uuid();
  sr_e3_r2    uuid := gen_random_uuid();
  sr_e3_r3    uuid := gen_random_uuid();
  sr_e4_r1    uuid := gen_random_uuid();
  sr_e4_r2    uuid := gen_random_uuid();
  sr_e4_r3    uuid := gen_random_uuid();
  sr_e5_r1    uuid := gen_random_uuid();
  sr_e5_r2    uuid := gen_random_uuid();
  sr_e5_r3    uuid := gen_random_uuid();
  sr_e6_r1    uuid := gen_random_uuid();
  sr_e6_r2    uuid := gen_random_uuid();
  sr_e6_r3    uuid := gen_random_uuid();

  -- 공통 날짜 (입사: 100일 전 / 1차: 67일 전 / 2차: 37일 전 / 3차: 6일 전)
  hire        date := (now() - interval '100 days')::date;
  p1s         date := (now() - interval '100 days')::date;
  p1e         date := (now() - interval '71 days')::date;
  p2s         date := (now() - interval '70 days')::date;
  p2e         date := (now() - interval '40 days')::date;
  p3s         date := (now() - interval '39 days')::date;
  p3e         date := (now() - interval '9 days')::date;

BEGIN

-- =====================================================
-- 1. Supabase Auth 계정 생성
-- =====================================================

  -- HR 관리자 (demo_admin / demo1234)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (admin_id, '00000000-0000-0000-0000-000000000000', 'demo_admin@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  -- 멘토1 (mentor01 / demo1234)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (mentor1_id, '00000000-0000-0000-0000-000000000000', 'mentor01@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  -- 멘토2 (mentor02 / demo1234)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (mentor2_id, '00000000-0000-0000-0000-000000000000', 'mentor02@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  -- 신입사원 6명 (demo001~demo006 / demo1234)
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (emp1_id, '00000000-0000-0000-0000-000000000000', 'demo001@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (emp2_id, '00000000-0000-0000-0000-000000000000', 'demo002@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (emp3_id, '00000000-0000-0000-0000-000000000000', 'demo003@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (emp4_id, '00000000-0000-0000-0000-000000000000', 'demo004@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (emp5_id, '00000000-0000-0000-0000-000000000000', 'demo005@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES (emp6_id, '00000000-0000-0000-0000-000000000000', 'demo006@company.internal', crypt('demo1234', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (email) DO NOTHING;


-- =====================================================
-- 2. 사용자 프로필 (public.users)
-- =====================================================

  -- HR 관리자
  INSERT INTO public.users (id, email, name, employee_id, role, created_at)
  VALUES (admin_id, 'demo_admin@company.internal', '김관리', 'demo_admin', 'hr_admin', now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 멘토1: 오현준 (인사기획팀)
  INSERT INTO public.users (id, email, name, employee_id, role, department, position, created_at)
  VALUES (mentor1_id, 'mentor01@company.internal', '오현준', 'mentor01', 'mentor', '인사기획팀', '과장', now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 멘토2: 신지아 (IT팀)
  INSERT INTO public.users (id, email, name, employee_id, role, department, position, created_at)
  VALUES (mentor2_id, 'mentor02@company.internal', '신지아', 'mentor02', 'mentor', 'IT팀', '대리', now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 신입사원 1: 김유진 (인사기획팀) - 성장 패턴 3→4→5
  INSERT INTO public.users (id, email, name, employee_id, employee_type, hire_date, department, position, role,
    mentor_id, mentor_name, mentor_email,
    period_1_start, period_1_end, period_2_start, period_2_end, period_3_start, period_3_end, created_at)
  VALUES (emp1_id, 'demo001@company.internal', '김유진', 'demo001', '신입', hire, '인사기획팀', '사원', 'employee',
    mentor1_id, '오현준', 'mentor01@company.internal',
    p1s, p1e, p2s, p2e, p3s, p3e, now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 신입사원 2: 이준혁 (경영전략팀) - 높게 유지 4→4→5
  INSERT INTO public.users (id, email, name, employee_id, employee_type, hire_date, department, position, role,
    mentor_id, mentor_name, mentor_email,
    period_1_start, period_1_end, period_2_start, period_2_end, period_3_start, period_3_end, created_at)
  VALUES (emp2_id, 'demo002@company.internal', '이준혁', 'demo002', '신입', hire, '경영전략팀', '사원', 'employee',
    mentor1_id, '오현준', 'mentor01@company.internal',
    p1s, p1e, p2s, p2e, p3s, p3e, now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 신입사원 3: 박소연 (마케팅팀) - 초기 낮음, 개선 2→3→5
  INSERT INTO public.users (id, email, name, employee_id, employee_type, hire_date, department, position, role,
    mentor_id, mentor_name, mentor_email,
    period_1_start, period_1_end, period_2_start, period_2_end, period_3_start, period_3_end, created_at)
  VALUES (emp3_id, 'demo003@company.internal', '박소연', 'demo003', '신입', hire, '마케팅팀', '사원', 'employee',
    mentor2_id, '신지아', 'mentor02@company.internal',
    p1s, p1e, p2s, p2e, p3s, p3e, now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 신입사원 4: 최민준 (IT팀) - 꾸준히 높음 5→5→5
  INSERT INTO public.users (id, email, name, employee_id, employee_type, hire_date, department, position, role,
    mentor_id, mentor_name, mentor_email,
    period_1_start, period_1_end, period_2_start, period_2_end, period_3_start, period_3_end, created_at)
  VALUES (emp4_id, 'demo004@company.internal', '최민준', 'demo004', '신입', hire, 'IT팀', '사원', 'employee',
    mentor2_id, '신지아', 'mentor02@company.internal',
    p1s, p1e, p2s, p2e, p3s, p3e, now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 신입사원 5: 정하은 (경영전략팀) - 중간 유지 3→4→4
  INSERT INTO public.users (id, email, name, employee_id, employee_type, hire_date, department, position, role,
    mentor_id, mentor_name, mentor_email,
    period_1_start, period_1_end, period_2_start, period_2_end, period_3_start, period_3_end, created_at)
  VALUES (emp5_id, 'demo005@company.internal', '정하은', 'demo005', '신입', hire, '경영전략팀', '사원', 'employee',
    mentor1_id, '오현준', 'mentor01@company.internal',
    p1s, p1e, p2s, p2e, p3s, p3e, now())
  ON CONFLICT (employee_id) DO NOTHING;

  -- 신입사원 6: 강태양 (인사기획팀) - 낮게 시작, 크게 개선 2→4→5
  INSERT INTO public.users (id, email, name, employee_id, employee_type, hire_date, department, position, role,
    mentor_id, mentor_name, mentor_email,
    period_1_start, period_1_end, period_2_start, period_2_end, period_3_start, period_3_end, created_at)
  VALUES (emp6_id, 'demo006@company.internal', '강태양', 'demo006', '신입', hire, '인사기획팀', '사원', 'employee',
    mentor2_id, '신지아', 'mentor02@company.internal',
    p1s, p1e, p2s, p2e, p3s, p3e, now())
  ON CONFLICT (employee_id) DO NOTHING;


-- =====================================================
-- 3. 설문 응답 (18건: 6명 × 3차)
-- =====================================================

  -- ── 김유진 (demo001) ──────────────────────────────

  -- 1차: 전반적 중간, 구체적 피드백 아쉬움
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e1_r1, emp1_id, 1, now() - interval '67 days',
    4, 3, 3, 4, '멘토님이 OJT 첫날 일정을 미리 공유해주셔서 방향을 잡기 좋았습니다. 다만 업무가 바쁠 때 질문하기가 눈치 보였어요.',
    3, 4, 3, 3, '핵심 업무 내용은 잘 설명해 주셨는데, 내부 시스템 사용법은 혼자 찾아봐야 할 때가 많았습니다.',
    3, 3, 4, 3, '피드백을 주시긴 했는데 구체적인 개선 방향보다는 결과 위주의 평가가 많아서 아쉬웠습니다. 다음엔 어떻게 하면 되는지도 같이 알려주시면 좋겠어요.',
    4, 3, 3, 4, '팀원 분들 소개는 잘 해주셨는데 조직 문화나 보고 방식에 대한 안내가 조금 부족했어요.',
    '처음 업무 배정을 명확히 해주셔서 좋았습니다.', '시스템 사용 교육이 좀 더 체계적이었으면 합니다.', '열심히 적응해보겠습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 2차: 개선 흐름, 1:1 피드백 시작됨
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e1_r2, emp1_id, 2, now() - interval '37 days',
    4, 4, 5, 5, '1차보다 훨씬 편하게 질문할 수 있게 됐고, 멘토님이 별도 시간을 내어 1:1 피드백을 해주셨어요. 분위기가 많이 좋아졌습니다.',
    4, 4, 4, 4, '지난번보다 시스템 활용법도 차근차근 알려주셔서 업무 효율이 많이 올랐습니다.',
    4, 4, 4, 4, '업무 실수가 있었을 때 원인을 같이 분석해주셔서 다음엔 같은 실수를 줄일 수 있었습니다.',
    4, 4, 4, 4, '팀 회의에도 자연스럽게 참여하게 되었고 소통이 훨씬 원활해졌습니다.',
    '피드백 방식이 1차보다 훨씬 구체적이어서 좋았습니다.', '가끔 정기 체크인 시간이 있으면 더 좋겠습니다.', '점점 적응되는 것 같아서 뿌듯합니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 3차: 높은 만족도, 안정기
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e1_r3, emp1_id, 3, now() - interval '6 days',
    5, 5, 5, 5, '온보딩 기간 전반에 걸쳐 멘토님이 일관되게 지원해주셨고, 언제든 편하게 이야기할 수 있는 분위기였습니다.',
    5, 4, 5, 5, '이제 업무 전반을 스스로 처리할 수 있을 정도로 충분한 지식을 전달받았습니다.',
    4, 5, 5, 5, '자율적으로 업무를 처리하되 필요할 때 적절한 가이드를 주셔서 성장감을 느꼈습니다.',
    5, 5, 5, 5, '팀의 일원으로 완전히 녹아든 느낌이 들고 소통이 매우 자연스러워졌습니다.',
    '멘토님의 지속적인 관심과 격려가 가장 큰 힘이 되었습니다.', '딱히 아쉬운 점은 없는데 굳이 꼽자면 처음에 팀 워크숍 같은 걸 한 번 했으면 더 빠르게 친해졌을 것 같습니다.', '3개월이 정말 빠르게 지나갔습니다. 감사합니다!')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- ── 이준혁 (demo002) ──────────────────────────────

  -- 1차: 처음부터 높은 만족도
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e2_r1, emp2_id, 1, now() - interval '67 days',
    5, 4, 4, 4, '멘토님이 첫 주부터 명확한 목표를 제시해주셔서 방향을 잡기 쉬웠습니다. 정기 미팅도 빠짐없이 진행됐고요.',
    4, 4, 5, 4, '실무에 바로 적용할 수 있는 내용 위주로 가르쳐 주셔서 학습 효율이 높았습니다.',
    4, 4, 4, 4, '잘한 점과 개선할 점을 구체적인 사례를 들어 말씀해 주셔서 이해하기 좋았습니다.',
    4, 4, 5, 4, '팀 분위기를 자연스럽게 이해할 수 있도록 다양한 미팅에 초대해 주셨습니다.',
    '체계적인 온보딩 프로세스가 인상 깊었습니다.', '없습니다.', '좋은 팀에 합류하게 되어 기쁩니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 2차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e2_r2, emp2_id, 2, now() - interval '37 days',
    4, 5, 4, 5, '멘토님이 제 성장 속도를 잘 파악하고 계셔서, 제가 필요할 때 딱 필요한 수준의 도움을 주셨습니다.',
    4, 5, 5, 4, '업무 자동화 도구 사용법을 추가로 알려주셔서 생산성이 크게 높아졌습니다.',
    4, 4, 5, 5, '실수했을 때 비난하지 않고 개선 방법을 먼저 제안해 주시는 방식이 정말 좋습니다.',
    5, 4, 5, 5, '팀 전체와 자연스럽게 어울리게 됐고, 다른 부서와의 협업도 원활해졌습니다.',
    '자율성을 존중하면서도 필요할 때 지원해주시는 방식이 저한테 잘 맞습니다.', '없습니다.', '잘 적응하고 있습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 3차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e2_r3, emp2_id, 3, now() - interval '6 days',
    5, 5, 5, 5, '3개월 동안 한 번도 방치된 느낌이 없었습니다. 멘토님이 항상 관심을 갖고 챙겨주셨어요.',
    5, 5, 5, 5, '이제 독립적으로 업무를 수행할 역량을 갖추게 됐습니다. 탄탄한 기초를 다진 느낌입니다.',
    5, 5, 5, 5, '피드백이 항상 시의적절하고 구체적이었습니다. 덕분에 성장 속도가 빨랐습니다.',
    5, 5, 5, 5, '팀에 완전히 소속된 느낌입니다. 동료들과의 관계도 매우 좋습니다.',
    '전반적으로 완벽한 온보딩이었습니다. 멘토님께 감사드립니다.', '없습니다.', '앞으로도 잘 부탁드립니다!')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- ── 박소연 (demo003) ── 초기 어려움, 큰 개선 2→3→5 ──

  -- 1차: 가장 어려웠던 시기 - ABSA 시연에 최적
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e3_r1, emp3_id, 1, now() - interval '67 days',
    2, 2, 3, 2, '솔직히 처음 2주는 무엇을 배워야 하는지조차 몰랐어요. OJT 계획서가 있긴 했지만 너무 형식적이었고 실제 업무와 연결이 안 됐습니다. 멘토님이 많이 바쁘셔서 질문하기가 눈치 보였고요.',
    2, 3, 2, 2, '업무 설명을 한 번에 너무 많이 해주셔서 기억하기가 어려웠어요. 단계별로 나눠서 알려주셨으면 더 좋았을 것 같습니다. 그래도 핵심 시스템은 어느 정도 이해했습니다.',
    2, 2, 3, 2, '제가 만든 결과물에 대해 별다른 피드백이 없어서 잘 하고 있는지 불안했습니다. 칭찬이든 지적이든 반응이 있었으면 했어요.',
    3, 2, 2, 2, '팀 문화나 암묵적인 규칙들을 혼자 파악해야 해서 힘들었습니다. 눈치를 보면서 배우는 느낌이 들었어요.',
    '자리를 배정해주시고 기본 장비를 준비해주신 것은 감사했습니다.', 'OJT 계획을 실제 업무 기준으로 더 구체화해주셨으면 합니다. 그리고 정기적인 1:1 미팅이 있으면 좋겠어요.', '조금 힘들지만 최선을 다하겠습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 2차: 개선 시작
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e3_r2, emp3_id, 2, now() - interval '37 days',
    3, 3, 3, 4, '1차 피드백이 전달됐는지 멘토님이 정기 미팅을 제안해주셨습니다. 이전보다 훨씬 나아졌어요.',
    3, 3, 4, 3, '이번엔 업무를 단계별로 나눠서 가르쳐 주셔서 훨씬 이해하기 쉬웠습니다.',
    3, 3, 3, 3, '이제 제 업무에 대한 피드백을 받기 시작했는데, 아직은 좀 더 구체적이었으면 합니다.',
    3, 3, 3, 4, '팀원들과 조금씩 친해지고 있습니다. 팀 점심 모임에 초대받은 게 도움이 됐어요.',
    '정기 미팅이 생겨서 훨씬 편해졌습니다.', '피드백을 좀 더 구체적으로 해주셨으면 합니다.', '점점 나아지고 있습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 3차: 완전한 반전
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e3_r3, emp3_id, 3, now() - interval '6 days',
    5, 5, 5, 5, '2차 이후 멘토님과의 소통이 완전히 달라졌습니다. 이제는 오히려 제가 먼저 찾아가서 이야기를 나눌 정도로 편안해졌어요.',
    5, 4, 5, 5, '지금은 웬만한 업무는 혼자 처리할 수 있습니다. 3개월 전과 비교하면 정말 많이 성장했어요.',
    5, 5, 5, 4, '피드백 방식이 완전히 달라졌습니다. 이제는 제가 스스로 분석하고 멘토님이 보완해주는 방식으로 진행되어 훨씬 성장감이 있습니다.',
    5, 5, 5, 5, '팀의 분위기와 문화를 완전히 이해하게 됐고 자신감도 많이 생겼습니다.',
    '처음에 힘들었지만 포기하지 않도록 옆에서 지원해주셔서 감사합니다.', '없습니다. 오히려 처음 어려운 시간이 나중에 더 크게 성장하는 데 도움이 됐던 것 같습니다.', '처음에 힘들었던 만큼 지금의 성장이 더 뿌듯합니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- ── 최민준 (demo004) ── 꾸준히 높음 5→5→5 ──

  -- 1차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e4_r1, emp4_id, 1, now() - interval '67 days',
    5, 5, 5, 5, '멘토님이 IT 분야 전문가답게 기술적인 질문에도 막힘없이 답해주셔서 매우 만족스럽습니다. 항상 최신 트렌드도 함께 공유해주세요.',
    5, 5, 5, 4, '시스템 구조부터 업무 프로세스까지 체계적으로 설명해주셔서 빠르게 적응할 수 있었습니다.',
    5, 5, 5, 5, '코드 리뷰를 통해 제 작업물에 대한 상세한 피드백을 받을 수 있어서 기술적으로 많이 성장했습니다.',
    5, 5, 5, 5, '개발팀 특성상 동료들이 모두 협력적이어서 처음부터 잘 녹아들 수 있었습니다.',
    '기술적으로 뛰어난 멘토님께 많이 배울 수 있어서 감사합니다.', '없습니다.', '앞으로도 열심히 하겠습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 2차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e4_r2, emp4_id, 2, now() - interval '37 days',
    5, 5, 5, 5, '2개월째에도 변함없이 적극적으로 지원해주십니다. 특히 제가 새로운 기술을 시도할 때 적극적으로 격려해주셔서 좋았습니다.',
    5, 5, 5, 5, '이번 달은 실제 프로젝트에 투입되어 실전 경험을 쌓을 수 있었습니다. 매우 값진 경험이었습니다.',
    5, 5, 5, 5, '주간 1:1 미팅에서 기술적 성장뿐 아니라 커리어 방향에 대해서도 이야기를 나눠서 매우 만족스럽습니다.',
    5, 5, 5, 5, '팀 전체의 프로젝트 방향성을 이해하게 되면서 협업이 훨씬 효율적으로 됐습니다.',
    '기술적 역량 강화에 집중할 수 있는 환경을 만들어 주셔서 감사합니다.', '없습니다.', '매우 만족스럽습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 3차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e4_r3, emp4_id, 3, now() - interval '6 days',
    5, 5, 5, 5, '3개월 동안 한결같이 지원해주신 멘토님께 진심으로 감사드립니다. 덕분에 빠르게 역량을 키울 수 있었습니다.',
    5, 5, 5, 5, '이제 팀의 핵심 시스템을 독립적으로 운영할 수 있는 수준이 됐습니다.',
    5, 5, 5, 5, '피드백의 질과 양 모두 최고였습니다. 특히 장기적인 관점에서의 조언이 많은 도움이 됐습니다.',
    5, 5, 5, 5, '팀의 핵심 멤버로 인정받는 느낌입니다. 조직 문화도 완전히 이해하게 됐습니다.',
    '완벽한 온보딩이었습니다.', '없습니다.', '멘토님 같은 분이 계셔서 정말 다행입니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- ── 정하은 (demo005) ── 중간 유지 3→4→4 ──

  -- 1차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e5_r1, emp5_id, 1, now() - interval '67 days',
    3, 3, 4, 3, '멘토님이 바쁘신 편이라 자주 만나기는 어렵지만, 만날 때마다 알차게 도움을 주십니다.',
    3, 3, 3, 4, '업무에 필요한 기본적인 내용은 배웠지만, 심화 내용이나 팁 같은 것은 스스로 찾아야 했습니다.',
    4, 3, 3, 3, '가이드를 너무 잘 주시는 게 문제입니다. 제가 스스로 해볼 기회가 좀 더 많았으면 좋겠습니다.',
    3, 3, 4, 3, '팀 내 분위기는 좋지만 공식적인 자리에서는 아직 어색합니다.',
    '항상 친절하게 대해주시는 점이 좋습니다.', '자율적으로 업무를 시도해볼 기회를 더 주셨으면 합니다.', '꾸준히 성장하겠습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 2차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e5_r2, emp5_id, 2, now() - interval '37 days',
    4, 4, 4, 4, '이번 달부터 좀 더 자율적으로 업무를 진행하게 됐고 멘토님이 지원자 역할을 해주십니다.',
    4, 4, 4, 4, '이전보다 심화 내용도 가르쳐 주시고 실무 노하우도 공유해주셔서 좋았습니다.',
    4, 4, 4, 4, '피드백이 더 구체적이고 실용적이 됐습니다. 덕분에 개선 방향이 명확해졌어요.',
    4, 4, 4, 4, '이제 팀 문화에 꽤 적응이 됐고 동료들과도 편하게 지냅니다.',
    '자율성을 좀 더 주셔서 감사합니다.', '없습니다.', '좋은 방향으로 가고 있는 것 같습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 3차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e5_r3, emp5_id, 3, now() - interval '6 days',
    4, 4, 5, 5, '3개월을 돌아보면 꾸준히 성장해온 것 같아 뿌듯합니다. 멘토님이 제 페이스에 맞춰주셨습니다.',
    4, 5, 4, 4, '이제 독립적으로 업무를 수행할 수 있는 수준이 됐습니다. 기초가 탄탄하게 다져진 느낌입니다.',
    4, 4, 5, 5, '3차로 접어들면서 피드백이 더욱 심층적으로 이뤄졌고, 덕분에 전문성이 높아진 것 같습니다.',
    5, 4, 5, 5, '팀의 일원으로서 역할을 충분히 하고 있다고 느낍니다.',
    '꾸준히 옆에서 지켜봐주신 것이 큰 힘이 됐습니다.', '없습니다.', '앞으로도 잘 부탁드립니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- ── 강태양 (demo006) ── 낮게 시작, 큰 개선 2→4→5 ──

  -- 1차
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e6_r1, emp6_id, 1, now() - interval '67 days',
    2, 3, 2, 2, '멘토님이 바쁘신 것은 이해하지만, 첫 달 동안 제대로 된 OJT를 받은 적이 거의 없습니다. 혼자 알아서 해야 하는 상황이 많았어요.',
    2, 2, 3, 2, '업무에 필요한 지식을 어디서 얻어야 하는지 몰라서 많이 헤맸습니다. 기본적인 로드맵이라도 있었으면 했어요.',
    2, 2, 2, 3, '제 업무에 대한 피드백이 거의 없었습니다. 내가 잘 하고 있는지 아닌지도 모른 채로 한 달이 지났습니다.',
    2, 2, 2, 2, '팀 문화를 이해하기가 너무 어렵습니다. 눈치껏 행동해야 할 때가 많아서 힘들었습니다.',
    '없습니다.', '기본 업무 로드맵 제공, 주기적인 1:1 미팅, 피드백 체계화가 필요합니다.', '솔직히 많이 힘듭니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 2차: 중간 개선
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e6_r2, emp6_id, 2, now() - interval '37 days',
    4, 4, 4, 4, '1차 설문 이후 HR에서 면담을 해주셨고, 멘토님과 주간 미팅이 생겼습니다. 상황이 많이 달라졌어요.',
    4, 3, 4, 4, '이제는 무엇을 배워야 하는지 방향이 생겼습니다. 멘토님이 월별 목표를 같이 세워주셨어요.',
    4, 4, 3, 4, '이번 달부터 업무 피드백을 받기 시작했습니다. 아직 충분하지는 않지만 이전보다 훨씬 낫습니다.',
    4, 4, 4, 3, '팀원들과 조금씩 가까워지고 있습니다. 팀 문화도 이제는 어느 정도 이해가 됩니다.',
    '1차 피드백을 반영해주신 HR팀과 멘토님께 감사합니다.', '피드백을 좀 더 체계화했으면 합니다.', '많이 나아졌습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;

  -- 3차: 완전한 반전
  INSERT INTO survey_responses (id, user_id, round_number, submitted_at,
    q1_1, q1_2, q1_3, q1_4, q1_5,
    q2_1, q2_2, q2_3, q2_4, q2_5,
    q3_1, q3_2, q3_3, q3_4, q3_5,
    q4_1, q4_2, q4_3, q4_4, q4_5,
    q5_1, q5_2, q5_3)
  VALUES (sr_e6_r3, emp6_id, 3, now() - interval '6 days',
    5, 5, 5, 5, '지금의 멘토님은 1차 때와는 완전히 다른 분처럼 느껴집니다. 항상 먼저 연락을 주시고 진심으로 신경 써주십니다.',
    5, 5, 5, 5, '이제 업무 전반을 독립적으로 처리할 수 있게 됐습니다. 2개월 만에 이 정도 성장을 이룬 것이 스스로도 놀랍습니다.',
    5, 5, 5, 5, '체계적인 피드백 덕분에 제 약점을 정확히 파악하고 개선할 수 있었습니다. 피드백의 질이 정말 높습니다.',
    5, 5, 5, 5, '이제는 팀에서 없어서는 안 될 멤버라고 느껴집니다. 완전히 소속감을 느끼고 있습니다.',
    '어려운 시작을 포기하지 않도록 도와주신 HR팀과 멘토님 모두 감사합니다.', '온보딩 초기 관리를 더 체계화하면 저처럼 힘들게 시작하는 사람이 없을 것 같습니다.', '처음 한 달이 너무 힘들었지만, 그 경험이 오히려 저를 더 단단하게 만든 것 같습니다.')
  ON CONFLICT (user_id, round_number) DO NOTHING;


-- =====================================================
-- 4. ABSA 분석 결과 사전 탑재 (시연용: API 없이도 조회 가능)
-- =====================================================

  -- [박소연 demo003 - 1차] 가장 드라마틱한 ABSA 시연용
  INSERT INTO analysis_results (response_id, aspects, raw_result, analyzed_at)
  VALUES (
    sr_e3_r1,
    '[
      {"source_field":"q1_5","aspect":"OJT 계획의 실무 연계성","sentiment":"부정","confidence":"높음","quote":"OJT 계획서가 있긴 했지만 너무 형식적이었고 실제 업무와 연결이 안 됐습니다","rationale_short":"형식적 계획과 실제 업무의 괴리를 명시적으로 지적"},
      {"source_field":"q1_5","aspect":"멘토 접근 가능성","sentiment":"부정","confidence":"높음","quote":"멘토님이 많이 바쁘셔서 질문하기가 눈치 보였고요","rationale_short":"질문 자체를 포기하게 만드는 접근 장벽"},
      {"source_field":"q1_5","aspect":"온보딩 초기 방향 제시","sentiment":"부정","confidence":"높음","quote":"처음 2주는 무엇을 배워야 하는지조차 몰랐어요","rationale_short":"목표 부재로 인한 온보딩 표류"},
      {"source_field":"q2_5","aspect":"지식 전달 방식 (분량 조절)","sentiment":"약간부정","confidence":"높음","quote":"업무 설명을 한 번에 너무 많이 해주셔서 기억하기가 어려웠어요","rationale_short":"한 번에 과도한 정보 제공으로 학습 효율 저하"},
      {"source_field":"q2_5","aspect":"시스템 기초 이해","sentiment":"중립","confidence":"보통","quote":"그래도 핵심 시스템은 어느 정도 이해했습니다","rationale_short":"어려움 속에서도 최소한의 기초는 습득"},
      {"source_field":"q3_5","aspect":"업무 결과물 피드백","sentiment":"부정","confidence":"높음","quote":"제가 만든 결과물에 대해 별다른 피드백이 없어서 잘 하고 있는지 불안했습니다","rationale_short":"피드백 부재로 인한 불안감과 방향 상실"},
      {"source_field":"q4_5","aspect":"조직 문화 안내","sentiment":"부정","confidence":"높음","quote":"팀 문화나 암묵적인 규칙들을 혼자 파악해야 해서 힘들었습니다","rationale_short":"비공식 조직 규범 파악을 신입이 혼자 감당"},
      {"source_field":"q5_2","aspect":"OJT 체계화 요구","sentiment":"약간부정","confidence":"높음","quote":"OJT 계획을 실제 업무 기준으로 더 구체화해주셨으면 합니다","rationale_short":"개선 요청으로 현재 체계의 불충분함을 간접 표현"},
      {"source_field":"q5_2","aspect":"정기 1:1 미팅 필요성","sentiment":"약간부정","confidence":"높음","quote":"정기적인 1:1 미팅이 있으면 좋겠어요","rationale_short":"부재한 정기 소통 채널에 대한 명시적 요청"}
    ]'::jsonb,
    '박소연(demo003) 1차 설문 ABSA 분석 - 사전 탑재 시연 데이터',
    now() - interval '60 days'
  )
  ON CONFLICT DO NOTHING;

  -- [정하은 demo005 - 1차] 칭찬형 표현 속 개선 요구 - 흥미로운 ABSA 케이스
  INSERT INTO analysis_results (response_id, aspects, raw_result, analyzed_at)
  VALUES (
    sr_e5_r1,
    '[
      {"source_field":"q1_5","aspect":"멘토 접근 가능성","sentiment":"약간부정","confidence":"높음","quote":"멘토님이 바쁘신 편이라 자주 만나기는 어렵지만","rationale_short":"빈도 부족을 유보적 표현으로 완화했으나 실질적 한계 인정"},
      {"source_field":"q3_5","aspect":"자율적 업무 시도 기회","sentiment":"약간부정","confidence":"높음","quote":"가이드를 너무 잘 주시는 게 문제입니다. 제가 스스로 해볼 기회가 좀 더 많았으면 좋겠습니다","rationale_short":"칭찬형 표현이나 핵심은 자율성 부족에 대한 명확한 개선 요구"},
      {"source_field":"q1_5","aspect":"멘토링 밀도","sentiment":"긍정","confidence":"보통","quote":"만날 때마다 알차게 도움을 주십니다","rationale_short":"빈도는 부족하나 만남의 질은 높게 평가"},
      {"source_field":"q2_5","aspect":"심화 지식 전달","sentiment":"약간부정","confidence":"보통","quote":"심화 내용이나 팁 같은 것은 스스로 찾아야 했습니다","rationale_short":"기본 수준은 충족했으나 심화 학습 지원 부족"}
    ]'::jsonb,
    '정하은(demo005) 1차 설문 ABSA 분석 - 사전 탑재 시연 데이터',
    now() - interval '60 days'
  )
  ON CONFLICT DO NOTHING;

  -- [강태양 demo006 - 1차] 가장 심각한 케이스 - 이메일 초안 생성 시연용
  INSERT INTO analysis_results (response_id, aspects, raw_result, analyzed_at)
  VALUES (
    sr_e6_r1,
    '[
      {"source_field":"q1_5","aspect":"OJT 실시 여부","sentiment":"부정","confidence":"높음","quote":"첫 달 동안 제대로 된 OJT를 받은 적이 거의 없습니다","rationale_short":"온보딩 자체가 사실상 제공되지 않은 심각한 상황"},
      {"source_field":"q1_5","aspect":"멘토 개입 빈도","sentiment":"부정","confidence":"높음","quote":"혼자 알아서 해야 하는 상황이 많았어요","rationale_short":"멘토 부재로 신입이 방치된 상태"},
      {"source_field":"q2_5","aspect":"학습 로드맵 제공","sentiment":"부정","confidence":"높음","quote":"업무에 필요한 지식을 어디서 얻어야 하는지 몰라서 많이 헤맸습니다","rationale_short":"학습 방향 자체가 제시되지 않음"},
      {"source_field":"q3_5","aspect":"업무 피드백 제공","sentiment":"부정","confidence":"높음","quote":"제 업무에 대한 피드백이 거의 없었습니다. 내가 잘 하고 있는지 아닌지도 모른 채로 한 달이 지났습니다","rationale_short":"피드백 완전 부재로 인한 방향 상실과 불안"},
      {"source_field":"q4_5","aspect":"조직 문화 적응 지원","sentiment":"부정","confidence":"높음","quote":"팀 문화를 이해하기가 너무 어렵습니다. 눈치껏 행동해야 할 때가 많아서 힘들었습니다","rationale_short":"조직 적응 지원 전혀 없음"},
      {"source_field":"q5_3","aspect":"전반적 온보딩 만족도","sentiment":"부정","confidence":"높음","quote":"솔직히 많이 힘듭니다","rationale_short":"모든 영역의 부족함이 누적된 감정적 소진"}
    ]'::jsonb,
    '강태양(demo006) 1차 설문 ABSA 분석 - 사전 탑재 시연 데이터',
    now() - interval '60 days'
  )
  ON CONFLICT DO NOTHING;

  -- [김유진 demo001 - 1차]
  INSERT INTO analysis_results (response_id, aspects, raw_result, analyzed_at)
  VALUES (
    sr_e1_r1,
    '[
      {"source_field":"q1_5","aspect":"OJT 사전 안내 및 방향 제시","sentiment":"긍정","confidence":"높음","quote":"OJT 첫날 일정을 미리 공유해주셔서 방향을 잡기 좋았습니다","rationale_short":"사전 정보 제공이 초기 적응에 긍정적으로 작용"},
      {"source_field":"q1_5","aspect":"질문 가능한 분위기","sentiment":"약간부정","confidence":"높음","quote":"업무가 바쁠 때 질문하기가 눈치 보였어요","rationale_short":"멘토의 업무 부하가 신입의 질문 접근성을 제한"},
      {"source_field":"q2_5","aspect":"시스템 사용법 교육","sentiment":"약간부정","confidence":"높음","quote":"내부 시스템 사용법은 혼자 찾아봐야 할 때가 많았습니다","rationale_short":"핵심 업무 교육은 이뤄졌으나 시스템 교육은 방치"},
      {"source_field":"q3_5","aspect":"피드백의 구체성","sentiment":"약간부정","confidence":"높음","quote":"구체적인 개선 방향보다는 결과 위주의 평가가 많아서 아쉬웠습니다","rationale_short":"결과 평가는 있으나 개선 방법 제시 부재"},
      {"source_field":"q3_5","aspect":"행동 가능한 피드백 제공","sentiment":"약간부정","confidence":"보통","quote":"다음엔 어떻게 하면 되는지도 같이 알려주시면 좋겠어요","rationale_short":"개선 방향까지 포함한 피드백에 대한 명시적 요청"}
    ]'::jsonb,
    '김유진(demo001) 1차 설문 ABSA 분석 - 사전 탑재 시연 데이터',
    now() - interval '60 days'
  )
  ON CONFLICT DO NOTHING;


-- =====================================================
-- 5. 객관식 시계열 분석 결과 사전 탑재
-- =====================================================

  -- 김유진: 성장 패턴 (3→4→5)
  INSERT INTO objective_analyses (user_id, chart_data, summary, analyzed_at)
  VALUES (
    emp1_id,
    '[
      {"round":"1차","part1":3.5,"part2":3.25,"part3":3.25,"part4":3.5},
      {"round":"2차","part1":4.5,"part2":4.0,"part3":4.0,"part4":4.0},
      {"round":"3차","part1":5.0,"part2":4.75,"part3":4.75,"part4":5.0}
    ]'::jsonb,
    '김유진 사원은 1차에서 평균 3.4점으로 시작하여 3차에서 4.9점으로 꾸준하고 일관된 성장세를 보였습니다. 특히 멘토링 태도(Part 1)와 조직 적응(Part 4) 영역에서 가장 큰 향상을 보였으며, 2차 이후 1:1 미팅이 도입된 시점부터 전 영역에서 급격한 개선이 나타났습니다.',
    now() - interval '5 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 박소연: 드라마틱 반전 (2→3→5)
  INSERT INTO objective_analyses (user_id, chart_data, summary, analyzed_at)
  VALUES (
    emp3_id,
    '[
      {"round":"1차","part1":2.25,"part2":2.25,"part3":2.25,"part4":2.25},
      {"round":"2차","part1":3.25,"part2":3.25,"part3":3.0,"part4":3.25},
      {"round":"3차","part1":5.0,"part2":4.75,"part3":4.75,"part4":5.0}
    ]'::jsonb,
    '박소연 사원은 가장 드라마틱한 성장 궤적을 보였습니다. 1차 평균 2.25점(전체 최저)에서 시작하였으나, 조기 개입과 멘토링 방식 개선을 통해 3차에서 4.9점(전체 최고 수준)을 달성했습니다. 이 사례는 초기 온보딩 위기 감지 및 적시 개입의 중요성을 명확히 보여줍니다.',
    now() - interval '5 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 최민준: 일관된 최고 (5→5→5)
  INSERT INTO objective_analyses (user_id, chart_data, summary, analyzed_at)
  VALUES (
    emp4_id,
    '[
      {"round":"1차","part1":5.0,"part2":4.75,"part3":5.0,"part4":5.0},
      {"round":"2차","part1":5.0,"part2":5.0,"part3":5.0,"part4":5.0},
      {"round":"3차","part1":5.0,"part2":5.0,"part3":5.0,"part4":5.0}
    ]'::jsonb,
    '최민준 사원은 3개월 내내 전 영역에서 최고 수준의 만족도를 유지했습니다. 이는 멘토(신지아 대리)의 기술적 전문성과 체계적인 온보딩 방식이 신입사원의 빠른 적응을 지원한 우수 사례로 볼 수 있습니다.',
    now() - interval '5 days'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 강태양: 위기 후 반전 (2→4→5)
  INSERT INTO objective_analyses (user_id, chart_data, summary, analyzed_at)
  VALUES (
    emp6_id,
    '[
      {"round":"1차","part1":2.25,"part2":2.0,"part3":2.25,"part4":2.0},
      {"round":"2차","part1":4.0,"part2":3.75,"part3":3.75,"part4":3.75},
      {"round":"3차","part1":5.0,"part2":5.0,"part3":5.0,"part4":5.0}
    ]'::jsonb,
    '강태양 사원은 1차 평균 2.1점으로 가장 심각한 온보딩 위기를 경험했으나, HR 개입 후 멘토링 체계가 재정비되어 3차에서 만점을 달성했습니다. 1차와 2차 사이의 급격한 개선(+1.75점)은 구조적 지원의 효과를 명확히 보여주는 사례입니다.',
    now() - interval '5 days'
  )
  ON CONFLICT (user_id) DO NOTHING;


-- =====================================================
-- 6. 공지사항 샘플
-- =====================================================

  INSERT INTO announcements (title, content, author, is_pinned, published_at)
  VALUES (
    '[필독] 2026년 상반기 신입사원 온보딩 일정 안내',
    '<h2>2026년 상반기 신입사원 온보딩 안내</h2><p>안녕하세요, 인사기획팀입니다.</p><p>이번 상반기 신입사원 온보딩 일정을 아래와 같이 안내드립니다.</p><ul><li><strong>온보딩 기간:</strong> 입사일로부터 90일</li><li><strong>설문조사:</strong> 매월 말 (1차/2차/3차)</li><li><strong>OJT 일지:</strong> 매주 금요일까지 제출</li></ul><p>궁금한 점은 인사기획팀(내선 1234)으로 연락 주세요.</p>',
    '인사기획팀',
    true,
    now() - interval '95 days'
  );

  INSERT INTO announcements (title, content, author, is_pinned, published_at)
  VALUES (
    '멘토-멘티 결연식 개최 안내 (1월 15일)',
    '<h2>멘토-멘티 결연식 개최</h2><p>신입사원 여러분과 멘토분들의 공식적인 결연을 축하하는 자리를 마련했습니다.</p><p><strong>일시:</strong> 2026년 1월 15일 오후 3시<br><strong>장소:</strong> 본사 3층 대회의실</p><p>많은 참여 부탁드립니다.</p>',
    '인사기획팀',
    false,
    now() - interval '95 days'
  );

END $$;

-- =====================================================
-- 확인 쿼리 (실행 후 데이터 확인용)
-- =====================================================
-- SELECT name, employee_id, role, department FROM users WHERE employee_id LIKE 'demo%' OR employee_id LIKE 'mentor%' ORDER BY role, employee_id;
-- SELECT u.name, sr.round_number, sr.submitted_at FROM survey_responses sr JOIN users u ON sr.user_id = u.id ORDER BY u.name, sr.round_number;
-- SELECT u.name, COUNT(ar.id) as absa_count FROM users u LEFT JOIN survey_responses sr ON sr.user_id = u.id LEFT JOIN analysis_results ar ON ar.response_id = sr.id GROUP BY u.name ORDER BY absa_count DESC;
