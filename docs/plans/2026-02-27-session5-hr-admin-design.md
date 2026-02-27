# 세션 5: HR Admin 화면 설계

**작성일:** 2026-02-27
**세션:** 5
**범위:** HR Admin 전용 화면 구현 (공지사항 관리 / 온보딩 현황 / 설문조사 관리)

---

## 1. 아키텍처

### 접근 방식
기존 앱에 통합. 로그인 후 `currentUser.role`로 분기:
- `hr_admin` → Admin 메뉴 + Admin 페이지
- `employee` → 기존 직원 메뉴 + 기존 페이지 (변경 없음)

### 신규 파일
```
src/
  components/
    AdminMenu.js
  pages/
    AdminAnnouncements.js
    AdminOnboarding.js
    AdminSurvey.js
```

### App.js 변경
`currentUser.role === 'hr_admin'`이면 `AdminMenu`와 Admin 페이지 렌더링. Navbar는 공통 사용.

---

## 2. 공지사항 관리 (AdminAnnouncements.js)

### 기능
- 공지 목록 조회 (핀 고정 공지 상단 표시)
- 새 공지 작성 모달 (제목, 본문, PDF 첨부 선택, 상단 고정 여부)
- 공지 삭제 (Storage 파일 + DB 행 동시 삭제)

### 작성 모달 필드
| 필드 | 타입 | 필수 |
|------|------|------|
| 제목 | text | ✅ |
| 본문 | textarea | ✅ |
| PDF 첨부 | file (pdf only) | ❌ |
| 상단 고정 | checkbox | ❌ |

### DB/Storage
- PDF → Supabase Storage `announcements-files` 버킷 업로드 → 공개 URL → `announcements.pdf_url`
- 삭제 시: Storage 파일 삭제 + `announcements` 테이블 행 삭제

---

## 3. 온보딩 프로그램 현황 (AdminOnboarding.js)

### 기능
- 직원별 6개 프로그램 제출 현황 테이블
- 열 헤더(이름, 상태) 클릭 → 오름차순/내림차순 정렬 토글
- 상태 필터: 전체 / 완료 / 미완료
- ✅ 클릭 → 원본 이미지 팝업

### 테이블 구조
| 이름 ↑↓ | 팀 | 유형 | 1 | 2 | 3 | 4 | 5 | 6 | 상태 ↑↓ |
|---------|---|------|---|---|---|---|---|---|--------|
| 김철수 | 개발 | 신입 | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | 미완료 |
| 이영희 | 마케팅 | 경력 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 완료 |

- **상태**: 6개 모두 제출 시 `완료`, 하나라도 없으면 `미완료`
- **이미지**: Supabase Storage signed URL로 원본 표시

### 데이터
- `users` (role = 'employee') + `onboarding_submissions` 조인

---

## 4. 설문조사 관리 (AdminSurvey.js)

### 2단계 구조

**1단계: 응답자 목록**
- 차수 필터 (전체 / 1차 / 2차 / 3차)
- 컬럼: 이름 / 차수 / 제출일 / 분석 상태 / 이메일 상태

| 이름 | 차수 | 제출일 | 분석 | 이메일 |
|------|------|--------|------|--------|
| 김철수 | 1차 | 2026-02-10 | [분석실행] | — |
| 이영희 | 2차 | 2026-02-15 | 완료 | [멘토] [팀장] |
| 박민준 | 1차 | 2026-02-20 | 완료 | 완료 |

- **[분석실행]**: `analyze` Edge Function 호출 → 완료 시 "완료" 표시
- **[멘토] / [팀장]**: `generate-email` Edge Function 호출
- 이미 생성된 초안: "완료" 클릭 시 초안 내용 확인 가능

**2단계: 응답 상세 (행 클릭 시)**
- 전체 설문 답변 파트별 읽기 전용 표시
- 척도: 점수 + 라벨 표시
- 주관식: 원문 그대로 표시

### 데이터
- `survey_responses` + `users` 조인
- `analysis_results`: 분석 완료 여부 확인
- `email_drafts`: 초안 생성 여부 + 내용 확인
- Edge Functions: `src/lib/edgeFunctions.js`의 `runAnalyze`, `runGenerateEmail` 사용

---

## 5. 제외 항목 (YAGNI)

| 항목 | 이유 |
|------|------|
| 공지사항 수정 | 삭제 후 재작성으로 대체 가능 |
| 온보딩 승인/반려 | 현재 프로세스상 불필요 |
| 설문 CSV 내려받기 | Supabase Table Editor에서 직접 내보내기 |
