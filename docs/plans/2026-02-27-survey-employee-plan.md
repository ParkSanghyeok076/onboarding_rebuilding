# 설문조사 직원 화면 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 신규입사자가 회차별 설문을 응시·제출·조회할 수 있는 직원 화면 구현

**Architecture:** Survey.js(컨테이너)가 view 상태('list'|'form'|'result')를 관리하고 SurveyList/SurveyForm/SurveyResult를 전환한다. 설문 응시 가능 여부는 users 테이블의 period_x_start/end를 기준으로 판단하며, survey_rounds 테이블은 사용하지 않는다.

**Tech Stack:** React CRA, @supabase/supabase-js, Pages.css

---

## Task 1: DB 마이그레이션 — survey_responses 컬럼 교체

**Files:**
- Create: `docs/sql/migration_survey_columns.sql`

**Step 1: SQL 파일 작성**

`docs/sql/migration_survey_columns.sql` 파일을 생성하고 아래 내용 입력:

```sql
-- survey_responses 컬럼 교체 마이그레이션
-- 실행 위치: Supabase 대시보드 → SQL Editor

-- 기존 플레이스홀더 컬럼 제거
ALTER TABLE survey_responses DROP COLUMN IF EXISTS subjective_1;
ALTER TABLE survey_responses DROP COLUMN IF EXISTS subjective_2;
ALTER TABLE survey_responses DROP COLUMN IF EXISTS round_id;

-- 회차 번호 직접 저장 (survey_rounds 테이블 미사용)
ALTER TABLE survey_responses ADD COLUMN round_number integer CHECK (round_number BETWEEN 1 AND 3);

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
```

**Step 2: Supabase SQL Editor에서 실행**

Supabase 대시보드 → SQL Editor → 위 SQL 붙여넣기 → Run

Expected: "Success. No rows returned" 메시지

**Step 3: 커밋**

```bash
git add docs/sql/migration_survey_columns.sql
git commit -m "feat: survey_responses 컬럼 마이그레이션 SQL 추가"
```

---

## Task 2: App.js — Survey에 user prop 추가

**Files:**
- Modify: `src/App.js:107-109`

**Step 1: 수정**

`src/App.js` 108번째 줄 `<Survey onBack={handleBack} />`를 아래로 교체:

```jsx
{currentPage === 'survey' && (
  <Survey user={currentUser} onBack={handleBack} />
)}
```

**Step 2: 브라우저 확인**

`npm start` → 로그인 → 설문조사 메뉴 클릭 → "곧 개발될 예정" 화면이 여전히 보이면 OK (아직 Survey.js 교체 전)

**Step 3: 커밋**

```bash
git add src/App.js
git commit -m "feat: Survey 컴포넌트에 user prop 전달"
```

---

## Task 3: 설문 문항 데이터 파일 생성

**Files:**
- Create: `src/data/surveyQuestions.js`

**Step 1: 파일 생성**

