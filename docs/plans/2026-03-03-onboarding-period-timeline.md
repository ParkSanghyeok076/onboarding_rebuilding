# 온보딩 기간 12주 변경 + 타임라인 시각화 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 온보딩 기간 계산을 월(月) 단위에서 주(週) 단위(신입 12주/경력 4주)로 변경하고, 온보딩 프로그램 페이지에 타임라인 시각화를 추가한다.

**Architecture:** Edge Function의 `addMonths()` → `addDays()` 교체, 기존 DB 직원 period 재계산, 프론트에 새 `OnboardingTimeline` 컴포넌트 추가 후 Header에서 사용.

**Tech Stack:** React 19, Supabase Edge Functions (Deno/TypeScript), CSS (no CSS-in-JS)

---

## Task 1: DB 마이그레이션 — 기존 직원 period 재계산

**Files:**
- 작업 위치: Supabase 대시보드 > SQL Editor (코드 변경 없음)

### Step 1: SQL 실행

Supabase 대시보드(https://supabase.com → 프로젝트 선택 → SQL Editor)에서 아래 SQL을 실행한다.

```sql
-- 실행 전 현재 값 확인 (선택사항)
SELECT employee_id, name, hire_date, employee_type,
       period_1_end, period_2_end, period_3_end
FROM users
WHERE role = 'employee';

-- 기간 재계산 업데이트
UPDATE users
SET
  period_1_end   = (hire_date::date + INTERVAL '28 days')::text,
  period_2_start = CASE WHEN employee_type = '신입'
                        THEN (hire_date::date + INTERVAL '28 days')::text
                        ELSE NULL END,
  period_2_end   = CASE WHEN employee_type = '신입'
                        THEN (hire_date::date + INTERVAL '56 days')::text
                        ELSE NULL END,
  period_3_start = CASE WHEN employee_type = '신입'
                        THEN (hire_date::date + INTERVAL '56 days')::text
                        ELSE NULL END,
  period_3_end   = CASE WHEN employee_type = '신입'
                        THEN (hire_date::date + INTERVAL '84 days')::text
                        ELSE NULL END
WHERE role = 'employee';

-- 결과 확인
SELECT employee_id, name, hire_date, employee_type,
       period_1_end, period_2_end, period_3_end
FROM users
WHERE role = 'employee';
```

### Step 2: 결과 검증

박하나(2002001) 기준으로 확인:
- `hire_date`: `2026-02-11`
- `period_1_end` 기대값: `2026-03-11` (+28일)
- `period_2_end` 기대값: `2026-04-08` (+56일)
- `period_3_end` 기대값: `2026-05-06` (+84일) ← 기존 2026-05-11에서 변경

---

## Task 2: Edge Function 수정 — addMonths → addDays

**Files:**
- Modify: `supabase/functions/register-users/index.ts`

### Step 1: `addMonths` 함수를 `addDays`로 교체

`supabase/functions/register-users/index.ts` 9~13번째 줄의 `addMonths` 함수를 아래로 교체:

```typescript
// 기존 (삭제)
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

// 변경 후
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}
```

### Step 2: 기간 계산 로직 변경

`index.ts` 97~108번째 줄의 기간 계산 블록을 아래로 교체:

```typescript
// 기존 (삭제)
const period_1_start = hire_date
const period_1_end = addMonths(hire_date, 1)
let period_2_start = null, period_2_end = null
let period_3_start = null, period_3_end = null

if (employee_type === '신입') {
  period_2_start = addMonths(hire_date, 1)
  period_2_end = addMonths(hire_date, 2)
  period_3_start = addMonths(hire_date, 2)
  period_3_end = addMonths(hire_date, 3)
}

// 변경 후
const period_1_start = hire_date
const period_1_end = addDays(hire_date, 28)          // 4주
let period_2_start = null, period_2_end = null
let period_3_start = null, period_3_end = null

if (employee_type === '신입') {
  period_2_start = addDays(hire_date, 28)             // 4주
  period_2_end   = addDays(hire_date, 56)             // 8주
  period_3_start = addDays(hire_date, 56)             // 8주
  period_3_end   = addDays(hire_date, 84)             // 12주
}
```

### Step 3: Edge Function 재배포

터미널에서 실행:
```bash
npx supabase functions deploy register-users
```
Expected output: `Deployed Functions register-users`

### Step 4: 커밋

```bash
git add supabase/functions/register-users/index.ts
git commit -m "feat: 온보딩 기간 계산 addMonths → addDays (신입 12주, 경력 4주)"
```

---

## Task 3: AdminUsers 미리보기 텍스트 수정

**Files:**
- Modify: `src/pages/AdminUsers.js:111-113`

### Step 1: 미리보기 텍스트 변경

`AdminUsers.js` 111~113번째 줄을 아래로 교체:

```jsx
// 기존 (삭제)
{r.employee_type === '신입'
  ? `${r.hire_date} ~ +3개월`
  : `${r.hire_date} ~ +1개월`}

// 변경 후
{r.employee_type === '신입'
  ? `${r.hire_date} ~ +12주 (84일)`
  : `${r.hire_date} ~ +4주 (28일)`}
```

### Step 2: 로컬에서 확인

```bash
npm start
```
관리자 > 직원 일괄 등록 메뉴 > CSV 업로드 → 미리보기 테이블의 "온보딩 기간" 컬럼에 "+12주 (84일)" 또는 "+4주 (28일)" 표시 확인.

### Step 3: 커밋

```bash
git add src/pages/AdminUsers.js
git commit -m "fix: 직원 등록 미리보기 기간 텍스트 12주/4주로 수정"
```

---

## Task 4: OnboardingTimeline 컴포넌트 생성

**Files:**
- Create: `src/components/OnboardingTimeline.js`
- Modify: `src/App.css` (타임라인 CSS 추가)

### Step 1: `OnboardingTimeline.js` 생성

`src/components/OnboardingTimeline.js` 파일을 새로 만든다:

```jsx
import React from 'react';

export default function OnboardingTimeline({ user }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // "2026-03-11" → "03/11"
  const fmt = (str) => (str ? str.slice(5).replace('-', '/') : '—');

  const isNewHire = user.employee_type === '신입';

  const nodes = isNewHire
    ? [
        { date: user.period_1_start, label: '입사일'  },
        { date: user.period_1_end,   label: '1차종료' },
        { date: user.period_2_end,   label: '2차종료' },
        { date: user.period_3_end,   label: '3차종료' },
      ]
    : [
        { date: user.period_1_start, label: '입사일' },
        { date: user.period_1_end,   label: '종료일' },
      ];

  const startDate = toDate(nodes[0].date);
  const endDate   = toDate(nodes[nodes.length - 1].date);
  const totalMs   = endDate - startDate;

  const toPct = (dateStr) => {
    if (!dateStr || !totalMs) return 0;
    return Math.min(100, Math.max(0, ((toDate(dateStr) - startDate) / totalMs) * 100));
  };

  const todayPct = Math.min(100, Math.max(0, ((today - startDate) / totalMs) * 100));
  const showToday = today > startDate && today < endDate;

  const segClass = (s, e) => {
    const sd = toDate(s), ed = toDate(e);
    if (ed <= today) return 'tl-seg--done';
    if (sd <= today) return 'tl-seg--active';
    return 'tl-seg--pending';
  };

  const dotClass = (d) => (toDate(d) <= today ? 'tl-dot--done' : 'tl-dot--pending');

  return (
    <div className="tl-container">
      <div className="tl-track">
        {/* Base line */}
        <div className="tl-base-line" />

        {/* Colored segments */}
        {nodes.slice(0, -1).map((n, i) => {
          const left  = toPct(n.date);
          const width = toPct(nodes[i + 1].date) - left;
          return (
            <div
              key={i}
              className={`tl-segment ${segClass(n.date, nodes[i + 1].date)}`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}

        {/* Today marker */}
        {showToday && (
          <div className="tl-today" style={{ left: `${todayPct}%` }}>
            <span className="tl-today-text">오늘</span>
            <div className="tl-today-tick" />
          </div>
        )}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <div
            key={i}
            className="tl-node"
            style={{ left: `${toPct(n.date)}%` }}
          >
            <span className="tl-date">{fmt(n.date)}</span>
            <div className={`tl-dot ${dotClass(n.date)}`} />
            <span className="tl-label">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 2: `src/App.css` 하단에 타임라인 CSS 추가

`src/App.css` 파일 맨 끝에 아래 CSS를 추가한다:

```css
/* ── OnboardingTimeline ────────────────── */
.tl-container {
  padding: 6px 0 10px;
  margin-bottom: 12px;
}

.tl-track {
  position: relative;
  height: 66px;
  margin: 0 28px;
}

/* 기본 배경 선 */
.tl-base-line {
  position: absolute;
  top: 26px;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 2px;
}

/* 구간 색상 */
.tl-segment {
  position: absolute;
  top: 26px;
  height: 3px;
  border-radius: 2px;
}
.tl-seg--done    { background: rgba(255, 255, 255, 0.85); }
.tl-seg--active  { background: #ffd700; }
.tl-seg--pending { background: rgba(255, 255, 255, 0.15); }

/* 오늘 마커 */
.tl-today {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
  pointer-events: none;
}
.tl-today-text {
  font-size: 10px;
  color: #ffd700;
  line-height: 14px;
  font-weight: 600;
}
.tl-today-tick {
  width: 2px;
  height: 34px;
  background: #ffd700;
  opacity: 0.75;
}

/* 노드 */
.tl-node {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 2;
  width: 54px;
}
.tl-date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.92);
  height: 14px;
  line-height: 14px;
  white-space: nowrap;
}
.tl-dot {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2.5px solid white;
  margin: 4px 0;
  flex-shrink: 0;
}
.tl-dot--done    { background: white; }
.tl-dot--pending { background: rgba(255, 255, 255, 0.15); }

