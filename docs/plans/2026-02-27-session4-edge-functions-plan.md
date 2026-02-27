# 세션 4: Edge Functions 구현 계획 (ABSA + 이메일 초안)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 설문 주관식 응답을 ABSA 분석하고 이메일 초안을 생성하는 Supabase Edge Function 2개 구현

**Architecture:** 코드를 로컬 `supabase/functions/` 에 저장(git 추적용)하고, Supabase 대시보드 Via Editor에서 동일 코드를 붙여넣어 배포한다. 두 함수 모두 HR Admin 권한 검사 → 중복 처리 방지 → Claude API 호출 → DB 저장 순으로 동작한다.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), Claude API (claude-sonnet-4-6), @supabase/supabase-js

---

## Task 1: `analyze` Edge Function — 로컬 파일 작성 + 배포

**Files:**
- Create: `supabase/functions/analyze/index.ts`

### Step 1: 로컬 파일 생성

`supabase/functions/analyze/index.ts` 파일을 생성하고 아래 내용 입력:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. HR Admin 권한 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'hr_admin') {
      return new Response(JSON.stringify({ error: 'HR Admin 권한 필요' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. 요청 파라미터
    const { response_id } = await req.json()
    if (!response_id) {
      return new Response(JSON.stringify({ error: 'response_id 필요' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. 이미 분석된 경우 차단
    const { data: existing } = await supabase
      .from('analysis_results')
      .select('id')
      .eq('response_id', response_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: '이미 분석된 응답입니다.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. 주관식 응답 조회
    const { data: response, error: responseError } = await supabase
      .from('survey_responses')
      .select('q1_5, q2_5, q3_5, q4_5, q5_1, q5_2, q5_3')
      .eq('id', response_id)
      .single()

    if (responseError || !response) {
      return new Response(JSON.stringify({ error: '응답 데이터를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. Claude API 호출
    const prompt = `아래는 신입사원의 온보딩 설문 주관식 응답입니다.
각 파트는 응답의 맥락 구분용입니다.
속성명은 파트명을 그대로 쓰지 말고, 텍스트에서 드러난 실제 개념으로 추출하세요.
응답이 없거나 '-', '없음'인 항목은 분석에서 제외하세요.

[멘토링 태도] ${response.q1_5 || '없음'}
[업무 지식 전수] ${response.q2_5 || '없음'}
[실무 피드백] ${response.q3_5 || '없음'}
[조직 적응 지원] ${response.q4_5 || '없음'}
[강점/유지] ${response.q5_1 || '없음'}
[개선 제안] ${response.q5_2 || '없음'}
[자유 의견] ${response.q5_3 || '없음'}

반드시 아래 JSON 형식으로만 반환하세요:
[{"aspect":"실제 개념명","sentiment":"긍정|약간긍정|중립|약간부정|부정","sentiment_score":-1.0,"confidence":"높음|보통|낮음","quote":"원문 발췌","source_field":"q1_5"}]`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const claudeData = await claudeRes.json()
    const rawResult = claudeData.content[0].text

    const jsonMatch = rawResult.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다.')
    const aspects = JSON.parse(jsonMatch[0])

    // 6. analysis_results 저장
    const { data: saved, error: insertError } = await supabase
      .from('analysis_results')
      .insert({ response_id, aspects, raw_result: rawResult })
      .select('id')
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ analysis_result_id: saved.id, aspects }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 2: Supabase Editor에서 배포

1. Supabase 대시보드 → Edge Functions → **Deploy a new function** 클릭
2. **Via Editor** 선택
3. Function name: `analyze`
4. 위 코드 전체 붙여넣기
5. **Deploy** 클릭

Expected: "Function deployed successfully" 메시지

### Step 3: 커밋

```bash
git add supabase/functions/analyze/index.ts
git commit -m "feat: analyze Edge Function 구현 (ABSA 분석)"
```

---

## Task 2: `generate-email` Edge Function — 로컬 파일 작성 + 배포

**Files:**
- Create: `supabase/functions/generate-email/index.ts`

### Step 1: 로컬 파일 생성

`supabase/functions/generate-email/index.ts` 파일을 생성하고 아래 내용 입력:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. HR Admin 권한 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '인증 실패' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'hr_admin') {
      return new Response(JSON.stringify({ error: 'HR Admin 권한 필요' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. 요청 파라미터
    const { analysis_result_id, recipient_type } = await req.json()
    if (!analysis_result_id || !recipient_type) {
      return new Response(JSON.stringify({ error: 'analysis_result_id, recipient_type 필요' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. 분석 결과 조회
    const { data: analysisResult, error: analysisError } = await supabase
      .from('analysis_results')
      .select('aspects, response_id')
      .eq('id', analysis_result_id)
      .single()

    if (analysisError || !analysisResult) {
      return new Response(JSON.stringify({ error: '분석 결과를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. 이미 초안이 있는 경우 차단
    const { data: existingDraft } = await supabase
      .from('email_drafts')
      .select('id')
      .eq('response_id', analysisResult.response_id)
      .eq('recipient_type', recipient_type)
      .maybeSingle()

    if (existingDraft) {
      return new Response(JSON.stringify({ error: '이미 생성된 이메일 초안입니다.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. 직원/멘토/팀장 정보 조회
    const { data: surveyResponse } = await supabase
      .from('survey_responses')
      .select('user_id')
      .eq('id', analysisResult.response_id)
      .single()

    const { data: employee } = await supabase
      .from('users')
      .select('name, mentor_name, team_leader_name')
      .eq('id', surveyResponse.user_id)
      .single()

    const recipientName = recipient_type === 'mentor'
      ? employee.mentor_name
      : employee.team_leader_name

    const toneGuide = recipient_type === 'mentor'
      ? `[멘토용]\n- 톤: 동료 간 따뜻한 제안\n- 포함: 긍정 항목 강점 언급 + 보완 제안 1가지 완곡 표현\n- 분량: 3~4문단`
      : `[팀장용]\n- 톤: 업무 보고 형식의 간결한 요약\n- 포함: 전체 감성 분포 요약 + 조치 필요 항목\n- 분량: 2~3문단`

    // 6. Claude API 호출
    const prompt = `[분석 결과 입력]
${JSON.stringify(analysisResult.aspects, null, 2)}

위 분석 결과를 바탕으로 아래 기준에 맞게 이메일을 작성하세요.
발신자: 인사기획팀 박상혁 선임
신입사원: ${employee.name} / 수신자: ${recipientName}

[금지어 및 대체 표현]
"설문" → "정기 체크인", "확인 과정"
"피드백" → "의견", "제안 사항"
"분석 결과" → "최근 파악한 내용"
"응답" → 사용 금지

${toneGuide}

반드시 아래 JSON 형식으로만 반환하세요:
{"subject": "이메일 제목", "body": "이메일 본문"}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const claudeData = await claudeRes.json()
    const rawResult = claudeData.content[0].text

    const jsonMatch = rawResult.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다.')
    const emailData = JSON.parse(jsonMatch[0])

    // 7. email_drafts 저장
    const { data: saved, error: insertError } = await supabase
      .from('email_drafts')
      .insert({
        response_id: analysisResult.response_id,
        recipient_type,
        subject: emailData.subject,
        body: emailData.body,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ email_draft_id: saved.id, subject: emailData.subject, body: emailData.body }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 2: Supabase Editor에서 배포

1. Supabase 대시보드 → Edge Functions → **Deploy a new function** 클릭
2. **Via Editor** 선택
3. Function name: `generate-email`
4. 위 코드 전체 붙여넣기
5. **Deploy** 클릭

Expected: "Function deployed successfully" 메시지

### Step 3: 커밋

```bash
git add supabase/functions/generate-email/index.ts
git commit -m "feat: generate-email Edge Function 구현 (이메일 초안 생성)"
```

---

## Task 3: React에서 Edge Function 호출 유틸 추가

**Files:**
- Create: `src/lib/edgeFunctions.js`

### Step 1: 파일 생성

```javascript
import { supabase } from './supabase';

export async function runAnalyze(responseId) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await supabase.functions.invoke('analyze', {
    body: { response_id: responseId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function runGenerateEmail(analysisResultId, recipientType) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await supabase.functions.invoke('generate-email', {
    body: {
      analysis_result_id: analysisResultId,
      recipient_type: recipientType,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}
```

### Step 2: 커밋

```bash
git add src/lib/edgeFunctions.js
git commit -m "feat: Edge Function 호출 유틸 추가"
```

---

## Task 4: GitHub Push + 수동 테스트

### Step 1: GitHub push

```bash
git push origin main
```

### Step 2: 수동 테스트 (Supabase 대시보드 → Edge Functions → 함수 선택 → Test)

**analyze 테스트:**
- `analyze` 함수 선택 → **Test** 탭
- Body:
```json
{ "response_id": "실제-survey-response-uuid" }
```
- Authorization 헤더: HR Admin 계정의 Bearer 토큰
- Expected: `{ "analysis_result_id": "...", "aspects": [...] }`

**generate-email 테스트:**
- `generate-email` 함수 선택 → **Test** 탭
- Body:
```json
{
  "analysis_result_id": "위에서-받은-uuid",
  "recipient_type": "mentor"
}
```
- Expected: `{ "email_draft_id": "...", "subject": "...", "body": "..." }`

**중복 방지 테스트:**
- 동일 `response_id`로 `analyze` 재호출
- Expected: `{ "error": "이미 분석된 응답입니다." }` (status 409)
