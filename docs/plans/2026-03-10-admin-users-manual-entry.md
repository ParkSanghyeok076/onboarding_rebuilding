# 직원 수동 입력 테이블 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AdminUsers 페이지 CSV 업로드 아래에 스프레드시트형 직접 입력 테이블을 추가하고, 엑셀 복사 붙여넣기(Ctrl+V)로 여러 명을 한 번에 등록 가능하게 한다.

**Architecture:** `AdminUsers.js`에 `manualRows` state와 paste/update/delete 핸들러를 추가하고, 기존 `registerUsers` Edge Function을 재사용한다. 유효성 검사 로직도 기존 CSV 검사와 동일하게 재사용한다.

**Tech Stack:** React (useState), 기존 `registerUsers` (edgeFunctions.js)

**Spec:** `docs/superpowers/specs/2026-03-10-admin-users-manual-entry-design.md`

---

## Task 1: AdminUsers.js — state, 핸들러, JSX 추가

**Files:**
- Modify: `src/pages/AdminUsers.js`

### 배경 지식

현재 `AdminUsers.js` 구조:
- state: `preview`, `result`, `loading`, `error`, `fileName`, `dragging`
- `parseFile` → `handleFile` / `handleDrop` → `handleRegister` → `handleReset`
- return문: 안내카드 → dropzone(`!preview && !result` 조건) → 에러 → preview 테이블 → result

추가할 state:
```js
const EMPTY_ROW = () => ({ employee_id: '', name: '', department: '', hire_date: '', employee_type: '신입' });
const [manualRows, setManualRows] = useState([EMPTY_ROW()]);
```

### 핸들러 코드

```js
const updateRow = (idx, field, value) => {
  setManualRows(prev => {
    const next = prev.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    // 마지막 행 편집 중 데이터 입력 시 빈 행 자동 추가
    if (idx === prev.length - 1) {
      const last = next[next.length - 1];
      if (last.employee_id || last.name || last.hire_date) return [...next, EMPTY_ROW()];
    }
    return next;
  });
};

const deleteRow = (idx) => {
  setManualRows(prev => {
    const next = prev.filter((_, i) => i !== idx);
    return next.length === 0 ? [EMPTY_ROW()] : next;
  });
};

const handleManualPaste = (e) => {
  const text = e.clipboardData.getData('text');
  // 탭이나 줄바꿈 없으면 일반 셀 붙여넣기로 처리
  if (!text.includes('\t') && !text.includes('\n')) return;
  e.preventDefault();
  const lines = text.trim().split('\n').filter(l => l.trim());
  const parsed = lines.map(line => {
    const cols = line.split('\t');
    const type = (cols[4] || '').trim();
    return {
      employee_id: (cols[0] || '').trim(),
      name: (cols[1] || '').trim(),
      department: (cols[2] || '').trim(),
      hire_date: (cols[3] || '').trim(),
      employee_type: ['신입', '경력'].includes(type) ? type : '신입',
    };
  });
  setManualRows([...parsed, EMPTY_ROW()]);
};

const handleManualRegister = async () => {
  const filled = manualRows.filter(r => r.employee_id || r.name || r.hire_date);
  if (filled.length === 0) {
    setError('입력된 데이터가 없습니다.');
    return;
  }
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const invalid = filled.filter(r =>
    !r.employee_id || !r.name || !r.hire_date ||
    !datePattern.test(r.hire_date) ||
    !['신입', '경력'].includes(r.employee_type)
  );
  if (invalid.length > 0) {
    const badIds = invalid.map(r => r.employee_id || '(사번없음)').join(', ');
    setError(`형식 오류 ${invalid.length}건 (${badIds}): 사번·이름·입사일(YYYY-MM-DD)·구분(신입/경력) 확인 필요`);
    return;
  }
  const ids = filled.map(r => r.employee_id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    setError(`중복 사번 ${duplicates.length}건: ${[...new Set(duplicates)].join(', ')}`);
    return;
  }
  setLoading(true);
  setError(null);
  try {
    const res = await registerUsers(filled);
    setResult(res);
    setManualRows([EMPTY_ROW()]);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
};
```

### JSX (구분선 + 직접 입력 테이블)

dropzone 닫는 태그(`</div>`) 바로 뒤, `{error && ...}` 바로 앞에 추가:

```jsx
        {/* 구분선 + 직접 입력 — preview/result 없을 때만 표시 */}
        {!preview && !result && (
          <>
            <div className="au-divider">
              <div className="au-divider-line" />
              <span className="au-divider-text">또는 직접 입력</span>
              <div className="au-divider-line" />
            </div>

            <div className="au-manual" onPaste={handleManualPaste}>
              <div className="au-manual-header">
                <span className="au-manual-hint">💡 Ctrl+V 로 엑셀 데이터 붙여넣기 가능</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="au-cancel-btn"
                    onClick={() => { setManualRows([EMPTY_ROW()]); setError(null); }}
                  >
                    초기화
                  </button>
                  <button
                    className="submit-button au-manual-submit"
                    onClick={handleManualRegister}
                    disabled={loading || manualRows.every(r => !r.employee_id && !r.name && !r.hire_date)}
                  >
                    {loading ? '등록 중...' : `${manualRows.filter(r => r.employee_id || r.name || r.hire_date).length}명 등록하기`}
                  </button>
                </div>
              </div>

              <div className="au-manual-table-wrap">
                <table className="au-manual-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>사번 *</th>
                      <th>이름 *</th>
                      <th>부서</th>
                      <th>입사일 *</th>
                      <th>구분 *</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualRows.map((row, idx) => (
                      <tr key={idx} className={row.employee_id || row.name ? 'au-row-filled' : ''}>
                        <td className="au-row-num">{idx + 1}</td>
                        <td><input className="au-cell-input" value={row.employee_id} onChange={e => updateRow(idx, 'employee_id', e.target.value)} placeholder="사번" /></td>
                        <td><input className="au-cell-input" value={row.name} onChange={e => updateRow(idx, 'name', e.target.value)} placeholder="이름" /></td>
                        <td><input className="au-cell-input" value={row.department} onChange={e => updateRow(idx, 'department', e.target.value)} placeholder="부서" /></td>
                        <td><input className="au-cell-input au-cell-date" value={row.hire_date} onChange={e => updateRow(idx, 'hire_date', e.target.value)} placeholder="YYYY-MM-DD" /></td>
                        <td>
                          <select className="au-cell-select" value={row.employee_type} onChange={e => updateRow(idx, 'employee_type', e.target.value)}>
                            <option value="신입">신입</option>
                            <option value="경력">경력</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="au-row-delete"
                            onClick={() => deleteRow(idx)}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="au-add-row-btn" onClick={() => setManualRows(prev => [...prev, EMPTY_ROW()])}>
                + 행 추가
              </button>
            </div>
          </>
        )}
```

### Steps

- [ ] **Step 1: `EMPTY_ROW` 상수 + `manualRows` state 추가**

`AdminUsers.js` 상단 state 선언부 (`const [dragging, setDragging] = useState(false);` 다음 줄)에 추가:
```js
  const EMPTY_ROW = () => ({ employee_id: '', name: '', department: '', hire_date: '', employee_type: '신입' });
  const [manualRows, setManualRows] = useState([EMPTY_ROW()]);
```

- [ ] **Step 2: 핸들러 4개 추가**

`handleReset` 함수 바로 아래에 `updateRow`, `deleteRow`, `handleManualPaste`, `handleManualRegister` 핸들러를 추가한다. (위 핸들러 코드 참고)

- [ ] **Step 3: JSX 추가**

`{!preview && !result && (<div className="au-dropzone" ...>` 블록이 닫히는 `</div>)}` 바로 뒤에 구분선 + 테이블 JSX를 추가한다. (위 JSX 참고)

- [ ] **Step 4: 동작 확인**
  - 앱 실행: `npm start`
  - 직원 관리 메뉴 진입
  - 빈 테이블 행이 1개 보이는지 확인
  - "행 추가" 클릭 → 행 늘어나는지 확인
  - 셀 클릭 후 타이핑 → 마지막 행 편집 시 빈 행 자동 추가되는지 확인

- [ ] **Step 5: 커밋**
```bash
git add src/pages/AdminUsers.js
git commit -m "feat: 직원 수동 입력 테이블 추가 (state, 핸들러, JSX)"
```

---

## Task 2: AdminUsers.css — 새 클래스 스타일 추가

**Files:**
- Modify: `src/pages/AdminUsers.css`

기존 `.au-again-btn:hover { ... }` 맨 마지막 줄 다음에 아래 스타일을 추가한다.