```javascript
export const PARTS = [
  {
    number: 1,
    title: 'Part 1. OJT 준비 및 멘토링 태도',
    questions: [
      { key: 'q1_1', type: 'scale', text: 'OJT 계획(일정, 교육 내용)을 사전에 명확히 공유하고 체계적으로 준비했습니다.' },
      { key: 'q1_2', type: 'scale', text: '바쁜 업무 중에도 나의 교육과 지도를 위해 충분한 시간을 할애하고 성의를 다했습니다.' },
      { key: 'q1_3', type: 'scale', text: '질문하거나 도움을 요청할 때, 언제든 편안하게 이야기할 수 있도록 개방적이고 긍정적인 태도를 보여주었습니다.' },
      { key: 'q1_4', type: 'scale', text: '나를 팀의 일원으로 존중하며, 인격적으로 대해주었습니다.' },
      { key: 'q1_5', type: 'text', text: '멘토/팀장의 준비 상태나 태도에서 가장 긍정적이었던 부분 혹은 개선이 필요하다고 느낀 구체적인 상황을 적어주세요.' },
    ],
  },
  {
    number: 2,
    title: 'Part 2. 업무 지식 및 기술 전수',
    questions: [
      { key: 'q2_1', type: 'scale', text: '담당 업무의 핵심 내용과 목표, 중요성을 이해하기 쉽게 명확히 설명해 주었습니다.' },
      { key: 'q2_2', type: 'scale', text: '업무 절차, 프로세스, 시스템 활용법 등을 시연이나 매뉴얼 제공 등 이해하기 쉬운 방식으로 알려주었습니다.' },
      { key: 'q2_3', type: 'scale', text: '멘토/팀장의 지도는 나의 업무 지식 습득에 실질적으로 도움이 되었습니다.' },
      { key: 'q2_4', type: 'scale', text: '업무 수행에 필요한 지식과 정보를 충분히 제공받았다고 생각합니다.' },
      { key: 'q2_5', type: 'text', text: '업무 지식을 전달받을 때 가장 이해가 잘 되었던 방식이나, 설명이 부족하여 업무 수행에 어려움을 겪었던 부분은 무엇인가요?' },
    ],
  },
  {
    number: 3,
    title: 'Part 3. 실무 지도 및 피드백',
    questions: [
      { key: 'q3_1', type: 'scale', text: 'OJT를 통해 배운 내용을 직접 실행해 볼 수 있도록 적절한 업무 기회와 권한을 부여했습니다.' },
      { key: 'q3_2', type: 'scale', text: '업무 수행 결과에 대해 막연한 평가가 아닌, 구체적이고 건설적인 피드백(잘한 점/개선할 점)을 제공했습니다.' },
      { key: 'q3_3', type: 'scale', text: '업무 중 어려움이나 실수가 발생했을 때, 비난하기보다 문제의 원인과 해결책을 함께 고민해 주었습니다.' },
      { key: 'q3_4', type: 'scale', text: '스스로 생각하고 업무를 처리할 수 있도록 나에게 적절한 가이드를 제공했습니다.' },
      { key: 'q3_5', type: 'text', text: '최근 받은 피드백 중 본인의 성장에 가장 큰 도움이 되었던 내용이나, 반대로 가이드가 모호하여 방향을 잡기 어려웠던 순간은 언제인가요?' },
    ],
  },
  {
    number: 4,
    title: 'Part 4. 조직 적응 지원 및 소통',
    questions: [
      { key: 'q4_1', type: 'scale', text: '정기적/비정기적 대화를 통해 나의 업무적, 관계적 어려움에 진심으로 귀 기울여 주었습니다.' },
      { key: 'q4_2', type: 'scale', text: '유관 업무 구성원들을 소개하고, 원활하게 소통하며 팀에 적응할 수 있도록 도와주었습니다.' },
      { key: 'q4_3', type: 'scale', text: '회사의 조직 문화, 핵심가치, 업무 규범(보고 방식, 소통 예절 등)을 이해하고 적응할 수 있도록 잘 안내해 주었습니다.' },
      { key: 'q4_4', type: 'scale', text: '팀과 회사에서 일어나는 주요 정보들을 소외되지 않도록 시의적절하게 공유해 주었습니다.' },
      { key: 'q4_5', type: 'text', text: '팀 분위기나 업무 방식에 적응하는 과정에서 팀장/동료로부터 받은 가장 큰 도움이나, 반대로 소통이 부족하여 소외감을 느꼈던 부분은 무엇인가요?' },
    ],
  },
  {
    number: 5,
    title: 'Part 5. 주관식 종합 의견',
    questions: [
      { key: 'q5_1', type: 'text', text: '이번 OJT 및 멘토링 과정에서 멘토/팀장님께 가장 도움이 되었거나 감사했던 점은 무엇입니까?' },
      { key: 'q5_2', type: 'text', text: '향후 OJT 프로그램이나 멘토링 방식이 더 나아지기 위해 개선되었으면 하는 점이 있다면 무엇입니까?' },
      { key: 'q5_3', type: 'text', text: '멘토/팀장님께 전하고 싶은 말이나 OJT 기간 전반에 대한 소감을 자유롭게 작성해 주세요.' },
    ],
  },
];

export const SCALE_LABELS = ['', '매우 불만족', '불만족', '보통', '만족', '매우 만족'];
```

**Step 2: 커밋**

```bash
git add src/data/surveyQuestions.js
git commit -m "feat: 설문 문항 데이터 파일 생성 (23문항)"
```

---

## Task 4: Survey.js — 컨테이너 구현

**Files:**
- Modify: `src/pages/Survey.js` (전체 교체)

**Step 1: 파일 교체**

