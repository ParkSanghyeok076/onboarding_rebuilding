# 개발 환경 세팅 가이드

새 PC에서 바로 개발을 이어갈 수 있도록 정리한 가이드입니다.

---

## 1. 사전 설치

- [Node.js](https://nodejs.org) — LTS 버전 설치 (현재 개발 환경: v24.13.0)
- [Git](https://git-scm.com)
- 코드 에디터 (VS Code 권장)

---

## 2. 프로젝트 클론

```bash
git clone https://github.com/ParkSanghyeok076/onboarding_rebuilding.git
cd onboarding_rebuilding
```

---

## 3. 패키지 설치

```bash
npm install
```

---

## 4. 환경변수 설정 (필수)

`.env.local` 파일은 보안상 git에 포함되지 않습니다. 직접 생성해야 합니다.

프로젝트 루트에 `.env.local` 파일을 만들고 아래 내용을 입력하세요.

```
REACT_APP_SUPABASE_URL=https://zpilphcmnvylekzbzuam.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_2ebucLCXsbAqV3vEd90dcw_5Z_lMhbc
```

> Supabase 키는 [Supabase Dashboard](https://supabase.com) → 프로젝트 → Project Settings → API 에서도 확인할 수 있습니다.

---

## 5. 개발 서버 실행

```bash
npm start
```

브라우저에서 `http://localhost:3000` 접속.

---

## 6. 테스트 계정

| 항목 | 값 |
|---|---|
| 사번 | `1001001` |
| 비밀번호 | `y1001001` |
| 이름 | 홍길동 (신입, 개발팀) |

로그인 화면에서 사번만 입력 (이메일 형식 변환은 앱이 자동 처리)

---

## 현재 구현 현황

| 세션 | 내용 | 상태 |
|---|---|---|
| 세션 1 | Supabase Auth 연동 (로그인/로그아웃/비밀번호 변경) | ✅ 완료 |
| 세션 2 | 공지사항 DB 연동 + 온보딩 이미지 Storage 연동 | ✅ 완료 |
| 세션 3 | 설문조사 직원 화면 | 예정 |
| 세션 4 | Edge Functions (ABSA + 이메일 초안) | 예정 |
| 세션 5 | HR Admin 화면 + Vercel 배포 | 예정 |
