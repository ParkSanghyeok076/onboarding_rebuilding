# CSV 직원 일괄 등록 기능 설계

- **날짜:** 2026-02-28
- **담당:** 인사기획팀 박상혁 선임
- **상태:** 설계 승인 완료, 구현 대기

---

## 개요

Admin 화면에서 CSV 파일을 업로드하면 Supabase Auth 계정 + users 테이블 프로필이 자동 생성되는 기능.

---

## CSV 형식 (5열)

```
사번,이름,부서,입사일,구분
1001002,홍길동,개발팀,2026-03-01,신입
1001003,김철수,영업팀,2026-03-01,경력
```

| 컬럼 | 설명 |
|------|------|
| 사번 | 로그인 ID (`사번@company.internal`) 자동 생성 |
| 이름 | 앱 내 표시 이름 |
| 부서 | 소속 부서 |
| 입사일 | YYYY-MM-DD 형식 |
| 구분 | `신입` 또는 `경력` |

---

## 자동 계산 규칙

**초기 비밀번호:** 사번 그대로 (예: `1001002`)

| 구분 | period_1 | period_2 | period_3 |
|------|---------|---------|---------|
| 신입 | 입사일 ~ +1개월 | +1개월 ~ +2개월 | +2개월 ~ +3개월 |
| 경력 | 입사일 ~ +1개월 | — (null) | — (null) |

설문 횟수:
- 신입: 1차(1개월 후), 2차(2개월 후), 3차(3개월 후)
- 경력: 1차(1개월 후)만

---

## 구현 파일

### 1. `supabase/functions/register-users/index.ts` (신규)
- Supabase Admin API(`supabase.auth.admin.createUser()`)로 Auth 계정 생성
- `users` 테이블에 프로필 insert
- service_role key는 Edge Function 환경변수에 보관 (프론트엔드 노출 없음)
- 요청: `{ users: [{employee_id, name, department, hire_date, employee_type}] }`
- 응답: `{ success: [...], failed: [...] }` (부분 실패 허용)

### 2. `src/pages/AdminUsers.js` (신규)
- CSV 파일 업로드 버튼
- papaparse로 파싱 후 미리보기 테이블 표시
- 자동 계산된 기간 미리보기 포함
- "등록" 버튼 → Edge Function 호출
- 결과 표시 (성공 N건 / 실패 N건)

### 3. `src/lib/edgeFunctions.js` (수정)
- `registerUsers(users)` 함수 추가

### 4. `src/App.js` (수정)
- `admin-users` 라우트 추가

### 5. `src/components/AdminMenu.js` (수정)
- "직원 관리" 메뉴 항목 추가

---

## Supabase 사전 작업 (구현 전 필요)

Supabase 대시보드 → Edge Functions → `register-users` → Secrets:
- `SUPABASE_SERVICE_ROLE_KEY`: 프로젝트 Settings → API → service_role key 값 입력

---

## 배포 완료 현황

- Vercel 배포 URL: `https://yuraonboardingprogram.vercel.app`
- GitHub `main` push 시 자동 배포
- Edge Functions (`analyze`, `generate-email`) 배포 완료
- 환경변수 (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`) 등록 완료