```javascript
import React, { useState } from 'react';
import SurveyList from './SurveyList';
import SurveyForm from './SurveyForm';
import SurveyResult from './SurveyResult';

function Survey({ user, onBack }) {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'result'
  const [selectedRound, setSelectedRound] = useState(null);

  const handleStart = (roundNumber) => {
    setSelectedRound(roundNumber);
    setView('form');
  };

  const handleViewResult = (roundNumber) => {
    setSelectedRound(roundNumber);
    setView('result');
  };

  const handleSubmitted = () => {
    setView('list');
  };

  const handleBackToList = () => {
    setView('list');
  };

  if (view === 'form') {
    return (
      <SurveyForm
        user={user}
        roundNumber={selectedRound}
        onSubmitted={handleSubmitted}
        onBack={handleBackToList}
      />
    );
  }

  if (view === 'result') {
    return (
      <SurveyResult
        user={user}
        roundNumber={selectedRound}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <SurveyList
      user={user}
      onStart={handleStart}
      onViewResult={handleViewResult}
      onBack={onBack}
    />
  );
}

export default Survey;
```

**Step 2: 커밋**

```bash
git add src/pages/Survey.js
git commit -m "feat: Survey 컨테이너 구현"
```

---

## Task 5: SurveyList.js — 회차 목록

**Files:**
- Create: `src/pages/SurveyList.js`

**Step 1: 파일 생성**