.tl-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.82);
  white-space: nowrap;
}
```

### Step 3: 커밋

```bash
git add src/components/OnboardingTimeline.js src/App.css
git commit -m "feat: OnboardingTimeline 컴포넌트 추가 (주차 기반 타임라인 시각화)"
```

---

## Task 5: Header + OnboardingProgram 연결

**Files:**
- Modify: `src/components/Header.js`
- Modify: `src/pages/OnboardingProgram.js`

### Step 1: `Header.js` 수정

`src/components/Header.js` 전체를 아래로 교체:

```jsx
import React from 'react';
import OnboardingTimeline from './OnboardingTimeline';

function Header({ user, progress, total }) {
  const isComplete = progress === total;

  return (
    <div className="header">
      <OnboardingTimeline user={user} />
      <div className={`progress ${isComplete ? 'complete' : ''}`}>
        <strong>진행 상황:</strong> {progress}/{total} {isComplete && '완료!!'}
      </div>
    </div>
  );
}

export default Header;
```

### Step 2: `OnboardingProgram.js` 수정

`OnboardingProgram.js`에서 두 가지를 변경한다.

**2-a) `getPeriod` 함수 삭제** (14~20번째 줄 전체 삭제):

```jsx
// 삭제할 코드
const getPeriod = () => {
  if (user.employee_type === '신입') {
    if (!user.period_1_start || !user.period_3_end) return '기간 미설정';
    return `${user.period_1_start} ~ ${user.period_3_end}`;
  } else {
    if (!user.period_1_start || !user.period_1_end) return '기간 미설정';
    return `${user.period_1_start} ~ ${user.period_1_end}`;
  }
};
```

**2-b) Header 호출 변경** (렌더 부분):

```jsx
// 기존
<Header
  period={getPeriod()}
  progress={progress}
  total={programs.length}
