# AdminOnboarding 대시보드 개편 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 관리자 온보딩 현황 페이지 상단에 KPI 카드 4개를 추가하고, 하단 테이블에 진행률 열을 추가한다.

**Architecture:** AdminOnboarding.js 단일 파일 수정. 기존 `rows` 데이터에서 KPI 지표를 파생 계산(derived)하므로 추가 API 호출 없음. CSS는 Pages.css에 추가.

**Tech Stack:** React (useState/useEffect/useMemo), CSS (Pages.css)

---

## 배경 지식

### 데이터 구조 (`rows` 배열의 각 항목)
```js
{
  id, name, department, employee_type,  // '신입' | '경력'
  hire_date,
  period_1_start, period_1_end,         // 경력: 1차만 사용
  period_2_start, period_2_end,         // 신입만
  period_3_start, period_3_end,         // 신입만
  ojt_plan_received,                    // boolean
  programs: { 1: 'path', 2: 'path', … }, // 제출된 프로그램 이미지 경로 맵
  submittedRounds: [1, 2],              // 완료된 설문 차수 배열
  completed,                            // boolean (이미 계산됨)
}
```

### 완료 조건 (기존 isComplete 로직 참고)
- 프로그램 6개 모두 제출
- ojt_plan_received === true
- 신입: 설문 1,2,3차 모두 / 경력: 설문 1차만

### 진행률 계산식
```
신입 최대 항목 수 = 6(프로그램) + 1(계획서) + 3(설문) = 10
경력 최대 항목 수 = 6(프로그램) + 1(계획서) + 1(설문) = 8

진행률 = (제출 프로그램 수 + ojt_plan(0|1) + 완료 설문 수) / 최대 항목 수 × 100
```

### 이번주 설문마감 계산
- 오늘(today) 기준으로 이번주 일요일까지를 "이번 주"로 정의
- `period_1_end`, `period_2_end`, `period_3_end` 중 이번 주에 끝나는 차수를 가진 직원
- 해당 차수의 설문을 제출했는지 여부로 완료/미완료 구분

### 마감 임박자
- 온보딩 종료일: 신입 → `period_3_end`, 경력 → `period_1_end`
- 오늘 기준 3일 이내 (today <= end <= today+3) & !completed

---

## Task 1: 진행률 계산 헬퍼 함수 추가

**Files:**
- Modify: `src/pages/AdminOnboarding.js` (파일 상단 헬퍼 함수 영역, 약 10~30번째 줄)

**Step 1: `calcProgress` 함수를 기존 헬퍼 함수들 아래에 추가**

`formatPeriod` 함수 바로 아래(약 31번째 줄 이후)에 삽입:

```js
// 진행률 계산 (0~100 정수)
function calcProgress(row) {
  const isNewHire = row.employee_type === '신입';
  const maxItems = isNewHire ? 10 : 8;
  const requiredRounds = isNewHire ? [1, 2, 3] : [1];

  const programsDone = Object.keys(row.programs || {}).length;
  const ojtDone = row.ojt_plan_received ? 1 : 0;
  const surveysDone = (row.submittedRounds || []).filter(r => requiredRounds.includes(r)).length;

  return Math.round((programsDone + ojtDone + surveysDone) / maxItems * 100);
}
```

**Step 2: 브라우저에서 AdminOnboarding 페이지 열어서 콘솔 에러 없는지 확인**

(함수만 추가했으므로 UI 변화 없음 - 에러만 없으면 OK)

---

## Task 2: KPI 지표 계산 (useMemo)

**Files:**
- Modify: `src/pages/AdminOnboarding.js` (`AdminOnboarding` 컴포넌트 내부, `today` 정의 바로 아래)

**Step 1: `useMemo` import 추가** (파일 1번째 줄)

```js
import React, { useState, useEffect, useMemo } from 'react';
```

**Step 2: `today` 정의 아래에 KPI 계산 블록 추가**

`const today = new Date(); today.setHours(0,0,0,0);` 바로 아래에 삽입:

