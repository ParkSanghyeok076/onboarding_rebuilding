# 신규입사자 온보딩 시스템 개발 일지

---

## 🎯 프로젝트 개요

신규입사자(신입공채, 경력공채)의 온보딩 과정을 관리하는 웹 애플리케이션

- **담당자**: 인사기획팀 박상혁 선임
- **배포 URL**: https://yuraonboardingprogram.vercel.app
- **GitHub**: https://github.com/ParkSanghyeok076/onboarding_rebuilding
- **스택**: React (CRA), Supabase, Vercel, Claude API (claude-sonnet-4-6)

---

## 📅 2026-02-11 — 프로젝트 초기 구현

### 완성된 기능
- React 프로젝트 초기 설정 (Create React App)
- 온보딩 프로그램 페이지 (6가지 활동, 이미지 업로드, 진행률)
- CSV 데이터 기반 로그인 (localStorage, 초기 비밀번호: y+사번)
- 메인 메뉴, 네비게이션 바, 비밀번호 변경 기능
- 한글 CSV 인코딩 처리 (iconv-lite, EUC-KR→UTF-8)

---

## 📅 2026-02-26 — 세션 1: Supabase Auth 연동

### 목표
기존 CSV 기반 로그인 → Supabase Auth 교체

### 완성된 기능
- Supabase 클라이언트 설치 및 초기 설정 (`src/lib/supabase.js`)
- Supabase Auth 연동 (사번@company.internal 이메일 패턴)
- DB 스키마 7개 테이블 생성 + RLS 정책 적용
  - `users`, `announcements`, `onboarding_submissions`, `survey_rounds`
  - `survey_responses`, `analysis_results`, `email_drafts`
- 로그인/로그아웃/세션 유지/오류 메시지 정상 동작

### 주요 해결 과제
- **RLS 재귀 방지**: admin 체크 정책에서 users 직접 참조 시 재귀 발생
  → `is_hr_admin()` SECURITY DEFINER 함수로 해결
- **onAuthStateChange 내부 REST 호출 금지**: Supabase v2 내부 락 발생
  → userId를 state에 저장 후 별도 useEffect에서 REST 호출

---

## 📅 2026-02-27 — 세션 2: DB 연동 (공지사항, Storage)

### 완성된 기능
- 공지사항 Supabase DB 연동 (정적 JS → announcements 테이블 fetch)
- 온보딩 이미지 Supabase Storage 연동
  - 업로드 경로: `{userId}/{programId}` (upsert: true)
  - 표시: createSignedUrl(path, 3600) → 1시간 유효 signed URL
  - 새로고침 후 이미지 영속성 확보
- onboarding-images Storage RLS 정책 4개 적용
- onboarding_submissions 테이블 연동
- period null 방어 처리 ("기간 미설정" 표시)

### Storage RLS 패턴
```
(storage.foldername(name))[1] = auth.uid()::text
```

---

## 📅 2026-02-27 — 세션 3: 설문조사 직원 화면

### 완성된 기능
- `Survey.js` — 설문 컨테이너 (회차 선택 → 폼 → 결과)
- `SurveyList.js` — 설문 회차 목록 (참여 가능/완료/미오픈)
- `SurveyForm.js` — 파트별 설문 폼 (객관식, 척도, 주관식)
- `SurveyResult.js` — 읽기 전용 결과 조회
- `src/data/surveyQuestions.js` — 23문항 데이터 (Part 1~3)
- `Pages.css` 공통 스타일

### 설문 구조
- Part 1: 온보딩 프로그램 만족도 (객관식/척도)
- Part 2: HR 지원 및 환경 (척도/객관식)
- Part 3: 자유 의견 (주관식 필수)

---

## 📅 2026-02-27 — 세션 4: Edge Functions (ABSA + 이메일 생성)

### 완성된 기능
- `supabase/functions/analyze/index.ts` — ABSA 분석 Edge Function
  - Claude claude-sonnet-4-6 API 호출
  - 설문 응답 → aspect별 감성 분석 (긍정/부정/중립)
  - analysis_results 테이블 저장
- `supabase/functions/generate-email/index.ts` — 이메일 초안 생성 Edge Function
  - ABSA 결과 → 자연스러운 HR 제안 형식 이메일
  - 설문/분석/응답/피드백 단어 절대 미사용
  - mentor_name/team_leader_name 없을 시 fallback 처리
  - email_drafts 테이블 저장
