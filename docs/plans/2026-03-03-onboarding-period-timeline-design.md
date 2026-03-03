# 온보딩 기간 계산 변경 + 타임라인 시각화 설계

**날짜:** 2026-03-03
**상태:** 승인됨

---

## 1. 배경

기존 온보딩 기간은 JavaScript의 `setMonth()`를 사용해 달(月) 단위로 계산했으나,
월마다 일수가 달라 정확한 기간 보장이 안 됨.
예) 박하나(2002001): 입사일 2026-02-11 기준 3개월 → 2026-05-11 (실제 12주 = 84일 → 2026-05-06)

---

## 2. 기간 계산 변경

| 구분 | 기존 | 변경 |
|------|------|------|
| 신입 전체 | hire_date + 3개월 | hire_date + 84일 (12주) |
| 신입 1차 | +0 ~ +1개월 | +0일 ~ +28일 (4주) |
| 신입 2차 | +1개월 ~ +2개월 | +28일 ~ +56일 (4주) |
| 신입 3차 | +2개월 ~ +3개월 | +56일 ~ +84일 (4주) |
| 경력 전체 | hire_date + 1개월 | hire_date + 28일 (4주) |

### 적용 범위
- 신규 등록 직원: Edge Function 로직 변경으로 자동 적용
- 기존 DB 직원: Supabase SQL 실행으로 기존 period 날짜 재계산 업데이트

---

## 3. 타임라인 시각화

온보딩 프로그램 페이지의 기간 텍스트를 시각적 타임라인으로 교체.

### 신입 (4노드)
```
●════▲════●──────●──────●
입사일 오늘 1차종료 2차종료 3차종료
날짜   현재  날짜    날짜    날짜
```

### 경력 (2노드)
```
●════▲════●
입사일 오늘 종료일
날짜   현재  날짜
```

### 색상 규칙
- 완료 구간 (오늘 이전): 초록색 (`#4caf50`)
- 진행 중 구간 (현재 속한 구간): 파란색 (`#6366f1`)
- 미진행 구간 (오늘 이후): 회색 (`#d1d5db`)
- 오늘 마커(▲): 빨간색 점선 또는 주황색

### 노드 레이블
- 위: 날짜 (YYYY-MM-DD)
- 아래: 역할명 (입사일 / 1차종료 / 2차종료 / 3차종료 / 종료일)

---

## 4. 변경 파일 목록

### Backend
- `supabase/functions/register-users/index.ts`
  - `addMonths()` 삭제 → `addDays()` 추가
  - 신입: period 경계를 28일 단위로 계산
  - 경력: period_1_end = hire_date + 28일

### Frontend
- `src/components/OnboardingTimeline.js` (신규)
  - props: `user` (period_1_start, period_1_end, period_2_end, period_3_end, employee_type)
  - 신입/경력 분기 렌더링
  - 오늘 날짜 기준 하이라이트
- `src/components/Header.js`
  - 기간 텍스트 → `OnboardingTimeline` 컴포넌트로 교체
- `src/pages/OnboardingProgram.js`
  - Header에 `period` 문자열 대신 `user` 객체 전달
- `src/pages/AdminUsers.js`
  - CSV 미리보기의 "+3개월" / "+1개월" → "+12주(84일)" / "+4주(28일)"로 수정
- `src/pages/Pages.css`
  - 타임라인 스타일 추가

### DB 마이그레이션
- Supabase SQL 에디터에서 아래 SQL 실행:
```sql
UPDATE users
SET
  period_1_end   = (hire_date::date + INTERVAL '28 days')::text,
  period_2_start = CASE WHEN employee_type = '신입' THEN (hire_date::date + INTERVAL '28 days')::text ELSE NULL END,
  period_2_end   = CASE WHEN employee_type = '신입' THEN (hire_date::date + INTERVAL '56 days')::text ELSE NULL END,
  period_3_start = CASE WHEN employee_type = '신입' THEN (hire_date::date + INTERVAL '56 days')::text ELSE NULL END,
  period_3_end   = CASE WHEN employee_type = '신입' THEN (hire_date::date + INTERVAL '84 days')::text ELSE NULL END
WHERE role = 'employee';
```

---

## 5. 검증 케이스

박하나(2002001), 입사일 2026-02-11, 신입:
- period_1_start: 2026-02-11
- period_1_end:   2026-03-11 (+28일)
- period_2_end:   2026-04-08 (+56일)
- period_3_end:   2026-05-06 (+84일) ← 기존 5/11에서 변경
