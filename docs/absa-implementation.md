# ABSA 구현 상세 문서

**작성일:** 2026-03-11
**관련 파일:**
- `supabase/functions/analyze/index.ts` — 핵심 분석 로직
- `supabase/functions/generate-email/index.ts` — 이메일 초안 생성
- `src/pages/AdminSurvey.js` — 관리자 UI
- `src/lib/edgeFunctions.js` — 프론트엔드 호출 래퍼

---

## 1. ABSA란?

**ABSA (Aspect-Based Sentiment Analysis, 속성 기반 감성 분석)**는 텍스트에서 단순히 "긍정/부정"을 판별하는 것이 아니라, **어떤 측면(Aspect)에 대해 어떤 감성을 가지는지**를 세분화하여 추출하는 NLP 기법이다.

| 일반 감성분석 | ABSA |
|---|---|
| "이 텍스트는 긍정입니다." | "멘토의 소통 빈도 → 부정, 업무 환경 → 긍정, 팀 분위기 → 중립" |

### 전통적 ABSA vs 이 프로젝트의 방식

| 구분 | 전통적 ABSA | 이 프로젝트 (LLM 기반) |
|---|---|---|
| 모델 | Fine-tuned BERT, LSTM 등 | Claude Sonnet (claude-sonnet-4-6) |
| Aspect 목록 | 사전 정의된 고정 목록 | 텍스트에서 동적 추출 |
| 학습 데이터 | 도메인 레이블 데이터 필요 | 불필요 (Zero-shot) |
| 정확도 보장 | Calibrated (수치 신뢰 가능) | 프롬프트 품질에 의존 |
| 도입 비용 | 높음 | 낮음 |

---

## 2. 전체 파이프라인

```
[신규입사자]               [HR Admin]                [Claude API]
    │                         │                           │
    │ 설문 제출                │                           │
    │──────────────────────► DB (survey_responses)        │
    │                         │                           │
    │                         │ "분석 실행" 버튼 클릭      │
    │                         │──► Edge Function: analyze  │
    │                         │         │                  │
    │                         │         │ 주관식 7필드 조회 │
    │                         │         │──────────────────►│
    │                         │         │◄──────────────────│
    │                         │         │ aspects JSON 반환 │
    │                         │         │                   │
    │                         │         │ analysis_results 저장
    │                         │◄────────│                   │
    │                         │                            │
    │                         │ ABSA 결과 확인 (팝업)      │
    │                         │                            │
    │                         │ "멘토 이메일" 버튼 클릭    │
    │                         │──► Edge Function: generate-email
    │                         │         │──────────────────►│
    │                         │         │◄──────────────────│
    │                         │         │ 이메일 초안 반환  │
    │                         │         │                   │
    │                         │         │ email_drafts 저장 │
    │                         │◄────────│                   │
    │                         │ 이메일 초안 확인 후        │
    │                         │ 멘토/팀장에게 직접 발송    │
```

---

## 3. 분석 대상 필드

설문 응답 테이블(`survey_responses`)의 주관식 7개 컬럼을 분석한다.

| 컬럼 | 설문 파트 | 내용 |
|---|---|---|
| `q1_5` | Part 1 | 멘토링 태도에 대한 자유 서술 |
| `q2_5` | Part 2 | 업무 지식 전수에 대한 자유 서술 |
| `q3_5` | Part 3 | 실무 피드백에 대한 자유 서술 |
| `q4_5` | Part 4 | 조직 적응 지원에 대한 자유 서술 |
| `q5_1` | Part 5 | 멘토/팀의 강점 (유지할 점) |
| `q5_2` | Part 5 | 개선 제안 |
| `q5_3` | Part 5 | 자유 의견 |

> **처리 규칙:** 응답이 없거나 `-`, `없음`인 항목은 분석에서 제외.

---

## 4. Claude 프롬프트 설계

```
아래는 신입사원의 온보딩 설문 주관식 응답입니다.
각 파트는 응답의 맥락 구분용입니다.
속성명은 파트명을 그대로 쓰지 말고, 텍스트에서 드러난 실제 개념으로 추출하세요.
응답이 없거나 '-', '없음'인 항목은 분석에서 제외하세요.

[멘토링 태도] {q1_5}
[업무 지식 전수] {q2_5}
[실무 피드백] {q3_5}
[조직 적응 지원] {q4_5}
[강점/유지] {q5_1}
[개선 제안] {q5_2}
[자유 의견] {q5_3}

반드시 아래 JSON 형식으로만 반환하세요:
[{"aspect":"실제 개념명","sentiment":"긍정|약간긍정|중립|약간부정|부정","sentiment_score":-1.0,"confidence":"높음|보통|낮음","quote":"원문 발췌","source_field":"q1_5"}]
```

### 핵심 설계 결정

**"파트명을 그대로 쓰지 말고 실제 개념으로 추출하세요"**
단순히 `[멘토링 태도] → aspect: "멘토링 태도"` 라는 기계적 매핑을 방지한다.
→ 실제 출력 예: `"멘토의 응답 속도"`, `"업무 매뉴얼 접근성"`, `"팀 회식 분위기"` 등

**5단계 감성 레이블**
이진(긍정/부정) 분류보다 세밀한 약한 긍정/약한 부정 구분으로 HR이 개입 수위를 판단할 수 있게 한다.