- `src/lib/edgeFunctions.js` — 프론트엔드 호출 헬퍼 함수

---

## 📅 2026-02-27 — 세션 5: HR Admin 화면

### 완성된 기능
- `AdminAnnouncements.js` — 공지사항 관리 (조회/편집/고정/삭제)
- `AdminOnboarding.js` — 온보딩 현황 (정렬/필터/이미지 팝업)
- `AdminSurvey.js` — 설문 관리 (ABSA 실행, aspects 결과 모달, 이메일 초안 생성)
- Admin 라우트 분기 (role = 'hr_admin')

---

## 📅 2026-02-28 — Vercel 배포

### 완성된 내용
- Vercel 배포 완료: https://yuraonboardingprogram.vercel.app
- GitHub main push 시 자동 배포 설정
- 환경변수 2개 등록
  - `REACT_APP_SUPABASE_URL`
  - `REACT_APP_SUPABASE_ANON_KEY`

---

## 📅 2026-03-02 — CSV 직원 일괄 등록 기능

### 완성된 기능
- `supabase/functions/register-users/index.ts` — 직원 일괄 등록 Edge Function
  - Supabase Auth + users 프로필 동시 생성
  - 신입: 3개월 period (period_1~3) / 경력: 1개월 (period_1만)
  - 초기 비밀번호: y+사번 (예: y1001001)
  - JWT 페이로드 직접 디코딩으로 admin 권한 검증
- `src/pages/AdminUsers.js` — CSV 업로드 페이지
  - CSV 미리보기 → 검증 → 일괄 등록
  - CSV 형식: `사번,이름,부서,입사일,구분` (구분: 신입/경력)
  - CSV 양식 파일 다운로드 기능
- AdminMenu에 "직원 관리" 메뉴 연결

### CSV 형식 예시
```csv
사번,이름,부서,입사일,구분
2001001,홍길동,마케팅팀,2026-03-02,신입
2001002,김영희,개발팀,2026-03-02,경력
```

### 주요 디버깅 이력
- **supabase-js v2.97.0 버그**: `functions.invoke()` 호출 시 anon key 전송 문제
  → Authorization 헤더에 access_token 명시적 전달로 해결
- **Edge Function auth.getUser() 불안정**: service role key로 getUser() 재귀 호출 실패
  → JWT payload 직접 디코딩 (gateway verify_jwt=true 활용)

---

## 📅 2026-03-02 — UI 개선 및 관리자 화면 고도화

### 완성된 기능
- Navbar: YURA 타이틀 추가, 소속+이름 통합 표시, team→department 버그 수정
- MainMenu: 사용자 이름 환영 문구 (`{이름}님 환영합니다!`)
- App: 하단 문의처 footer 추가
- 설문조사: '응시 가능'→'참여 가능' 문구 통일, 파트별 설명 텍스트 추가
- 주관식 placeholder: '선택'→'필수' 텍스트 변경
- AdminSurvey: ABSA 완료 클릭 시 aspects 분석 결과 모달 표시
- AdminAnnouncements: 공지사항 클릭 시 제목/본문/고정 편집 가능

---

## 📂 현재 프로젝트 구조

```
onboarding_rebuilding/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Header.js / Header.css
│   │   ├── Login.js / Login.css
│   │   ├── MainMenu.js / MainMenu.css
│   │   ├── Navbar.js / Navbar.css
│   │   └── ProgramCard.js
│   ├── pages/
│   │   ├── Announcements.js
│   │   ├── OnboardingProgram.js
│   │   ├── PasswordChange.js / PasswordChange.css
│   │   ├── Survey.js
│   │   ├── SurveyForm.js
│   │   ├── SurveyList.js
│   │   ├── SurveyResult.js
│   │   ├── AdminAnnouncements.js   ← HR Admin
│   │   ├── AdminOnboarding.js      ← HR Admin
│   │   ├── AdminSurvey.js          ← HR Admin
│   │   ├── AdminUsers.js           ← HR Admin (CSV 등록)
│   │   └── Pages.css
│   ├── lib/
│   │   ├── supabase.js
│   │   └── edgeFunctions.js
│   ├── data/
│   │   └── surveyQuestions.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── supabase/
│   └── functions/
│       ├── analyze/index.ts         ← ABSA Edge Function
│       ├── generate-email/index.ts  ← 이메일 생성 Edge Function
│       └── register-users/index.ts  ← CSV 직원 등록 Edge Function
├── docs/
│   ├── plans/                       ← 세션별 설계/구현 계획서
│   └── sql/                         ← DB 마이그레이션 SQL
├── README.md
├── SETUP.md
├── GIT_WORKFLOW.md
└── WORK_LOG.md                      ← 이 파일
```

