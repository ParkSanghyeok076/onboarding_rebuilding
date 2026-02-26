# 설문조사 + ABSA 분석 시스템 설계

**작성일:** 2026-02-26
**담당자:** 인사기획팀 박상혁 선임
**범위:** 설문조사 기능 신규 구현 + 기존 기능(로그인/공지사항/온보딩 프로그램) Supabase 마이그레이션

---

## 1. 배경 및 목표

신규입사자 온보딩 설문의 주관식 응답을 ABSA(속성 기반 감성 분석)로 분석하여,
HR 담당자가 멘토/팀장에게 1on1 미팅을 자연스럽게 제안하는 가이드 메일 초안을 생성한다.

**우선순위:** 분석 정확성 → 메일 초안 작성 → 메일 발송은 HR 담당자(박상혁 선임)가 직접 수행

---

## 2. 기술 스택

| 역할 | 기술 |
|------|------|
| 프론트엔드 | React (CRA) → Vercel 배포 |
| 백엔드/DB | Supabase (PostgreSQL + Edge Functions + Storage) |
| 인증 | Supabase Auth (기존 CSV 로그인 대체) |
| ABSA / 이메일 생성 | Claude claude-sonnet-4-6 (Supabase Edge Function 내에서 호출) |
| API 키 보호 | Supabase Edge Function 환경변수 (프론트엔드에 노출 없음) |

**비용 (무료 플랜 기준, 연 100명 처리 시):**
- Supabase 무료: 50K MAU / 500MB DB → 충분
- Claude API: 약 $1~2/년 (300건 분석 기준)

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────┐
│  Vercel (React CRA)                          │
│                                              │
│  직원 화면              HR Admin 화면         │
│  - 로그인               - 응답 목록 조회      │
│  - 공지사항             - ABSA 분석 실행      │
│  - 온보딩 프로그램      - 이메일 초안 확인    │
│  - 설문 작성/제출       - 이미지 삭제 관리    │
└──────────────┬──────────────────────────────┘
               │ Supabase JS Client
┌──────────────▼──────────────────────────────┐
│  Supabase                                    │
│  ┌─────────────┐  ┌────────────────────────┐│
│  │  PostgreSQL  │  │   Edge Functions       ││
│  │  (스키마 참조)│  │   - analyze (ABSA)    ││
│  │             │  │   - generate-email     ││
│  └─────────────┘  └────────────┬───────────┘│
│  ┌─────────────┐               │            │
│  │  Storage    │               │            │
│  │  - 공지 PDF │               │            │
│  │  - 온보딩   │               │            │
│  │    이미지   │               │            │
│  └─────────────┘               │            │
└───────────────────────────────┬┴────────────┘
                                │
                    ┌───────────▼──────────┐
                    │  Claude API (Sonnet)  │
                    │  (API 키 Edge Fn에만) │
                    └──────────────────────┘
```

---

## 4. 데이터베이스 스키마

### users
```sql
id                uuid PRIMARY KEY  -- Supabase Auth 연동
email             text UNIQUE NOT NULL
name              text NOT NULL
employee_type     text CHECK (employee_type IN ('신입', '경력'))
hire_date         date
department        text
position          text
role              text DEFAULT 'employee' CHECK (role IN ('employee', 'hr_admin'))
mentor_id         uuid REFERENCES users(id)
mentor_email      text
team_leader_id    uuid REFERENCES users(id)
team_leader_email text
period_1_start    date
period_1_end      date
period_2_start    date  -- 신입만
period_2_end      date  -- 신입만
period_3_start    date  -- 신입만
period_3_end      date  -- 신입만
```

### announcements
```sql
id           uuid PRIMARY KEY
title        text NOT NULL
content      text NOT NULL
author       text NOT NULL
is_pinned    boolean DEFAULT false
published_at timestamptz DEFAULT now()
pdf_url      text  -- Supabase Storage 경로
```

### onboarding_submissions
```sql
id           uuid PRIMARY KEY
user_id      uuid REFERENCES users(id)
program_id   int CHECK (program_id BETWEEN 1 AND 6)
image_url    text  -- Supabase Storage 경로
submitted_at timestamptz DEFAULT now()
status       text DEFAULT 'pending' CHECK (status IN ('pending', 'approved'))
```

> **이미지 관리 정책:** 교육 기간 종료 후 Admin이 직접 삭제.
> - Admin 화면에서 기수/사원별 이미지 일괄 삭제 기능 제공
> - 삭제 시 Supabase Storage 파일 + `onboarding_submissions` 레코드 동시 삭제
> - 삭제 전 확인 다이얼로그 필수 (되돌릴 수 없음)

### survey_rounds
```sql
id           uuid PRIMARY KEY
round_number int CHECK (round_number BETWEEN 1 AND 3)
target_type  text CHECK (target_type IN ('신입', '경력', 'all'))
title        text NOT NULL
open_date    date
close_date   date
```

### survey_responses
```sql
id           uuid PRIMARY KEY
user_id      uuid REFERENCES users(id)
round_id     uuid REFERENCES survey_rounds(id)
submitted_at timestamptz DEFAULT now()
subjective_1 text  -- 주관식 1번
subjective_2 text  -- 주관식 2번
-- 객관식 항목은 세션 3 시작 전 설문 문항 PDF 확인 후 컬럼 추가
```

### analysis_results
```sql
id          uuid PRIMARY KEY
response_id uuid REFERENCES survey_responses(id)
analyzed_at timestamptz DEFAULT now()
aspects     jsonb  -- [{aspect, sentiment, quote, score}, ...]
raw_result  text   -- Claude 원문 응답
```

### email_drafts
```sql
id             uuid PRIMARY KEY
response_id    uuid REFERENCES survey_responses(id)
recipient_type text CHECK (recipient_type IN ('mentor', 'team_leader'))
subject        text
body           text
created_at     timestamptz DEFAULT now()
```

---

## 5. RLS (Row Level Security) 정책

| 테이블 | 직원 | HR Admin |
|--------|------|----------|
| users | 본인 읽기 | 전체 읽기/쓰기 |
| announcements | 읽기 | 읽기/쓰기 |
| onboarding_submissions | 본인 읽기/쓰기 | 전체 읽기/삭제 |
| survey_rounds | 읽기 | 읽기/쓰기 |
| survey_responses | 본인 읽기/쓰기 | 전체 읽기 |
| analysis_results | 접근 불가 | 전체 읽기/쓰기 |
| email_drafts | 접근 불가 | 전체 읽기/쓰기 |

---

## 6. Supabase Edge Functions

### `analyze` — ABSA 분석
- **호출자:** HR Admin
- **입력:** `response_id`
- **처리:** DB에서 주관식 응답 조회 → Claude 호출 → 결과 `analysis_results`에 저장
- **출력:** `aspects` JSON 배열

**Claude 프롬프트:**
```
다음 신입사원의 주관식 설문 응답을 분석하여,
언급된 속성(aspect)과 해당 감성(긍정/부정/중립)을 추출하세요.