```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';

function SurveyList({ user, onStart, onViewResult, onBack }) {
  const [submittedRounds, setSubmittedRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmitted = async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('round_number')
        .eq('user_id', user.id);

      if (!error) {
        setSubmittedRounds((data || []).map(r => r.round_number));
      }
      setLoading(false);
    };
    fetchSubmitted();
  }, [user.id]);

  const today = new Date().toISOString().slice(0, 10);

  const getRoundInfo = (roundNumber) => {
    const start = user[`period_${roundNumber}_start`];
    const end = user[`period_${roundNumber}_end`];
    if (!start || !end) return null;

    let status;
    if (submittedRounds.includes(roundNumber)) {
      status = 'submitted';
    } else if (today < start) {
      status = 'upcoming';
    } else if (today > end) {
      status = 'closed';
    } else {
      status = 'open';
    }

    return { roundNumber, start, end, status };
  };

  const maxRounds = user.employee_type === '신입' ? [1, 2, 3] : [1];
  const rounds = maxRounds.map(getRoundInfo).filter(Boolean);

  const STATUS_LABEL = {
    submitted: '제출 완료',
    upcoming: '기간 전',
    closed: '기간 종료',
    open: '응시 가능',
  };

  const STATUS_CLASS = {
    submitted: 'round-status-submitted',
    upcoming: 'round-status-upcoming',
    closed: 'round-status-closed',
    open: 'round-status-open',
  };

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <div className="survey-container"><p>로딩 중...</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="survey-container">
        <h1 className="page-title">📝 설문조사</h1>
        <div className="survey-rounds-list">
          {rounds.map(({ roundNumber, start, end, status }) => (
            <div key={roundNumber} className="survey-round-card">
              <div className="round-info">
                <h2 className="round-title">{roundNumber}차 설문</h2>
                <p className="round-period">{start} ~ {end}</p>
              </div>
              <div className="round-actions">
                <span className={`round-status ${STATUS_CLASS[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
                {status === 'open' && (
                  <button
                    className="round-btn round-btn-primary"
                    onClick={() => onStart(roundNumber)}
                  >
                    응시하기
                  </button>
                )}
                {status === 'submitted' && (
                  <button
                    className="round-btn round-btn-secondary"
                    onClick={() => onViewResult(roundNumber)}
                  >
                    결과보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SurveyList;
```

**Step 2: 브라우저 확인**

`npm start` → 로그인 → 설문조사 클릭 → 회차 카드 목록이 보이면 OK

**Step 3: 커밋**

```bash
git add src/pages/SurveyList.js
git commit -m "feat: SurveyList 회차 목록 구현"
```

---

## Task 6: SurveyForm.js — 파트별 설문 폼

**Files:**
- Create: `src/pages/SurveyForm.js`

**Step 1: 파일 생성**

```javascript
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

function SurveyForm({ user, roundNumber, onSubmitted, onBack }) {
  const [currentPart, setCurrentPart] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const part = PARTS[currentPart];

  const handleScaleChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const handleTextChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const isPartValid = () => {
    return part.questions
      .filter(q => q.type === 'scale')
      .every(q => answers[q.key] !== undefined);
  };

  const handleNext = () => {
    if (currentPart < PARTS.length - 1) {
      setCurrentPart(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPart > 0) {
      setCurrentPart(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from('survey_responses')
      .insert({
        user_id: user.id,
        round_number: roundNumber,
        ...answers,
      });
    setSubmitting(false);
    setConfirmOpen(false);

    if (error) {
      alert('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
      console.error(error);
    } else {
      onSubmitted();
    }
  };

  const isLastPart = currentPart === PARTS.length - 1;

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <div className="survey-container">
        <div className="survey-progress-bar">
          {PARTS.map((p, i) => (
            <div
              key={p.number}
              className={`progress-step ${i <= currentPart ? 'progress-step-active' : ''}`}
            />
          ))}
          <span className="progress-label">{currentPart + 1} / {PARTS.length}</span>
        </div>

        <h2 className="survey-part-title">{part.title}</h2>

        <div className="survey-questions">
          {part.questions.map((q, idx) => (
            <div key={q.key} className="survey-question">
              <p className="question-text">
                <span className="question-number">{idx + 1}.</span> {q.text}
                {q.type === 'scale' && <span className="required-mark"> *</span>}
              </p>
              {q.type === 'scale' ? (
                <div className="scale-options">
                  {[1, 2, 3, 4, 5].map(val => (
                    <label
                      key={val}
                      className={`scale-option ${answers[q.key] === val ? 'scale-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={q.key}
                        value={val}
                        checked={answers[q.key] === val}
                        onChange={() => handleScaleChange(q.key, val)}
                      />
                      <span className="scale-value">{val}</span>
                      <span className="scale-label">{SCALE_LABELS[val]}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="survey-textarea"
                  placeholder="자유롭게 작성해 주세요. (선택)"
                  value={answers[q.key] || ''}
                  onChange={e => handleTextChange(q.key, e.target.value)}
                  rows={4}
                />
              )}
            </div>
          ))}
        </div>

        <div className="survey-nav">
          {currentPart > 0 && (
            <button className="survey-nav-btn survey-nav-prev" onClick={handlePrev}>
              ← 이전
            </button>
          )}
          {!isLastPart ? (
            <button
              className="survey-nav-btn survey-nav-next"
              onClick={handleNext}
              disabled={!isPartValid()}
            >
              다음 →
            </button>
          ) : (
            <button
              className="survey-nav-btn survey-nav-submit"
              onClick={() => setConfirmOpen(true)}
            >
              제출하기
            </button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>설문을 제출하시겠습니까?</h3>
            <p>제출 후에는 수정이 불가합니다.</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                취소
              </button>
              <button
                className="confirm-btn confirm-ok"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '제출 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyForm;
```

**Step 2: 브라우저 확인**

응시하기 클릭 → Part 1 표시 → 객관식 미선택 시 "다음" 버튼 비활성화 확인 → 선택 후 활성화 확인 → Part 5에서 제출하기 클릭 → 확인 다이얼로그 표시 확인

**Step 3: 커밋**

```bash
git add src/pages/SurveyForm.js
git commit -m "feat: SurveyForm 파트별 설문 폼 구현"
```

---

## Task 7: SurveyResult.js — 읽기 전용 결과

**Files:**
- Create: `src/pages/SurveyResult.js`

**Step 1: 파일 생성**

```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

function SurveyResult({ user, roundNumber, onBack }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponse = async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('round_number', roundNumber)
        .single();

      if (!error) setResponse(data);
      setLoading(false);
    };
    fetchResponse();
  }, [user.id, roundNumber]);

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 목록으로</button>
        <div className="survey-container"><p>로딩 중...</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <div className="survey-container">
        <h1 className="page-title">📋 {roundNumber}차 설문 결과</h1>
        <p className="result-submitted-at">
          제출일: {response?.submitted_at?.slice(0, 10)}
        </p>

        {PARTS.map(part => (
          <div key={part.number} className="result-part">
            <h2 className="result-part-title">{part.title}</h2>
            {part.questions.map((q, idx) => (
              <div key={q.key} className="result-question">
                <p className="question-text">
                  <span className="question-number">{idx + 1}.</span> {q.text}
                </p>
                <p className="result-answer">
                  {q.type === 'scale'
                    ? `${response?.[q.key]}점 — ${SCALE_LABELS[response?.[q.key]] || ''}`
                    : response?.[q.key] || '(미작성)'}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SurveyResult;
```

**Step 2: 브라우저 확인**

제출 완료 후 목록으로 돌아와 [결과보기] 클릭 → 제출한 답변 읽기 전용으로 표시 확인

**Step 3: 커밋**

```bash
git add src/pages/SurveyResult.js
git commit -m "feat: SurveyResult 읽기 전용 결과 화면 구현"
```

---

## Task 8: Pages.css — 설문 스타일 추가

**Files:**
- Modify: `src/pages/Pages.css` (기존 파일 맨 아래에 추가)

**Step 1: 스타일 추가**

`Pages.css` 파일 맨 끝에 아래 내용 추가:

```css
/* ===== Survey Styles ===== */

.survey-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* 회차 목록 */
.survey-rounds-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

.survey-round-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.round-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.round-title {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
  margin: 0;
}

.round-period {
  font-size: 14px;
  color: #718096;
  margin: 0;
}

.round-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.round-status {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.round-status-open     { background: #c6f6d5; color: #276749; }
.round-status-submitted { background: #bee3f8; color: #2b6cb0; }
.round-status-upcoming  { background: #fefcbf; color: #744210; }
.round-status-closed    { background: #fed7d7; color: #822727; }

.round-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.round-btn-primary {
  background: #667eea;
  color: white;
}

.round-btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

.round-btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.round-btn-secondary:hover {
  background: #667eea;
  color: white;
}

/* 설문 폼 */
.survey-progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.progress-step {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: #e2e8f0;
  transition: background 0.3s;
}

.progress-step-active {
  background: #667eea;
}

.progress-label {
  font-size: 14px;
  color: #718096;
  font-weight: 600;
  white-space: nowrap;
  margin-left: 8px;
}

.survey-part-title {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.survey-questions {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.survey-question {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.question-text {
  font-size: 15px;
  color: #2d3748;
  line-height: 1.6;
  margin-bottom: 16px;
}

.question-number {
  font-weight: 700;
  color: #667eea;
  margin-right: 4px;
}

.required-mark {
  color: #e53e3e;
}

/* 5점 척도 */
.scale-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.scale-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  flex: 1;
}

.scale-option input[type="radio"] {
  display: none;
}

.scale-option:hover {
  border-color: #667eea;
}

.scale-option.scale-selected {
  border-color: #667eea;
  background: #ebf4ff;
}

.scale-value {
  font-size: 20px;
  font-weight: 700;
  color: #4a5568;
}

.scale-option.scale-selected .scale-value {
  color: #667eea;
}

.scale-label {
  font-size: 11px;
  color: #718096;
  text-align: center;
  line-height: 1.3;
}

/* 주관식 텍스트 입력 */
.survey-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  color: #2d3748;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.survey-textarea:focus {
  outline: none;
  border-color: #667eea;
}

/* 이전/다음 네비게이션 */
.survey-nav {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.survey-nav-btn {
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.survey-nav-prev {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.survey-nav-prev:hover {
  background: #667eea;
  color: white;
}

.survey-nav-next {
  background: #667eea;
  color: white;
}

.survey-nav-next:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
}

.survey-nav-next:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

.survey-nav-submit {
  background: #48bb78;
  color: white;
}

.survey-nav-submit:hover {
  background: #38a169;
  transform: translateY(-2px);
}

/* 제출 확인 다이얼로그 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background: white;
  border-radius: 16px;
  padding: 36px;
  max-width: 400px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.confirm-dialog h3 {
  font-size: 20px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 10px;
}

.confirm-dialog p {
  font-size: 15px;
  color: #718096;
  margin-bottom: 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.confirm-btn {
  padding: 12px 28px;
  border-radius: 8px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-cancel {
  background: #e2e8f0;
  color: #4a5568;
}

.confirm-cancel:hover {
  background: #cbd5e0;
}

.confirm-ok {
  background: #48bb78;
  color: white;
}

.confirm-ok:hover:not(:disabled) {
  background: #38a169;
}

.confirm-ok:disabled {
  background: #cbd5e0;
  cursor: not-allowed;
}

/* 결과 화면 */
.result-submitted-at {
  font-size: 14px;
  color: #718096;
  margin-bottom: 28px;
}

.result-part {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.result-part-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e2e8f0;
}

.result-question {
  margin-bottom: 20px;
}

.result-question:last-child {
  margin-bottom: 0;
}

.result-answer {
  font-size: 15px;
  color: #4a5568;
  background: #f7fafc;
  padding: 10px 14px;
  border-radius: 6px;
  margin-top: 6px;
  line-height: 1.6;
}
```

**Step 2: 브라우저 최종 확인**

전체 플로우 테스트:
1. 로그인 → 설문조사 클릭
2. 회차 카드 확인 (상태 뱃지, 버튼)
3. [응시하기] → Part 1 폼 → 객관식 모두 선택 → [다음] → ... → Part 5 → [제출하기]
4. 확인 다이얼로그 → [확인]
5. 목록으로 돌아와 "제출 완료" 상태 확인
6. [결과보기] → 제출 내용 읽기 전용 확인

**Step 3: 최종 커밋**

```bash
git add src/pages/Pages.css
git commit -m "feat: 설문조사 스타일 추가"
```

**Step 4: GitHub Push**

```bash
git push origin main
```
