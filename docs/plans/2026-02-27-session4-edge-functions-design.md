# 세션 4: Edge Functions 설계 (ABSA + 이메일 초안)

**작성일:** 2026-02-27
**세션:** 4
**범위:** Supabase Edge Functions 2개 구현 (analyze, generate-email)

---

## 1. 요구사항 확정

| 항목 | 결정 |
|------|------|
| ABSA 분석 대상 주관식 | 전체 7개 (q1_5~q4_5, q5_1~q5_3) |
| Claude 호출 방식 | 단일 호출 (7개 한 번에) |
| 배포 방식 | Supabase 대시보드 Via Editor |
| 재분석 방지 | 이미 분석된 response_id는 오류 반환 |
| 데이터 내보내기 | Supabase Table Editor CSV 내보내기 활용 |

---

## 2. 상태 흐름

```
설문 제출됨
    ↓ HR Admin이 대상자 선택
    ↓ [분석 실행] → Edge Function: analyze
분석 완료 (analysis_results 저장)
    ↓ [이메일 생성] → Edge Function: generate-email
메일 초안 완료 (email_drafts 저장, 멘토용 + 팀장용)
    ↓ HR Admin이 초안 확인 후 직접 발송
```

- 분석 완료 후 재분석 불가 (오류 반환)
- 메일 초안 완료 후 재생성 불가 (오류 반환)

---

## 3. Edge Function: analyze

**입력:** `{ response_id: string }`

**처리 순서:**
1. `auth.uid()` 로 HR Admin 권한 확인 (role = 'hr_admin')
2. `analysis_results`에 이미 해당 `response_id` 존재 여부 확인 → 있으면 오류 반환
3. `survey_responses`에서 q1_5~q4_5, q5_1~q5_3 조회
4. Claude API 단일 호출 (claude-sonnet-4-6)
5. JSON 파싱 후 `analysis_results` 테이블에 저장

**출력:** `{ analysis_result_id, aspects }`

**Claude 프롬프트:**
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
[{
  "aspect": "실제 개념명",
  "sentiment": "긍정|약간긍정|중립|약간부정|부정",
  "sentiment_score": -1.0~1.0,
  "confidence": "높음|보통|낮음",
  "quote": "원문 발췌",
  "source_field": "q1_5"
}]
```

---

## 4. Edge Function: generate-email

**입력:** `{ analysis_result_id: string, recipient_type: 'mentor' | 'team_leader' }`

**처리 순서:**
1. HR Admin 권한 확인
2. `email_drafts`에 동일 `analysis_result_id` + `recipient_type` 존재 여부 확인 → 있으면 오류 반환
3. `analysis_results`에서 aspects 조회
4. `survey_responses` → `users` 조인으로 직원명, 멘토명, 팀장명 조회
5. Claude API 호출
6. 제목/본문 파싱 후 `email_drafts` 저장

**출력:** `{ email_draft_id, subject, body }`

**Claude 프롬프트:**
```
[분석 결과 입력]
{absa_json_result}

위 분석 결과를 바탕으로 아래 기준에 맞게 이메일을 작성하세요.
발신자: 인사기획팀 박상혁 선임
신입사원: {employee_name} / 수신자: {recipient_name}

[금지어 및 대체 표현]
"설문" → "정기 체크인", "확인 과정"
"피드백" → "의견", "제안 사항"
"분석 결과" → "최근 파악한 내용"
"응답" → 사용 금지

[멘토용]
- 톤: 동료 간 따뜻한 제안
- 포함: 긍정 항목 강점 언급 + 보완 제안 1가지 완곡 표현
- 분량: 3~4문단

[팀장용]
- 톤: 업무 보고 형식의 간결한 요약
- 포함: 전체 감성 분포 요약 + 조치 필요 항목
- 분량: 2~3문단

반드시 아래 JSON 형식으로만 반환하세요:
{"subject": "이메일 제목", "body": "이메일 본문"}
```

---

## 5. DB 변경 없음

기존 `analysis_results`, `email_drafts` 테이블 스키마 그대로 사용.

---

## 6. 배포 방식

Supabase 대시보드 → Edge Functions → Via Editor
- `analyze` 함수 생성 및 배포
- `generate-email` 함수 생성 및 배포
- 환경변수 `ANTHROPIC_API_KEY` 이미 등록 완료