```js
// ── KPI 계산 ──────────────────────────────────────
const kpi = useMemo(() => {
  if (rows.length === 0) return null;

  // 1) 전체 입사자
  const total = rows.length;
  const newHireCount = rows.filter(r => r.employee_type === '신입').length;
  const careerCount = rows.filter(r => r.employee_type === '경력').length;

  // 2) 온보딩 완료
  const completedCount = rows.filter(r => r.completed).length;
  const completionRate = Math.round(completedCount / total * 100);

  // 3) 이번주 설문 마감
  // 이번주 = 오늘(월)~이번주 일요일
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + (7 - today.getDay())); // 이번주 일요일
  weekEnd.setHours(23, 59, 59, 999);

  const surveyDeadlineUsers = []; // { row, round }
  rows.forEach(row => {
    const isNewHire = row.employee_type === '신입';
    const rounds = isNewHire ? [1, 2, 3] : [1];
    rounds.forEach(round => {
      const endStr = row[`period_${round}_end`];
      if (!endStr) return;
      const endDate = toDate(endStr);
      if (endDate >= today && endDate <= weekEnd) {
        surveyDeadlineUsers.push({ row, round });
      }
    });
  });
  const surveyTotal = surveyDeadlineUsers.length;
  const surveyDone = surveyDeadlineUsers.filter(({ row, round }) =>
    (row.submittedRounds || []).includes(round)
  ).length;
  const surveyRate = surveyTotal > 0 ? Math.round(surveyDone / surveyTotal * 100) : null;
  // 마감일 중 가장 빠른 날짜
  const earliestDeadline = surveyDeadlineUsers.length > 0
    ? surveyDeadlineUsers.reduce((min, { row, round }) => {
        const d = toDate(row[`period_${round}_end`]);
        return d < min ? d : min;
      }, toDate(surveyDeadlineUsers[0].row[`period_${surveyDeadlineUsers[0].round}_end`]))
    : null;

  // 4) 마감 임박자 (3일 이내 & 미완료)
  const deadline3 = new Date(today);
  deadline3.setDate(today.getDate() + 3);
  const urgentCount = rows.filter(row => {
    if (row.completed) return false;
    const isNewHire = row.employee_type === '신입';
    const endStr = isNewHire ? row.period_3_end : row.period_1_end;
    if (!endStr) return false;
    const endDate = toDate(endStr);
    return endDate >= today && endDate <= deadline3;
  }).length;

  return {
    total, newHireCount, careerCount,
    completedCount, completionRate,
    surveyTotal, surveyDone, surveyRate, earliestDeadline,
    urgentCount,
  };
}, [rows, today]);
```

**Step 3: 콘솔 에러 없는지 확인 (UI 변화 없음)**

---

## Task 3: KPI 카드 UI 렌더링

**Files:**
- Modify: `src/pages/AdminOnboarding.js` (return 문 내부, `admin-header` div 바로 아래)
- Modify: `src/pages/Pages.css` (KPI 카드 스타일 추가)

**Step 1: Pages.css 하단에 KPI 스타일 추가**

```css
/* ===== AdminOnboarding KPI 카드 ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

.kpi-card {
  background: white;
  border-radius: 10px;
  padding: 20px 22px;
  border: 1px solid #e0e0e0;
  border-top: 3px solid #e0e0e0;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
}
.kpi-card.blue   { border-top-color: #667eea; }
.kpi-card.green  { border-top-color: #28a745; }
.kpi-card.amber  { border-top-color: #f59e0b; }
.kpi-card.red    { border-top-color: #dc3545; }

.kpi-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .8px;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 8px;
}
.kpi-value {
  font-size: 30px;
  font-weight: 800;
  color: #1a2b3c;
  line-height: 1;
  margin-bottom: 6px;
}
.kpi-sub {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
  line-height: 1.5;
}
.kpi-progress {
  height: 5px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}
.kpi-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: #28a745;
  transition: width .4s;
}
.kpi-urgent-num {
  font-size: 30px;
  font-weight: 800;
  color: #dc3545;
  line-height: 1;
  margin-bottom: 6px;
}
```

**Step 2: AdminOnboarding.js return 문 수정**

`admin-header` div 바로 아래, `admin-table-wrap` div 바로 위에 KPI 블록 삽입:

