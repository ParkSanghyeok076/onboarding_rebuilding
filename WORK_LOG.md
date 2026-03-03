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

---

## ✅ 배포 완료 확인 (2026-03-03)

| 항목 | 상태 |
|-----|------|
| Secrets 5개 등록 | ✅ 완료 (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY 등) |
| register-users Edge Function 배포 | ✅ 완료 (E2E 직원 등록 성공으로 확인) |
| 전체 E2E 흐름 테스트 | ✅ 완료 (직원 등록 → 로그인 → 설문 → ABSA → 이메일) |

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

**작성자**: 인사기획팀 박상혁 선임
**최종 업데이트**: 2026-03-03
