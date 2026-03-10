# 작업 이력 (Work Log)

> 날짜별 주요 작업 내용을 기록합니다.

---

## 2026-03-10

### 1. 직원 수동 입력 테이블 추가 (AdminUsers)

**배경**: CSV 파일 없이도 직원을 등록할 수 있도록 직접 입력 UI 추가 요청

**구현 내용**:
- `src/pages/AdminUsers.js`: 스프레드시트형 수동 입력 테이블 추가
  - `EMPTY_ROW` 팩토리 + `manualRows` state
  - `updateRow` / `deleteRow` / `handleManualPaste` / `handleManualRegister` 핸들러
  - 마지막 행 편집 시 빈 행 자동 추가
  - 엑셀 붙여넣기(Ctrl+V) 지원: TSV 파싱 → 다수 행 자동 채움
  - 기존 `registerUsers` Edge Function 재사용
- `src/pages/AdminUsers.css`: 테이블 스타일 전체 추가 (구분선, 셀 인풋, 행 하이라이트 등)

**커밋**:
- `e20b331` feat: 직원 수동 입력 테이블 추가 (state, 핸들러, JSX)
- `4b707ce` style: 직원 수동 입력 테이블 스타일 추가

---

### 2. 직원 관리 UI 개선

**수정 사항**:
1. **수기입력 ↔ CSV 순서 변경**: 수기입력을 위로, "또는 CSV 업로드" 구분선 후 CSV 드롭존
2. **초기화 버튼 줄바꿈 수정**: `white-space: nowrap` 추가 → 가로 표시
3. **상단 공백 통일**: `padding-top: 0` → `50px` (공지사항 관리·설문조사 관리와 동일)
4. **초기화/등록하기 버튼 높이 통일**: `.submit-button` 기본 `margin-top: 16px`을 `0 !important`로 재정의

**커밋**:
- `01af65d` style: 직원 관리 UI 개선 (수기입력 위로, 초기화 버튼 줄바꿈 수정, 상단 패딩 50px)
- `ade15a9` style: 초기화 버튼 높이를 등록하기 버튼과 동일하게 조정
- `6183c6d` style: 초기화/등록하기 버튼 높이 통일 (margin-top 제거)

---

### 3. 공지사항 관리 UX 개선

**변경 내용**:
- 공지 클릭 시 바로 편집 모달 → **상세 보기 먼저 표시** (신입사원 화면과 동일 스타일)
- 편집 모달 → **인라인 편집**으로 전환 (상세 화면에서 바로 입력 가능)
  - 제목: 큰 인풋 필드, 본문: 키 큰 textarea
  - 고정 공지 체크박스 토글
- **PDF 추가/삭제/교체 기능** 추가 (기존 공지 편집 시)
  - 현재 첨부파일 표시 + 삭제 버튼
  - 새 파일 업로드 / 교체 버튼
- `src/pages/AdminAnnouncements.css` 신규 생성

**DB/Storage 수정**:
- `announcements-files` 버킷 Storage RLS 정책 3개 추가 (INSERT/DELETE/SELECT)
- `public.users` 스키마 수정: `mentor_id`, `team_leader_id` FK에 `ON DELETE SET NULL` 추가
  → Authentication 대시보드에서 사용자 삭제 시 FK 오류 해결

**기타**:
- '목록으로 돌아가기' → '목록으로' 텍스트 변경

**커밋**:
- `c43e29a` feat: 공지사항 관리 UX 개선 - 인라인 편집 + PDF 관리

---

## 2026-03-06

### 1. AdminLayout 사이드바 컴포넌트 생성

- `src/components/AdminLayout.js` / `AdminLayout.css` 신규 생성
- 240px 다크 사이드바 (`#1a2332`) + 콘텐츠 영역 레이아웃
- 사이드바 메뉴: 온보딩현황 / 공지사항관리 / 설문조사관리 / 직원관리
- hr_admin 로그인 시 Navbar 없이 AdminLayout만 렌더링 (`App.js` 수정)

### 2. AdminOnboarding KPI 대시보드 개편

- KPI 카드 4개 추가: 전체 입사자 / 온보딩 완료 / 이번주 설문마감 / 마감 임박자(3일 이내)
- 테이블에 진행률 열 추가 (컬러 프로그레스 바 + %)
- 진행률 계산: 신입 최대 10항목, 경력 최대 8항목

### 3. 마감 임박자 팝업

- KPI ④ 마감 임박자 숫자 클릭 → 대상자 목록 팝업
- `urgentUsers` 배열 추출 (이름/팀/종료일/D-N)
- D-1 이하 빨간색, 나머지 주황색

---

## 2026-03-03

### 온보딩 기간 일수 기반 전환 + 타임라인 컴포넌트

- 온보딩 기간 계산: `addMonths` → `addDays` 방식 전환
  - 신입: 84일 (12주), 경력: 28일 (4주)
- `OnboardingTimeline` 컴포넌트 구현 (🚗 이모지 마커)
- period 계산: hire_date 기준 day 오프셋 방식
- 2/3차 설문 시작일 = 이전 차수 종료 다음날로 수정

---

## 2026-03-02

### 신규입사자 등록 Edge Function

- `supabase/functions/register-users` 구현
- Supabase Auth 계정 생성 + users 테이블 upsert 동시 처리
- 초기 비밀번호: `y{사번}` 형식
- JWT 검증 이슈 해결: `--no-verify-jwt` 플래그 배포

---

## 2026-02-28 ~ 03-01

### 사용자 등록 UI

- AdminUsers 페이지: CSV 업로드 → 파싱 → 미리보기 → 등록 플로우
- 드래그&드롭 존 UI 구현
- 유효성 검사: 필수 필드, 날짜 형식, 중복 사번

---

## 2026-02-27

### 설문조사 페이지 + ABSA

- Survey 페이지: 1차/2차/3차 차수별 설문 UI
- 5개 파트, 23개 문항 (Likert 5점 + 주관식)
- ABSA Edge Function: Claude API 연동, 속성별 감성 분석
- 1on1 제안 이메일 자동 생성 (멘토/팀장 톤 분리)

---

## 2026-02-26

### 프로젝트 기반 구축

- React CRA + Supabase 프로젝트 초기화
- Supabase Auth 로그인 구현 (사번 + 초기 비밀번호)
- 비밀번호 변경 페이지
- 공지사항 조회 페이지
- 온보딩 프로그램 6가지 활동 + 증빙 이미지 첨부
- DB 스키마 설계 (users, announcements, onboarding_programs, surveys)