/>

// 변경 후
<Header
  user={user}
  progress={progress}
  total={programs.length}
/>
```

### Step 3: 브라우저에서 확인

```bash
npm start
```

신규입사자 계정으로 로그인 → 온보딩 프로그램 메뉴 진입 → 헤더 영역에서 확인:
- [ ] 타임라인이 4개 노드(신입) 또는 2개 노드(경력)로 표시됨
- [ ] 완료 구간: 흰색 선
- [ ] 진행 중 구간: 황금색 선
- [ ] 미진행 구간: 반투명 선
- [ ] "오늘" 마커가 현재 구간에 표시됨
- [ ] 각 노드에 MM/DD 날짜 + 레이블(입사일/1차종료 등) 표시됨
- [ ] 진행 상황 텍스트(x/6 완료)는 그대로 하단에 표시됨

### Step 4: 커밋

```bash
git add src/components/Header.js src/pages/OnboardingProgram.js
git commit -m "feat: 온보딩 프로그램 헤더를 타임라인 시각화로 교체"
```

---

## Task 6: 최종 검증 및 Push

### Step 1: 전체 빌드 확인

```bash
npm run build
```
Expected: `Compiled successfully.` (warnings는 무시 가능, errors는 수정 필요)

### Step 2: Git log 확인

```bash
git log --oneline -5
```
Expected (최근 4개 커밋):
```
feat: 온보딩 프로그램 헤더를 타임라인 시각화로 교체
feat: OnboardingTimeline 컴포넌트 추가 (주차 기반 타임라인 시각화)
fix: 직원 등록 미리보기 기간 텍스트 12주/4주로 수정
feat: 온보딩 기간 계산 addMonths → addDays (신입 12주, 경력 4주)
```

### Step 3: Push

```bash
git push origin main
```

### Step 4: Edge Function 재배포 확인

Supabase 대시보드 > Edge Functions > register-users 에서 최신 배포 시각 확인.