---

## 📊 기능 개발 진행률

| 기능 | 상태 | 비고 |
|-----|------|------|
| 프로젝트 초기 설정 | ✅ 완료 | |
| Supabase Auth 연동 | ✅ 완료 | |
| DB 스키마 (7개 테이블 + RLS) | ✅ 완료 | |
| 공지사항 DB 연동 | ✅ 완료 | |
| 온보딩 이미지 Storage 연동 | ✅ 완료 | |
| 설문조사 직원 화면 | ✅ 완료 | 23문항, 3파트 |
| ABSA Edge Function | ✅ 완료 | Claude claude-sonnet-4-6 |
| 이메일 생성 Edge Function | ✅ 완료 | |
| HR Admin 화면 | ✅ 완료 | 공지/온보딩/설문/직원 |
| Vercel 배포 | ✅ 완료 | 자동 배포 |
| CSV 직원 일괄 등록 | ✅ 완료 | register-users Edge Function |
| UI 개선 | ✅ 완료 | 문구/레이아웃 |
| 온보딩 기간 주 단위 전환 | ✅ 완료 | 신입 12주(84일), 경력 4주(28일) |
| 타임라인 시각화 | ✅ 완료 | OnboardingTimeline 컴포넌트, 🚗 마커 |

---

## ✅ 배포 완료 확인 (2026-03-02)

| 항목 | 상태 |
|-----|------|
| Secrets 5개 등록 | ✅ 완료 (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY 등) |
| register-users Edge Function 배포 | ✅ 완료 (E2E 직원 등록 성공으로 확인) |
| 전체 E2E 흐름 테스트 | ✅ 완료 (직원 등록 → 로그인 → 설문 → ABSA → 이메일) |

---

## 📅 2026-03-03 — 온보딩 기간 수정 + 타임라인 시각화

### 배경
- 다른 PC에서 작업한 내용 git sync (hard reset to origin/main)
- 월(月) 단위 기간 계산의 부정확성 → 주(週) 단위로 전환

### 완성된 기능

#### 1. 온보딩 기간 계산 변경 (주 단위)

| 구분 | 기존 | 변경 |
|------|------|------|
| 신입 전체 | 3개월 | 12주 (84일) |
| 신입 1차 | +1개월 | +28일 |
| 신입 2차 | +2개월 | +56일 |
| 신입 3차 | +3개월 | +84일 |
| 경력 | 1개월 | 4주 (28일) |

- **`supabase/functions/register-users/index.ts`**: `addMonths()` → `addDays()` 교체
  - period_2_start: hire_date+29일 (1차 종료 다음날)
  - period_3_start: hire_date+57일 (2차 종료 다음날)
- **`src/pages/AdminUsers.js`**: CSV 미리보기 텍스트 `+3개월` → `+12주 (84일)`

#### 2. DB 마이그레이션 (기존 직원 period 재계산)

```sql
UPDATE users
SET
  period_1_end   = hire_date::date + 28,
  period_2_start = CASE WHEN employee_type = '신입' THEN hire_date::date + 29 ELSE NULL END,
  period_2_end   = CASE WHEN employee_type = '신입' THEN hire_date::date + 56 ELSE NULL END,
  period_3_start = CASE WHEN employee_type = '신입' THEN hire_date::date + 57 ELSE NULL END,
  period_3_end   = CASE WHEN employee_type = '신입' THEN hire_date::date + 84 ELSE NULL END
WHERE role = 'employee';
```
> PostgreSQL에서 `date + integer = date` (type-safe, cast 불필요)

#### 3. OnboardingTimeline 컴포넌트 신규 구현

