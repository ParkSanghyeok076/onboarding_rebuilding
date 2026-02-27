# 설문조사 직원 화면 설계

**작성일:** 2026-02-27
**세션:** 3
**범위:** 신규입사자 설문조사 직원 화면 신규 구현

---

## 1. 요구사항 확정

| 항목 | 결정 |
|------|------|
| 설문 응시 가능 기간 판단 | 사용자별 `period_x_start/end` 기준 |
| 제출 후 수정 | 불가 (제출 즉시 잠금) |
| 문항 표시 방식 | 파트별 단계 표시 (Part 1→2→3→4→5) |
| 제출 후 조회 | 가능 (읽기 전용) |

---

## 2. 화면 흐름

```
메인메뉴 → Survey(컨테이너)
              ├─ SurveyList   : 회차 목록
              ├─ SurveyForm   : 파트별 폼 작성
              └─ SurveyResult : 제출 결과 읽기 전용
```

### 회차 표시 규칙
- 신입: 1차(period_1), 2차(period_2), 3차(period_3) 표시
- 경력: 1차(period_1)만 표시
- 상태: `기간 전` / `응시 가능` / `기간 종료` / `제출 완료`
- 응시 가능 + 미제출만 [응시하기] 버튼 활성화
- 제출 완료는 [결과보기] 버튼 표시

---

## 3. 컴포넌트 구조

```
src/pages/
├── Survey.js       # 컨테이너: view 상태(list/form/result) + selectedRound 관리
├── SurveyList.js   # 회차 목록 카드
├── SurveyForm.js   # 5파트 폼, 파트별 페이지네이션, 제출
├── SurveyResult.js # 제출된 답변 읽기 전용
└── Pages.css       # 기존 파일에 스타일 추가
```

### Survey.js (컨테이너)
- props: `user`, `onBack`
- state: `view('list'|'form'|'result')`, `selectedRound(1|2|3)`
- App.js에서 `user` prop 추가 필요

### SurveyList.js
- props: `user`, `responses[]`, `onStart(roundNumber)`, `onViewResult(roundNumber)`
- Supabase에서 본인 제출 내역 조회 후 회차별 상태 계산

### SurveyForm.js
- props: `user`, `roundNumber`, `onSubmitted`, `onBack`
- state: `currentPart(1~5)`, `answers{q1_1...q5_3}`
- 객관식 미응답 시 다음 파트 이동 불가
- 제출 시 확인 다이얼로그 → Supabase INSERT

### SurveyResult.js
- props: `user`, `roundNumber`, `onBack`
- Supabase에서 제출 내역 조회 후 읽기 전용 표시

---

## 4. DB 변경: survey_responses 컬럼 추가

기존 `subjective_1`, `subjective_2` 제거 후 아래로 교체:

```sql
-- Part 1 (OJT 준비 및 멘토링 태도)
q1_1 integer CHECK (q1_1 BETWEEN 1 AND 5),  -- 체계성
q1_2 integer CHECK (q1_2 BETWEEN 1 AND 5),  -- 성실성
q1_3 integer CHECK (q1_3 BETWEEN 1 AND 5),  -- 접근성
q1_4 integer CHECK (q1_4 BETWEEN 1 AND 5),  -- 존중
q1_5 text,                                   -- 태도 상세 (주관식)

-- Part 2 (업무 지식 및 기술 전수)
q2_1 integer CHECK (q2_1 BETWEEN 1 AND 5),  -- 명확성
q2_2 integer CHECK (q2_2 BETWEEN 1 AND 5),  -- 설명력
q2_3 integer CHECK (q2_3 BETWEEN 1 AND 5),  -- 효과성
q2_4 integer CHECK (q2_4 BETWEEN 1 AND 5),  -- 충분성
q2_5 text,                                   -- 지식전수 상세 (주관식)

-- Part 3 (실무 지도 및 피드백)
q3_1 integer CHECK (q3_1 BETWEEN 1 AND 5),  -- 기회 제공
q3_2 integer CHECK (q3_2 BETWEEN 1 AND 5),  -- 피드백의 질
q3_3 integer CHECK (q3_3 BETWEEN 1 AND 5),  -- 문제해결 지원
q3_4 integer CHECK (q3_4 BETWEEN 1 AND 5),  -- 방향성
q3_5 text,                                   -- 피드백 상세 (주관식)

-- Part 4 (조직 적응 지원 및 소통)
q4_1 integer CHECK (q4_1 BETWEEN 1 AND 5),  -- 심리적 지원
q4_2 integer CHECK (q4_2 BETWEEN 1 AND 5),  -- 관계형성 지원
q4_3 integer CHECK (q4_3 BETWEEN 1 AND 5),  -- 문화 적응
q4_4 integer CHECK (q4_4 BETWEEN 1 AND 5),  -- 정보 공유
q4_5 text,                                   -- 조직적응 상세 (주관식)

-- Part 5 (주관식 종합 의견)
q5_1 text,  -- 유지/강점
q5_2 text,  -- 개선 제안
q5_3 text   -- 자유 의견
```

**Supabase SQL Editor에서 직접 실행 필요** (마이그레이션 스크립트 제공 예정)

---

## 5. SurveyForm 파트 구성

| 파트 | 제목 | 문항 수 | 타입 |
|------|------|---------|------|
| Part 1 | OJT 준비 및 멘토링 태도 | 4객관 + 1주관 | 척도+텍스트 |
| Part 2 | 업무 지식 및 기술 전수 | 4객관 + 1주관 | 척도+텍스트 |
| Part 3 | 실무 지도 및 피드백 | 4객관 + 1주관 | 척도+텍스트 |
| Part 4 | 조직 적응 지원 및 소통 | 4객관 + 1주관 | 척도+텍스트 |
| Part 5 | 주관식 종합 의견 | 3주관 | 텍스트 |

- 객관식: 라디오 버튼 1~5점 (1=매우 불만족, 5=매우 만족)
- 주관식: textarea (선택 입력)
- 객관식 4문항 미응답 시 다음 버튼 비활성화
- Part 5는 전부 선택 입력, 제출 가능
- 진행 바: ■■□□□ 현재파트/5 표시

---

## 6. 구현 순서

1. DB 마이그레이션 SQL 작성 및 적용
2. App.js — Survey에 `user` prop 추가
3. Survey.js — 컨테이너 구현
4. SurveyList.js — 회차 목록
5. SurveyForm.js — 파트별 폼
6. SurveyResult.js — 읽기 전용 결과
7. Pages.css — 스타일 추가
