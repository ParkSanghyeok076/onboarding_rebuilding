# CSV 직원 일괄 등록 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin 화면에서 CSV 파일을 업로드하면 Supabase Auth 계정 + users 테이블 프로필이 자동 생성된다.

**Architecture:** 프론트엔드에서 CSV를 파싱 후 미리보기를 보여주고, 확인 시 `register-users` Edge Function을 호출한다. Edge Function은 service_role_key로 Supabase Admin API를 사용해 Auth 계정을 생성하고 users 테이블에 insert한다. 초기 비밀번호는 사번, 이메일은 `사번@company.internal` 패턴으로 자동 생성된다.

**Tech Stack:** React (CRA), Supabase Edge Functions (Deno), papaparse (CSV 파싱, 기설치)

---

## 사전 확인 사항

구현 전 Supabase 대시보드에서 확인:
- Edge Functions → 우측 상단 **Manage secrets** → `SUPABASE_SERVICE_ROLE_KEY` 등록 여부 확인
- 없으면: Project Settings → API → `service_role` 값 복사 후 등록

---

## Task 1: register-users Edge Function 생성

**Files:**
- Create: `supabase/functions/register-users/index.ts`

**Step 1: 파일 생성**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // HR Admin 권한 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'hr_admin') {
      return new Response(JSON.stringify({ error: 'HR Admin 권한 필요' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 요청 데이터
    const { users } = await req.json()
    if (!Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'users 배열 필요' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const success: string[] = []
    const failed: { employee_id: string; reason: string }[] = []

    for (const u of users) {
      const { employee_id, name, department, hire_date, employee_type } = u

      // 기간 자동 계산
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

      try {
        // Auth 계정 생성
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: `${employee_id}@company.internal`,
          password: 'y' + employee_id,
          email_confirm: true,
        })

        if (createError) {
          failed.push({ employee_id, reason: createError.message })
          continue
        }

        // users 테이블 insert
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: `${employee_id}@company.internal`,
          employee_id,
          name,
          department,
          hire_date,
          employee_type,
          role: 'employee',
          period_1_start,
          period_1_end,
          period_2_start,
          period_2_end,
          period_3_start,
          period_3_end,
        })

        if (insertError) {
          // Auth 계정은 만들어졌지만 프로필 실패 — Auth 계정 삭제
          await supabase.auth.admin.deleteUser(authData.user.id)
          failed.push({ employee_id, reason: insertError.message })
          continue
        }

        success.push(employee_id)
      } catch (e: unknown) {
        failed.push({ employee_id, reason: e instanceof Error ? e.message : String(e) })
      }
    }

    return new Response(
      JSON.stringify({ success, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Step 2: Edge Function 배포**

Supabase 대시보드 → Edge Functions → **Deploy a new function** → 파일 업로드
또는 Supabase CLI 사용:
```bash
npx supabase functions deploy register-users
```

**Step 3: 동작 확인**

Supabase 대시보드 → Edge Functions → `register-users` 가 목록에 표시되는지 확인

**Step 4: Commit**

```bash
git add supabase/functions/register-users/index.ts
git commit -m "feat: register-users Edge Function 추가"
```

---

## Task 2: edgeFunctions.js에 registerUsers 추가

**Files:**
- Modify: `src/lib/edgeFunctions.js`

**Step 1: registerUsers 함수 추가**

`src/lib/edgeFunctions.js` 맨 아래에 추가:

```javascript
export async function registerUsers(users) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await supabase.functions.invoke('register-users', {
    body: { users },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}
```

**Step 2: Commit**

```bash
git add src/lib/edgeFunctions.js
git commit -m "feat: registerUsers Edge Function 호출 함수 추가"
```

---

## Task 3: AdminUsers.js 페이지 생성

**Files:**
- Create: `src/pages/AdminUsers.js`

**Step 1: 파일 생성**

```jsx
import React, { useState } from 'react';
import Papa from 'papaparse';
import { registerUsers } from '../lib/edgeFunctions';
import './Pages.css';

function AdminUsers({ onBack }) {
  const [preview, setPreview] = useState(null);   // 파싱된 CSV 행 배열
  const [result, setResult] = useState(null);     // { success, failed }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        // CSV 헤더: 사번,이름,부서,입사일,구분
        const rows = data.map(row => ({
          employee_id: row['사번']?.trim(),
          name: row['이름']?.trim(),
          department: row['부서']?.trim(),
          hire_date: row['입사일']?.trim(),
          employee_type: row['구분']?.trim(),
        }));

        const invalid = rows.filter(
          r => !r.employee_id || !r.name || !r.hire_date ||
               !['신입', '경력'].includes(r.employee_type)
        );

        if (invalid.length > 0) {
          setError(`형식 오류 ${invalid.length}건: 사번·이름·입사일·구분(신입/경력) 확인 필요`);
          setPreview(null);
          return;
        }
        setPreview(rows);
      },
      error: (err) => setError('CSV 파싱 실패: ' + err.message),
    });
  };

  const handleRegister = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await registerUsers(preview);
      setResult(res);
      setPreview(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>← 뒤로</button>
        <h1 className="page-title">직원 일괄 등록</h1>
      </div>

      <div className="admin-section">
        <p className="admin-guide">
          CSV 형식: <code>사번,이름,부서,입사일,구분</code>
          &nbsp;(입사일: YYYY-MM-DD, 구분: 신입 또는 경력)
        </p>
        <input type="file" accept=".csv" onChange={handleFile} />
      </div>

      {error && <p className="error-message">{error}</p>}

      {preview && (
        <div className="admin-section">
          <h2 className="section-title">미리보기 ({preview.length}명)</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>사번</th><th>이름</th><th>부서</th>
                <th>입사일</th><th>구분</th><th>온보딩 기간</th>
              </tr>
            </thead>
            <tbody>
              {preview.map(r => (
                <tr key={r.employee_id}>
                  <td>{r.employee_id}</td>
                  <td>{r.name}</td>
                  <td>{r.department || '—'}</td>
                  <td>{r.hire_date}</td>
                  <td>{r.employee_type}</td>
                  <td>
                    {r.employee_type === '신입'
                      ? `${r.hire_date} ~ +3개월`
                      : `${r.hire_date} ~ +1개월`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="submit-button"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? '등록 중...' : `${preview.length}명 등록`}
          </button>
        </div>
      )}

      {result && (
        <div className="admin-section">
          <p className="success-message">성공 {result.success?.length ?? 0}건</p>
          {result.failed?.length > 0 && (
            <>
              <p className="error-message">실패 {result.failed.length}건</p>
              <ul>
                {result.failed.map(f => (
                  <li key={f.employee_id}>{f.employee_id}: {f.reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
```

**Step 2: Commit**

```bash
git add src/pages/AdminUsers.js
git commit -m "feat: AdminUsers CSV 업로드 페이지 추가"
```

---

## Task 4: AdminMenu.js에 직원 관리 메뉴 추가

**Files:**
- Modify: `src/components/AdminMenu.js:5-26`

**Step 1: menuItems 배열에 항목 추가**

기존 `menuItems` 배열 마지막에 추가:

```javascript
{
  id: 'admin-users',
  icon: '👥',
  title: '직원 관리',
  description: 'CSV 일괄 등록 · 직원 목록',
  color: '#A29BFE'
},
```

**Step 2: Commit**

```bash
git add src/components/AdminMenu.js
git commit -m "feat: AdminMenu에 직원 관리 메뉴 추가"
```

---

## Task 5: App.js에 admin-users 라우트 추가

**Files:**
- Modify: `src/App.js`

**Step 1: import 추가**

기존 import 목록 아래에 추가:

```javascript
import AdminUsers from './pages/AdminUsers';
```

**Step 2: 라우트 추가**

`{currentPage === 'admin-survey' ...}` 블록 바로 아래에 추가:

```jsx
{currentPage === 'admin-users' && currentUser.role === 'hr_admin' && (
  <AdminUsers onBack={handleBack} />
)}
```

**Step 3: Commit**

```bash
git add src/App.js
git commit -m "feat: admin-users 라우트 연결"
```

---

## Task 6: Pages.css에 필요한 스타일 확인 및 보완

**Files:**
- Modify: `src/pages/Pages.css`

**Step 1: 필요한 클래스 확인**

AdminUsers.js에서 사용하는 CSS 클래스:
- `page-container`, `page-header`, `back-button`, `page-title` — 기존 Admin 페이지와 동일
- `admin-section`, `admin-guide`, `admin-table`, `submit-button` — 기존 사용 여부 확인
- `success-message`, `error-message` — 기존 사용 여부 확인

```bash
grep -n "admin-section\|admin-guide\|admin-table\|success-message\|error-message" src/pages/Pages.css
```

**Step 2: 없는 클래스만 추가**

Pages.css 맨 아래에 누락된 클래스 추가:

```css
.admin-guide {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 12px;
}

.admin-guide code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.success-message {
  color: #27ae60;
  font-weight: 600;
  margin: 8px 0;
}

.error-message {
  color: #e74c3c;
  font-weight: 600;
  margin: 8px 0;
}
```

**Step 3: Commit**

```bash
git add src/pages/Pages.css
git commit -m "style: AdminUsers용 CSS 클래스 추가"
```

---

## Task 7: 전체 테스트 및 배포

**Step 1: 로컬 빌드 확인**

```bash
npm run build
```
Expected: `Compiled successfully.` (경고는 무시 가능, 에러는 수정 필요)

**Step 2: git push → Vercel 자동 배포**

```bash
git push origin main
```

**Step 3: 동작 확인**

1. `https://yuraonboardingprogram.vercel.app` 접속
2. HR Admin 계정으로 로그인
3. 메뉴에 "직원 관리" 카드 확인
4. 아래 테스트 CSV 파일 업로드:
   ```
   사번,이름,부서,입사일,구분
   9001001,테스트신입,개발팀,2026-03-01,신입
   9001002,테스트경력,영업팀,2026-03-01,경력
   ```
5. 미리보기 테이블 확인 → "2명 등록" 버튼 클릭
6. "성공 2건" 메시지 확인
7. Supabase 대시보드 → Authentication → Users에서 신규 계정 확인
8. Supabase 대시보드 → Table Editor → users에서 프로필 확인

**Step 4: 등록된 테스트 계정으로 로그인 확인**

- 사번: `9001001`, 비밀번호: `y9001001`
- 로그인 후 온보딩 화면 정상 표시 확인