---

## 5. 출력 스키마 (`aspects` 배열)

`analysis_results.aspects` 컬럼에 JSONB로 저장된다.

```json
[
  {
    "aspect": "멘토의 피드백 빈도",
    "sentiment": "약간부정",
    "sentiment_score": -0.45,
    "confidence": "보통",
    "quote": "가끔 바쁘셔서 질문하기 어려울 때가 있었어요",
    "source_field": "q3_5"
  },
  {
    "aspect": "팀 분위기",
    "sentiment": "긍정",
    "sentiment_score": 0.82,
    "confidence": "높음",
    "quote": "팀원들이 모두 친절하게 대해주셔서 적응이 빨랐습니다",
    "source_field": "q4_5"
  }
]
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `aspect` | string | 텍스트에서 추출된 실제 개념 |
| `sentiment` | enum | `긍정` / `약간긍정` / `중립` / `약간부정` / `부정` |
| `sentiment_score` | float | -1.0 (매우 부정) ~ +1.0 (매우 긍정) |
| `confidence` | enum | `높음` / `보통` / `낮음` — Claude 자체 판단 |
| `quote` | string | 근거가 된 원문 발췌 |
| `source_field` | string | 출처 필드명 (`q1_5` ~ `q5_3`) |

---

## 6. Edge Function 처리 흐름 (analyze/index.ts)

```
요청 수신
  │
  ▼
① JWT 인증 → supabase.auth.getUser(token)
  │
  ▼
② HR Admin 권한 확인 → users.role === 'hr_admin'
  │
  ▼
③ 중복 분석 방지 → analysis_results에 response_id 존재 여부 확인 (409 반환)
  │
  ▼
④ 주관식 7필드 조회 → survey_responses WHERE id = response_id
  │
  ▼
⑤ Claude API 호출 (claude-sonnet-4-6, max_tokens: 2048)
  │
  ▼
⑥ 응답에서 JSON 배열 파싱 → /\[[\s\S]*\]/ 정규식
  │
  ▼
⑦ analysis_results INSERT (aspects JSONB, raw_result 원문)
  │
  ▼
⑧ {analysis_result_id, aspects} 반환
```

> **API 키 보안:** `ANTHROPIC_API_KEY`는 Supabase Edge Function 환경변수에만 존재.
> 프론트엔드(React)에는 절대 노출되지 않는다.

---

## 7. 관리자 화면 (AdminSurvey.js)

### 분석 결과 팝업 컬럼 구성
| 컬럼 | 표시 내용 |
|---|---|
| 항목 | `aspect` |
| 감성 | `sentiment` (배지 색상 코딩) |
| 점수 | `sentiment_score` (소수점 2자리) |
| 신뢰도 | `confidence` |
| 원문 발췌 | `quote` |

### 상태 흐름
```
[분석 실행] → 로딩 중... → 완료 (확인) 클릭 → ABSA 결과 팝업
                                ↓
                         [멘토] / [팀장] 버튼 활성화
                                ↓
                         이메일 초안 생성 → 완료 (확인) 클릭 → 이메일 초안 팝업
```

---

## 8. 이메일 생성 연계 (generate-email)

ABSA 결과(`aspects`)를 바탕으로 Claude가 멘토/팀장용 이메일 초안을 생성한다.

**핵심 제약 조건 (프롬프트에 명시):**
- `설문`, `분석`, `피드백`, `응답` 등 단어 사용 금지
- HR이 온보딩 모범 사례로서 정기적으로 보내는 자연스러운 제안처럼 작성
- 신입사원이 해당 내용을 언급했다는 인상을 주어선 안 됨
- 구체적인 활동(커피, 산책, 점심 등) 제안 형식

→ 목적: 신입사원의 부정적 응답이 있어도 멘토/팀장이 방어적으로 반응하지 않도록, 자연스러운 1on1 제안으로 포장

---

## 9. 한계 및 주의사항

| 항목 | 내용 |
|---|---|
| **Confidence 수치** | Claude가 자체 판단하는 값 → 통계적 calibration 없음 |
| **sentiment_score** | Claude가 추론하는 값 → 일관성 보장 불가 |
| **Aspect 일관성** | 동일한 텍스트도 호출마다 다른 aspect명 나올 수 있음 |
| **중복 분석 방지** | 동일 response_id로 재분석 불가 (409 반환으로 차단) |
| **언어 제한** | 한국어 주관식에 최적화된 프롬프트, 영문 혼용 시 품질 저하 가능 |

---

## 10. 관련 DB 테이블

```sql
-- 분석 결과 저장
analysis_results (
  id           uuid PRIMARY KEY,
  response_id  uuid REFERENCES survey_responses(id) UNIQUE,
  analyzed_at  timestamptz DEFAULT now(),
  aspects      jsonb,   -- 위 스키마 참조
  raw_result   text     -- Claude 원문 응답 (디버깅용)
)

-- 이메일 초안 저장
email_drafts (
  id             uuid PRIMARY KEY,
  response_id    uuid REFERENCES survey_responses(id),
  recipient_type text CHECK (recipient_type IN ('mentor', 'team_leader')),
  subject        text,
  body           text,
  created_at     timestamptz DEFAULT now()
)
```
