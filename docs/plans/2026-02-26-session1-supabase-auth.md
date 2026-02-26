# Session 1: Supabase 설정 + Auth 연동 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** CSV 기반 로그인을 Supabase Auth로 교체하고, 전체 DB 스키마를 Supabase에 적용한다.

**Architecture:** Supabase Auth의 email+password 인증을 사용하되, 기존 사번(employee ID) 기반 UX를 유지하기 위해 로그인 시 `{사번}@company.internal` 형식의 내부 이메일을 자동 생성한다. 로그인 후 `users` 테이블에서 프로필 정보를 가져와 앱 전역 상태로 관리한다.

**Tech Stack:** React CRA, @supabase/supabase-js, Supabase Auth, Supabase PostgreSQL

---

## 사전 준비 (박상혁 선임 직접 수행)

세션 시작 전 아래 값을 준비해두세요.

1. [supabase.com](https://supabase.com) → 프로젝트 생성
2. Project Settings → API 에서 아래 두 값 복사:
   - `Project URL` → `REACT_APP_SUPABASE_URL`
   - `anon public` key → `REACT_APP_SUPABASE_ANON_KEY`

---

## Task 1: Supabase 클라이언트 설치 및 환경변수 설정

**Files:**
- Modify: `package.json` (npm install)
- Create: `src/lib/supabase.js`
- Create: `.env.local` (gitignore에 이미 포함됨 ✓)
- Create: `.env.example` (키 형식 안내용, git에 커밋)

**Step 1: Supabase JS 클라이언트 설치**

```bash
npm install @supabase/supabase-js
```

Expected: `added X packages` 메시지, 오류 없음

**Step 2: .env.local 생성**

프로젝트 루트에 `.env.local` 파일 생성 (박상혁 선임이 직접 실제 값 입력):

```
REACT_APP_SUPABASE_URL=https://여기에-프로젝트-URL.supabase.co
REACT_APP_SUPABASE_ANON_KEY=여기에-anon-key
```

**Step 3: .env.example 생성**

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Step 4: src/lib/supabase.js 생성**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 5: 앱 실행하여 오류 없음 확인**

```bash
npm start
```

Expected: 브라우저에서 기존 로그인 화면이 정상 표시됨 (아직 기능은 그대로)

**Step 6: 커밋**

```bash
git add .env.example src/lib/supabase.js package.json package-lock.json
git commit -m "feat: Supabase 클라이언트 설치 및 설정"
```

---

## Task 2: DB 스키마 Supabase에 적용

**Files:**
- Create: `docs/sql/schema.sql` (재현용 문서)

**Step 1: schema.sql 파일 생성**

```sql
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

-- ⑤ 설문 응답 (주관식 컬럼은 세션 3에서 확정 후 추가)
CREATE TABLE survey_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  round_id     uuid REFERENCES survey_rounds(id),
  submitted_at timestamptz DEFAULT now(),
  subjective_1 text,
  subjective_2 text
);

-- ⑥ ABSA 분석 결과
CREATE TABLE analysis_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES survey_responses(id) ON DELETE CASCADE,
  analyzed_at timestamptz DEFAULT now(),
  aspects     jsonb,
  raw_result  text
);

-- ⑦ 이메일 초안
CREATE TABLE email_drafts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id    uuid REFERENCES survey_responses(id) ON DELETE CASCADE,
  recipient_type text CHECK (recipient_type IN ('mentor', 'team_leader')),
  subject        text,
  body           text,
  created_at     timestamptz DEFAULT now()
);
```

**Step 2: Supabase SQL Editor에서 스키마 실행**

1. [supabase.com](https://supabase.com) → 프로젝트 선택
2. 좌측 메뉴 → SQL Editor
3. 위 SQL 전체 복사 → 붙여넣기 → Run

Expected: 오류 없이 7개 테이블 생성됨

**Step 3: RLS 정책 적용**

SQL Editor에서 추가 실행:

```sql
-- RLS 활성화
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

-- survey_rounds: 로그인한 사용자 읽기
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
```

**Step 4: Supabase Storage 버킷 생성**

Supabase → Storage → New Bucket:
- `announcements-files` (Public: false)
- `onboarding-images` (Public: false)

**Step 5: 커밋**

```bash
git add docs/sql/schema.sql .env.example
git commit -m "docs: Supabase DB 스키마 및 RLS 정책 추가"
```

---

## Task 3: 테스트 사용자 생성 (Supabase Auth)

**목적:** 로컬 개발 테스트용 계정 1~2개 생성

**Step 1: Supabase Auth에 테스트 사용자 생성**

Supabase → Authentication → Users → Add User:
- Email: `1001001@company.internal`
- Password: `y1001001`

**Step 2: users 테이블에 프로필 데이터 삽입**

SQL Editor에서 실행 (위에서 생성한 Auth user의 id를 복사):

```sql
INSERT INTO users (id, email, name, employee_id, employee_type, role, hire_date, department, position)
VALUES (
  '여기에-auth-user-uuid',
  '1001001@company.internal',
  '홍길동',
  '1001001',
  '신입',
  'employee',
  '2026-02-01',
  '개발팀',
  '사원'
);
```

**Step 3: HR Admin 계정도 동일하게 생성**

```sql
-- Auth에서 admin@company.internal / adminpass123 으로 생성 후:
INSERT INTO users (id, email, name, employee_id, employee_type, role)
VALUES (
  '여기에-admin-uuid',
  'admin@company.internal',
  '박상혁',
  'admin001',
  '신입',
  'hr_admin'
);
```

---

## Task 4: Login.js를 Supabase Auth로 교체

**Files:**
- Modify: `src/components/Login.js`

**Step 1: Login.js 전체 교체**

```javascript
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = `${employeeId}@company.internal`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('사번 또는 비밀번호가 올바르지 않습니다.');
    }

    setLoading(false);
    // 로그인 성공 시 App.js의 onAuthStateChange가 자동으로 상태 업데이트
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>신규입사자 온보딩 시스템</h1>
        <p className="login-subtitle">로그인하여 시작하세요</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사번 (아이디)</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="예: 1001001"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="예: y1001001"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="login-hint">
          💡 초기 비밀번호: y + 사번 (예: y1001001)
        </p>
      </div>
    </div>
  );
}

export default Login;
```

**Step 2: 저장 후 앱 실행 확인 (오류 없는지)**

```bash
npm start
```

---

## Task 5: App.js를 Supabase Auth 상태로 교체

**Files:**
- Modify: `src/App.js`

**Step 1: App.js 전체 교체**

```javascript
import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import './App.css';
import Login from './components/Login';
import Navbar from './components/Navbar';
import MainMenu from './components/MainMenu';
import OnboardingProgram from './pages/OnboardingProgram';
import Announcements from './pages/Announcements';
import Survey from './pages/Survey';
import PasswordChange from './pages/PasswordChange';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('menu');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 로그인/로그아웃 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setCurrentPage('menu');
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('프로필 로드 실패:', error);
    } else {
      setCurrentUser(data);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSelectMenu = (menuId) => {
    setCurrentPage(menuId);
  };

  const handleBack = () => {
    setCurrentPage('menu');
  };

  const handlePasswordChange = () => {
    setCurrentPage('password-change');
  };

  const handlePasswordChanged = () => {
    setCurrentPage('menu');
  };

  if (loading) {
    return <div className="App loading">로딩 중...</div>;
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div>
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onPasswordChange={handlePasswordChange}
      />

      {currentPage === 'menu' && (
        <MainMenu onSelectMenu={handleSelectMenu} />
      )}
      {currentPage === 'announcements' && (
        <Announcements onBack={handleBack} />
      )}
      {currentPage === 'onboarding' && (
        <OnboardingProgram user={currentUser} onBack={handleBack} />
      )}
      {currentPage === 'survey' && (
        <Survey onBack={handleBack} />
      )}
      {currentPage === 'password-change' && (
        <PasswordChange
          user={currentUser}
          onBack={handleBack}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
}

export default App;
```

---

## Task 6: PasswordChange.js Supabase 연동

**Files:**
- Modify: `src/pages/PasswordChange.js`

**Step 1: PasswordChange.js 현재 내용 확인 후 Supabase 연동**

현재 `handlePasswordChanged`는 console.log만 하는 상태. Supabase `updateUser`로 교체:

```javascript
// PasswordChange.js 내 비밀번호 변경 핸들러 부분만 교체
import { supabase } from '../lib/supabase';

const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  if (newPassword !== confirmPassword) {
    setError('새 비밀번호가 일치하지 않습니다.');
    setLoading(false);
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    setError('비밀번호 변경에 실패했습니다.');
  } else {
    onPasswordChanged();
  }

  setLoading(false);
};
```

> PasswordChange.js 전체 구조를 먼저 Read로 확인한 후 정확한 위치에 적용할 것.

---

## Task 7: 통합 테스트

**Step 1: 로그인 테스트**
1. `npm start`
2. 사번 `1001001` + 비밀번호 `y1001001` 로 로그인
3. 메인 메뉴가 표시되고 Navbar에 이름 `홍길동` 확인

**Step 2: 로그아웃 테스트**
1. Navbar 로그아웃 버튼 클릭
2. 로그인 화면으로 돌아오는지 확인
3. 새로고침 후에도 로그인 화면인지 확인 (세션 없음)

**Step 3: 세션 유지 테스트**
1. 로그인 후 새로고침 (F5)
2. 로그인 화면이 아닌 메인 메뉴가 표시되는지 확인

**Step 4: 잘못된 비밀번호 테스트**
1. 사번 `1001001` + 비밀번호 `wrongpass` 입력
2. `사번 또는 비밀번호가 올바르지 않습니다.` 에러 메시지 표시 확인

**Step 5: 최종 커밋**

```bash
git add src/
git commit -m "feat: Supabase Auth 연동 완료 (CSV 로그인 교체)"
```

---

## Task 8: 불필요한 의존성 정리

**Files:**
- Modify: `package.json`

**Step 1: CSV 관련 패키지 제거 여부 확인**

현재 `papaparse`, `iconv-lite`, `buffer`는 로그인에만 사용 중.
세션 2에서 공지사항/온보딩 DB 연동 후에도 쓰지 않으면 그때 제거.
지금은 건너뜀 (YAGNI).

**Step 2: 최종 푸시**

```bash
git push origin main
```

---

## 세션 1 완료 기준

- [ ] Supabase 클라이언트 설치 및 환경변수 설정 완료
- [ ] DB 스키마 7개 테이블 + RLS 적용 완료
- [ ] Storage 버킷 2개 생성 완료
- [ ] 테스트 사용자 1명 이상 생성 완료
- [ ] 사번 기반 로그인/로그아웃 정상 동작
- [ ] 새로고침 후 세션 유지 동작
- [ ] GitHub에 푸시 완료