응답1: {subjective_1}
응답2: {subjective_2}

반드시 아래 JSON 형식으로만 반환하세요:
[
  {
    "aspect": "속성명",
    "sentiment": "긍정" | "부정" | "중립",
    "quote": "관련 원문 발췌",
    "score": 0.0 ~ 1.0
  }
]
```

### `generate-email` — 이메일 초안 생성
- **호출자:** HR Admin (ABSA 검토 후)
- **입력:** `analysis_result_id`, `recipient_type` ('mentor'|'team_leader')
- **처리:** 분석 결과 조회 → Claude 호출 → 초안 `email_drafts`에 저장
- **출력:** 이메일 제목, 본문

**Claude 프롬프트 핵심 지침:**
```
아래 분석 결과를 바탕으로 {recipient_type}에게 보내는 이메일 초안을 작성하세요.
발신자: 인사기획팀 박상혁 선임

[필수 제약]
- 설문, 분석, 응답, 피드백 등의 단어를 절대 사용하지 마세요
- HR이 온보딩 모범 사례로서 정기적으로 보내는 자연스러운 제안처럼 작성하세요
- 신입사원이 해당 내용을 언급했다는 인상을 주어서는 안 됩니다
- 구체적인 활동(커피, 산책, 점심 등)을 제안하는 형식으로 작성하세요

분석 결과: {aspects_json}
신입사원 이름: {employee_name}
수신자 이름: {recipient_name}
```

---

## 7. 화면 구성

### 직원 화면 (기존 + 신규)
- 로그인 (Supabase Auth)
- 메인 메뉴 (기존 유지)
- 공지사항 (DB 연동)
- 온보딩 프로그램 (Supabase Storage 연동)
- **설문조사 (신규)**
  - 회차 목록 (본인 해당 회차만 표시)
  - 설문 작성 폼 (객관식 + 주관식 2문항)
  - 제출 완료 화면

### HR Admin 화면 `/admin` (신규)
- 응답 목록 (직원별, 회차별 필터)
- 개별 응답 상세
  - 주관식 원문
  - [ABSA 분석 실행] 버튼
  - 분석 결과 카드 (감성 수정 가능)
  - [이메일 초안 생성] 버튼
- 이메일 초안 (멘토용 / 팀장용, 복사 버튼 제공)
- **온보딩 이미지 관리**
  - 기수/사원별 이미지 목록 조회
  - 일괄 삭제 (교육 기간 종료 후)
  - 삭제 전 확인 다이얼로그 (복구 불가)

---

## 8. 이메일 예시

### 멘토용
```
제목: [온보딩 TIP] 이번 주 {이름} 사원과 함께해보면 어떨까요?

안녕하세요 {멘토명} 님,

온보딩 기간 동안 신규 입사자들이 가장 빠르게 적응하는 방법 중 하나는
업무 환경에 대한 작은 궁금증들을 편하게 해소하는 것이라고 합니다.

이번 주, {이름} 사원과 커피 한 잔 하시면서
우리 팀의 업무 흐름이나 자료·문서가 어디에 있는지
자연스럽게 알려주시는 시간을 가져보시는 건 어떨까요?

작은 시간이 큰 도움이 됩니다.

감사합니다.
인사기획팀 박상혁 선임 드림
```

*(이메일 본문은 ABSA 분석 결과에 따라 Claude가 자동 맞춤 생성)*

---

## 9. 구현 세션 계획

| 세션 | 내용 |
|------|------|
| 세션 1 | Supabase 프로젝트 설정 + Auth 연동 (CSV 로그인 교체) |
| 세션 2 | 기존 기능 DB 연동 (공지사항, 온보딩 프로그램 + Storage) |
| 세션 3 | 설문조사 직원 화면 (**시작 전 설문 문항 PDF 요청**) |
| 세션 4 | Edge Functions (ABSA + 이메일 생성) |
| 세션 5 | Admin 화면 (응답 조회 + 이미지 삭제 관리) + Vercel 배포 |

---

## 10. 미결 사항

- [ ] 설문 문항 PDF — 세션 3 시작 시 박상혁 선임 공유 예정
- [ ] Supabase 프로젝트 생성 — 박상혁 선임 직접 수행
- [ ] Claude API 키 발급 및 Edge Function 환경변수 등록