```jsx
{/* KPI 카드 */}
{kpi && (
  <div className="kpi-grid">
    {/* ① 전체 입사자 */}
    <div className="kpi-card blue">
      <div className="kpi-label">전체 입사자</div>
      <div className="kpi-value">{kpi.total}<span style={{fontSize:14, fontWeight:500, color:'#888', marginLeft:4}}>명</span></div>
      <div className="kpi-sub">신입 {kpi.newHireCount}명 &nbsp;·&nbsp; 경력 {kpi.careerCount}명</div>
    </div>

    {/* ② 온보딩 완료 */}
    <div className="kpi-card green">
      <div className="kpi-label">온보딩 완료</div>
      <div className="kpi-value">{kpi.completedCount}<span style={{fontSize:14, fontWeight:500, color:'#888', marginLeft:4}}>명</span></div>
      <div className="kpi-sub">전체 {kpi.total}명 중 완료율 {kpi.completionRate}%</div>
      <div className="kpi-progress">
        <div className="kpi-progress-fill" style={{width:`${kpi.completionRate}%`}} />
      </div>
    </div>

    {/* ③ 이번주 설문 마감 */}
    <div className="kpi-card amber">
      <div className="kpi-label">이번주 설문 마감</div>
      {kpi.surveyTotal > 0 ? (
        <>
          <div className="kpi-value">{kpi.surveyDone}<span style={{fontSize:14, fontWeight:500, color:'#888', marginLeft:2}}>/{kpi.surveyTotal}</span></div>
          <div className="kpi-sub">
            완료율 {kpi.surveyRate}%
            {kpi.earliestDeadline && (
              <> &nbsp;·&nbsp; 마감 {formatShortDate(kpi.earliestDeadline.toISOString())}</>
            )}
          </div>
          <div className="kpi-progress">
            <div className="kpi-progress-fill" style={{width:`${kpi.surveyRate}%`, background:'#f59e0b'}} />
          </div>
        </>
      ) : (
        <div className="kpi-sub" style={{marginTop:8}}>이번 주 마감 설문 없음</div>
      )}
    </div>

    {/* ④ 마감 임박자 */}
    <div className="kpi-card red">
      <div className="kpi-label">마감 임박자 (3일 이내)</div>
      <div className="kpi-urgent-num">{kpi.urgentCount}<span style={{fontSize:14, fontWeight:500, color:'#888', marginLeft:4}}>명</span></div>
      <div className="kpi-sub">
        {kpi.urgentCount > 0 ? '온보딩 종료 3일 이내 미완료' : '임박한 미완료 없음'}
      </div>
    </div>
  </div>
)}
```

**Step 3: 브라우저에서 KPI 카드 4개 정상 렌더링 확인**

---

## Task 4: 테이블 진행률 열 추가

**Files:**
- Modify: `src/pages/AdminOnboarding.js` (table thead, tbody)

**Step 1: thead에 `진행률` 열 추가**

`<th>계획서</th>` 앞에 (기간 바로 다음 위치) 삽입:

```jsx
<th>진행률</th>
```

**Step 2: Pages.css에 진행률 바 스타일 추가**

```css
/* ===== 테이블 진행률 바 ===== */
.table-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 110px;
}
.table-progress-bar {
  flex: 1;
  height: 6px;
  background: #e8e8e8;
  border-radius: 3px;
  overflow: hidden;
}
.table-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .3s;
}
.table-progress-fill.high   { background: #28a745; }  /* 100% */
.table-progress-fill.mid    { background: #667eea; }  /* 60% 이상 */
.table-progress-fill.low    { background: #f59e0b; }  /* 60% 미만 */
.table-progress-pct {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
  min-width: 32px;
  text-align: right;
}
```

**Step 3: tbody의 각 row에 진행률 셀 추가**

`<td>{periodStr}</td>` 바로 아래에 삽입:

```jsx
{/* 진행률 */}
<td>
  {(() => {
    const pct = calcProgress(row);
    const colorClass = pct === 100 ? 'high' : pct >= 60 ? 'mid' : 'low';
    return (
      <div className="table-progress-wrap">
        <div className="table-progress-bar">
          <div className={`table-progress-fill ${colorClass}`} style={{width:`${pct}%`}} />
        </div>
        <span className="table-progress-pct">{pct}%</span>
      </div>
    );
  })()}
</td>
```

**Step 4: 브라우저에서 진행률 열 정상 렌더링 확인**

- 각 직원마다 진행 바와 % 숫자 표시 확인
- 100% 직원은 초록, 60%+ 파랑, 미만 주황 색상 확인

**Step 5: 커밋**

```bash
git add src/pages/AdminOnboarding.js src/pages/Pages.css
git commit -m "feat: 온보딩 현황 KPI 카드 4개 + 테이블 진행률 열 추가"
```

---

## 검증 체크리스트

- [ ] KPI ①: 신입/경력 합계가 전체 입사자 수와 일치
- [ ] KPI ②: 완료 수 + 완료율 % 정확, 진행 바 비율 맞음
- [ ] KPI ③: 이번 주 마감 설문 없을 때 "이번 주 마감 설문 없음" 표시
- [ ] KPI ④: 3일 이내 종료 & 미완료인 경우만 카운트
- [ ] 테이블 진행률: 신입(최대 10항목) / 경력(최대 8항목) 계산 분리 확인
- [ ] 기존 테이블 기능 (정렬, 필터, 프로그램 팝업, 계획서 체크박스) 정상 동작 확인