- **`src/components/OnboardingTimeline.js`** 신규 생성
  - 신입: 4 노드 (입사일 / 1차종료 / 2차종료 / 3차종료)
  - 경력: 2 노드 (입사일 / 종료일)
  - 오늘 마커: 🚗 이모지 (40px, scaleX(-1) 반전, bottom이 선 중심에 정렬)
  - 구간 색상: 완료(흰색 85%) / 진행중(금색 #ffd700) / 미진행(흰색 18%)
  - 세그먼트가 원을 침범하지 않도록 `calc(${left}% + 8px)` / `calc(${width}% - 16px)` 적용
- **`src/components/Header.js`**: `period` 문자열 → `user` 객체 prop, OnboardingTimeline 렌더링
- **`src/pages/OnboardingProgram.js`**: `getPeriod()` 제거, `user` 객체 전달

#### 4. CSS 정렬 설계 (`src/App.css`)

- 선(`tl-base-line`, `tl-segment`): `top: 31px` + `transform: translateY(-50%)`
- 노드 원 중심: date(18px) + margin(5px) + radius(8px) = **31px** ← 선 중심과 일치
- 🚗 배치: `margin-top: -9px` → 이모지 bottom이 선 중심(31px)에 정렬

### 주요 디버깅 이력

- **DB SQL 타입 오류 3회**: `::text` 캐스트, `TO_CHAR()` 시도 후 최종 `date + integer` 방식으로 해결
- **Edge Function 401**: 구 access token 폐기 후 신규 토큰으로 재배포
- **타임라인 선/원 미정렬**: `transform: translateY(-50%)` + 픽셀 수학으로 정확한 정렬 달성
- **세그먼트가 원을 침범**: `calc()` 8px 오프셋으로 원 경계에서 시작/종료

### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `232e643` | AdminUsers CSV 미리보기 텍스트 수정 (+12주/+4주) |
| `126f948` | register-users Edge Function: addDays() 교체 |
| `72a1fec` | OnboardingTimeline 컴포넌트 신규 구현 |
| `0fc486d` | Header/OnboardingProgram 타임라인 연결 |
| `8ba4a0f` | 타임라인 정렬 개선 + 설문 기간 시작일 수정 |

---

## 🧪 테스트 계정

### 신입공채 (신입)
- 사번: `1001001`
- 초기 비밀번호: `y1001001`
- 온보딩 기간: 3개월 (1~3차 설문)

### 경력공채 (경력)
- 사번: `1001013`
- 초기 비밀번호: `y1001013`
- 온보딩 기간: 1개월 (1차 설문만)

### HR Admin
- role: `hr_admin` (Supabase users 테이블에서 직접 설정)

---

---

## 📅 2026-03-05 — 세션 4: 온보딩 현황 페이지 개편 + 직원 등록 오류 대응

### 완성된 기능
- **AdminOnboarding.js 전면 수정**
  - 기존 6열 프로그램 표 → 통합 대시보드로 변경
  - 새로운 컬럼: 기간(M/D~M/D), 계획서(체크박스), 프로그램(N/6), 설문조사(아이콘), 상태
  - ProgramGridPopup 컴포넌트: 2×3 그리드로 6개 프로그램 이미지 표시
  - 기간 컬럼 정렬 추가 (시작일 기준)
  - 상태 컬럼 정렬 제거 (필터링으로 충분)

- **설문조사 아이콘 구현**
  - ✅ 초록색: 제출됨
  - △ 회색: 예정중 (아직 기간 도래 안 함)
  - ❌ 빨강색: 미제출/기간만료
  - 신입(3차), 경력(1차) 자동 구분

- **계획서 체크박스**
  - 낙관적 업데이트 지원
  - DB에 `ojt_plan_received` 컬럼 추가 (ALTER TABLE)

- **CSS 스타일 추가** (Pages.css)
  - 프로그램 카운터 색상 (.prog-count.done/undone)
  - 설문 아이콘 스타일 (.survey-icon-check/tri/x)
  - 그리드 팝업 레이아웃 (.prog-grid-popup)
  - 반응형 디자인 (@media queries)

### 🔴 발생한 오류 (해결 필요)

**오류: Direct Employee Registration Failed (401 Unauthorized)**

**증상:**
- 직원 일괄 등록 페이지에서 CSV 업로드 시 401 에러 발생
- Vercel 배포 후에도 동일한 오류 지속
- Edge Function `register-users`가 인증 실패

**원인 분석:**
- Edge Function이 필요한 환경 변수를 읽지 못함
- Vercel Environment Variables 미설정:
  - ❌ `SUPABASE_URL` (없음)
  - ❌ `SUPABASE_ANON_KEY` (없음 - Edge Function용)
  - ❌ `SUPABASE_SERVICE_ROLE_KEY` (없음 - 서버 인증용)
- 현재 설정된 변수:
  - ✅ `supabase` (불명확)
  - ✅ `REACT_APP_SUPABASE_ANON_KEY` (React용)
  - ✅ `REACT_APP_SUPABASE_URL` (React용)

**Edge Function 필요 변수 (register-users/index.ts Line 21-23):**
```ts
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
```

**해결 방법 (집에서 진행):**

1. **Vercel Environment Variables 추가**
   ```
   SUPABASE_URL = https://zpilphcmmylekzbuam.supabase.co
   SUPABASE_ANON_KEY = sb_publishable_... (Supabase API Keys → Publishable key)
   SUPABASE_SERVICE_ROLE_KEY = sb_secret_... (Supabase API Keys → Secret keys)
   ```

2. **Vercel 강제 재배포**
   - Deployments → 최신 배포 → Redeploy
   - "Use existing Build Cache" **체크 해제** (중요!)

3. **직원 등록 재테스트**
   - CSV 파일 업로드
   - 정상 작동 여부 확인

### 🎯 참고: API Key 보안 전략

- **로컬**: `.env.local` 파일에 저장 (Git 무시)
- **Vercel**: Environment Variables에만 저장 (암호화)
- **GitHub**: API key 절대 커밋 안 함

### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `17c89c5` | feat: 기간 컬럼 정렬 추가, 상태 정렬 제거 |
| `bec67a4` | style: 설문 아이콘 텍스트를 굵게 처리 |
| `10d36a7` | fix: ESLint 오류 수정 (unused variables) |
| `942e9f5` | fix: 미사용 변수 제거 (periodStart, periodEnd, p_end) |
| `65e78c1` | feat: 온보딩 현황 페이지 전면 개편 |

---

---

## 📅 2026-03-06 — 관리자 UI 전면 개편

### ✅ 온보딩 현황 대시보드 KPI 카드 + 진행률

- KPI 카드 4개 추가: 전체 입사자 / 온보딩 완료 / 이번주 설문마감 / 마감 임박자 (3일 이내)
- 테이블에 진행률 열 추가 (컬러 프로그레스 바 + %)
  - 신입 최대 10항목 (프로그램6 + OJT1 + 설문3), 경력 최대 8항목 (프로그램6 + OJT1 + 설문1)
- `today` useMemo 안정화 + colSpan 버그(8→9) 수정

### ✅ 마감 임박자 팝업

- KPI ④ 카드 숫자 클릭 → 대상자 목록 팝업 (이름 / 팀 / 종료일 / D-N)
- urgentUsers 배열 useMemo에서 추출, urgentCount > 0일 때만 클릭 가능
- D-1 이하 빨간색(#dc3545), 2~3일 주황색(#f59e0b) 강조

### ✅ AdminLayout 풀 사이드바 레이아웃 도입

- `AdminLayout.js` / `AdminLayout.css` 신규 생성
  - 240px 사이드바: 로고(YURA 온보딩 시스템) + 메뉴 4개 + 하단 사용자정보/로그아웃
  - `zoom: 1.1` + `height: calc(100vh / 1.1)` 으로 110% 크기 렌더링 (하단 잘림 방지)
- `hr_admin` 로그인 시 Navbar 없이 AdminLayout만 렌더링
- 일반 직원은 기존 Navbar 구조 유지
- App.js에서 AdminMenu 등 직접 import 5개 제거, AdminLayout으로 통합

### ✅ 로그인 화면 로고 추가

- `YURA_SYMBOL.png`를 로그인 카드 상단 중앙에 배치 (height: 64px)

### ✅ 관리자 UI 세부 개선

- 상단 topbar (페이지 제목 + 날짜) 제거
- 로그아웃 버튼: 전원 아이콘(⏻) → "로그아웃" 텍스트 버튼
- 온보딩 현황: '메뉴로 돌아가기' 버튼 제거 (기본 화면)
- 공지사항/설문조사 관리: '← 메뉴로 돌아가기' → '← 돌아가기'

### ✅ 직원 관리 파일 업로드 UI 개선

- CSV 형식 안내 카드 (컬럼명 칩 스타일, 좌측 보라 테두리)
- 드래그&드롭 업로드 존 (+원형 버튼, hover/drag 상태 시각화)
- 파일 선택 후 파일명 + ✅ 표시로 상태 전환
- 미리보기 → 등록 → 결과 단계별 UI 분리
- 타이틀 '직원 일괄 등록' → '👥 직원 관리'

### ✅ 관리자 페이지 헤더 레이아웃 통일

- 돌아가기 버튼을 페이지 타이틀과 같은 줄에 배치 (`admin-header-left` 패턴)
- 상단 공백 `padding-top: 50px` 으로 조정
- AdminAnnouncements / AdminSurvey / AdminUsers 동일 패턴 적용

### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `2038447` | feat: 온보딩 현황 KPI 카드 4개 + 테이블 진행률 열 추가 |
| `48e7add` | fix: today useMemo 안정화 + colSpan 9으로 수정 |
| `c3d40fd` | feat: 마감 임박자 팝업 추가 (클릭 시 대상자 목록) |
| `c124807` | fix: urgentPopup 렌더링 조건에 urgentCount > 0 가드 추가 |
| `1b22ca3` | feat: AdminLayout 풀 사이드바 컴포넌트 생성 |
| `4a781e5` | feat: 관리자 hr_admin은 Navbar 없이 AdminLayout만 렌더링 |
| `8cb02a5` | style: 관리자 UI 개선 (110% 배율, 로그아웃 버튼, 타이틀, 돌아가기) |
| `4eb1ee8` | style: 로그인 화면에 로고 추가 |
| `5fe317f` | style: 로그인 로고를 YURA_SYMBOL.png로 변경 |
| `c89e847` | fix: 관리자 레이아웃 zoom 방식 변경 (element zoom + 높이 보정) |
| `4c798d3` | style: 관리자 레이아웃 상단 바 제거 |
| `d2ef415` | style: 직원 관리 파일 업로드 UI 개선 |
| `09d32a4` | style: 관리자 페이지 헤더 레이아웃 개선 |
| `baa421c` | style: admin-container 상단 패딩 50px |
| `87b176a` | style: 직원 관리 페이지 헤더 통일 |

---

---

## 📅 2026-03-10 — 직원 수동 입력 + 공지사항 관리 UX 개선

### ✅ 직원 수동 입력 테이블 추가 (AdminUsers)

- CSV 없이도 직원 직접 등록 가능한 스프레드시트형 테이블 추가
- 엑셀에서 복사 후 Ctrl+V 붙여넣기 → TSV 파싱으로 다수 행 자동 채움
- 마지막 행 편집 시 빈 행 자동 추가
- 기존 `registerUsers` Edge Function 재사용
- `src/pages/AdminUsers.css` 테이블 스타일 전체 추가

### ✅ 직원 관리 UI 개선

- 수기입력 ↔ CSV 순서 변경: 수기입력을 위로
- 초기화 버튼 가로 표시 (`white-space: nowrap`)
- 상단 공백 50px으로 통일
- 초기화/등록하기 버튼 높이 통일 (`margin-top: 0 !important`)

### ✅ 공지사항 관리 UX 개선

- 공지 클릭 시 바로 편집 모달 → **상세 보기 먼저 표시** (신입사원 화면과 동일)
- 편집 모달 → **인라인 편집**으로 전환 (상세 화면에서 직접 입력)
- **PDF 추가/삭제/교체 기능** 추가 (기존 공지 편집 시)
- `src/pages/AdminAnnouncements.css` 신규 생성

### ✅ DB/Storage 수정

- `announcements-files` 버킷 Storage RLS 정책 3개 추가 (INSERT/DELETE/SELECT)
- `public.users` 스키마 수정: `mentor_id`, `team_leader_id` FK에 `ON DELETE SET NULL` 추가
  → Authentication 대시보드 사용자 삭제 FK 오류 해결

### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `e20b331` | feat: 직원 수동 입력 테이블 추가 |
| `4b707ce` | style: 직원 수동 입력 테이블 스타일 추가 |
| `01af65d` | style: 직원 관리 UI 개선 |
| `ade15a9` | style: 초기화 버튼 높이 조정 |
| `6183c6d` | style: 초기화/등록하기 버튼 높이 통일 |
| `c43e29a` | feat: 공지사항 관리 UX 개선 - 인라인 편집 + PDF 관리 |

---

## 📅 2026-03-11 — 이번주 설문 마감 KPI 팝업

### ✅ SurveyDeadlinePopup

- `AdminOnboarding.js`: amber KPI 카드("이번주 설문마감") 클릭 시 대상자 목록 팝업 표시
- 팝업 컬럼: 이름 / 팀 / 차수 / 마감일 / 완료여부
- 이번 주(월~일) 기간 내 마감되는 설문만 필터링

### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `a7d97b6` | feat: 이번주 설문 마감 KPI 카드 클릭 시 대상자 팝업 추가 |

---

## 📅 2026-03-12 — 멘토/버디 관리 페이지 신규 구현

### ✅ AdminMentorBuddy 페이지 구현

**신규 파일**
- `src/pages/AdminMentorBuddy.js` — 메인 페이지 + 팝업 + 이메일 빌더
- `src/pages/AdminMentorBuddy.css` — 스타일
- `src/pages/AdminMentorBuddy.test.js` — 단위 테스트 20개 (TDD)

**기능 상세**
- `users` 테이블에서 `role = 'employee'` 전체 조회
- 테이블: 체크박스(전체선택) / 이름 / 팀 / 유형(신입·경력 배지) / 멘토·버디 / 안내메일
- 멘토/버디 지정 팝업: 이름 입력 → Supabase `mentor_name` UPDATE → 즉시 반영
- 안내메일 팝업: 렌더링된 HTML 미리보기 + "HTML 복사" 버튼
- 일괄 메일생성: 체크된 인원이 신입/경력 혼재 시 토스트 경고로 차단
- `AdminLayout.js`에 "🤝 멘토/버디 관리" 메뉴 연결

**이메일 빌더 함수**
- `buildNewHireEmail(employees, today)` — 신입사원용 (12주, OJT/멘토링)
- `buildExpHireEmail(employees, today)` — 경력직용 (4주, 온보딩 프로그램)
- 날짜 유틸: `addDays`, `fmtLong`, `fmtShort`, `fmtDeadline`, `getDayKo`
- 마감일: today + 5일, 시행기간 / 지원금 날짜 형식 각각 다름

### ✅ 이메일 템플릿 정교화 (같은 날 세션에서 반복 수정)

- 글씨체: 맑은 고딕 → **굴림체** 통일, 폰트 크기 **10pt** 고정
- 메일 제목(subject line div) 제거 — 제목은 별도 입력
- Bold 해제: 신입 섹션 1/3/4, 경력 섹션 1/3/4/5/6 (섹션 2는 유지)
- 줄간격: `line-height: 1.2` → **1.5로 전부 통일** (신입·경력 29개 항목)
- 경력직 지원목적 텍스트: "멘토-신입사원" → "버디-신규입사자"
- 페이지 폭: `.mentor-page` — `max-width: 900px; padding: 50px 1rem 2rem`으로 온보딩 현황과 동일하게 맞춤
- 테스트: 20/20 통과 유지

### 커밋 이력

| 커밋 | 내용 |
|------|------|
| `19b826f` | feat: 멘토/버디 날짜 유틸 + 이메일 빌더 함수 (TDD) |
| `abd7671` | fix: 첨부 오타 수정 (쳊부→첨부) |
| `2cfffa3` | fix: 이메일 빌더 빈 배열 가드 + 날짜 포맷 유효성 추가 |
| `9cf3523` | feat: AdminMentorBuddy 페이지 UI — 테이블, 팝업, 이메일 미리보기 |
| `aeb75cb` | fix: XSS 방어, setTimeout 정리, DB 오류 핸들링, 클립보드 오류 핸들링 |
| `0b63005` | feat: AdminLayout에 멘토/버디 관리 메뉴 연결 |

---

**작성자**: 인사기획팀 박상혁 선임
**최종 업데이트**: 2026-03-12 (멘토/버디 관리 페이지, 이메일 템플릿 굴림체·줄간격 정교화)