```css
/* ── 구분선 ── */
.au-divider {
  display: flex;
  align-items: center;
  gap: 14px;
}

.au-divider-line {
  flex: 1;
  height: 1px;
  background: #dee2e6;
}

.au-divider-text {
  font-size: 12px;
  color: #aaa;
  background: #f5f5f5;
  padding: 5px 14px;
  border: 1px solid #dee2e6;
  border-radius: 20px;
  white-space: nowrap;
}

/* ── 직접 입력 영역 ── */
.au-manual {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.au-manual-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fafafa;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
  gap: 8px;
}

.au-manual-hint {
  font-size: 12px;
  color: #1565c0;
  background: #e8f4fd;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
}

.au-manual-submit {
  padding: 8px 20px !important;
  font-size: 13px !important;
}

/* ── 테이블 ── */
.au-manual-table-wrap {
  overflow-x: auto;
}

.au-manual-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.au-manual-table thead th {
  background: #1a2332;
  color: white;
  padding: 9px 10px;
  text-align: left;
  font-weight: 500;
  white-space: nowrap;
}

.au-manual-table tbody tr {
  border-top: 1px solid #eee;
}

.au-manual-table tbody tr:hover {
  background: #f9f9f9;
}

.au-row-filled {
  background: #f0f7ff;
}

.au-row-filled:hover {
  background: #e8f2ff !important;
}

.au-row-num {
  padding: 6px 10px;
  color: #aaa;
  font-size: 12px;
  text-align: center;
  width: 32px;
}

.au-cell-input {
  width: 100%;
  min-width: 72px;
  padding: 5px 8px;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  font-size: 12px;
  color: #1a2332;
  background: white;
  outline: none;
  transition: border-color .15s;
  box-sizing: border-box;
}

.au-cell-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102,126,234,.12);
}

.au-cell-date {
  min-width: 100px;
}

.au-manual-table td {
  padding: 5px 6px;
}

.au-cell-select {
  padding: 5px 6px;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  font-size: 12px;
  color: #1a2332;
  background: white;
  outline: none;
  cursor: pointer;
  min-width: 60px;
}

.au-cell-select:focus {
  border-color: #667eea;
}

.au-row-delete {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color .15s;
  display: block;
  margin: 0 auto;
}

.au-row-delete:hover {
  color: #dc3545;
  background: #fff5f5;
}

.au-add-row-btn {
  display: block;
  width: 100%;
  padding: 10px;
  background: none;
  border: none;
  border-top: 1px solid #eee;
  color: #667eea;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: background .15s;
}

.au-add-row-btn:hover {
  background: #f5f6ff;
}
```

### Steps

- [ ] **Step 1: CSS 추가**

`AdminUsers.css` 파일 맨 끝에 위 스타일 블록을 추가한다.

- [ ] **Step 2: 시각 확인**
  - 구분선이 "또는 직접 입력" 텍스트와 함께 표시되는지
  - 테이블 헤더가 다크 배경으로 표시되는지
  - 데이터 있는 행이 파란빛 배경(`.au-row-filled`)으로 표시되는지
  - 입사일 열 너비가 충분한지

- [ ] **Step 3: 붙여넣기 테스트**
  - 엑셀(또는 메모장)에서 탭 구분 데이터 복사: `1001020	김민준	인사팀	2026-03-10	신입`
  - 테이블 내 아무 셀 클릭 후 Ctrl+V
  - 행이 자동 채워지는지 확인

- [ ] **Step 4: 등록 테스트**
  - 1행 채우기 → "1명 등록하기" 버튼 활성화 확인
  - 잘못된 입사일 입력 → 에러 메시지 확인
  - 정상 데이터 → 등록 성공 후 테이블 초기화 확인

- [ ] **Step 5: 커밋**
```bash
git add src/pages/AdminUsers.css
git commit -m "style: 직원 수동 입력 테이블 스타일 추가"
```

---

## 검증 체크리스트

- [ ] 직접 입력 테이블이 CSV 업로드 아래에 표시됨
- [ ] 빈 행 1개로 시작, "+ 행 추가" 클릭 시 행 늘어남
- [ ] 마지막 행 타이핑 시 빈 행 자동 추가됨
- [ ] 엑셀에서 복사 후 Ctrl+V → 다수 행 자동 채움
- [ ] 단일 값 붙여넣기(탭/줄바꿈 없음) → 해당 셀에만 입력됨 (정상 동작)
- [ ] 빈 행은 등록에서 제외됨
- [ ] 유효성 오류 시 에러 메시지 표시
- [ ] 등록 성공 후 result 표시 + 테이블 초기화
- [ ] CSV 업로드 기존 동작 그대로 유지
