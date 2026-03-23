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

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return new Response(JSON.stringify({ error: '사용자 프로필 조회 실패' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (userProfile?.role !== 'hr_admin') {
      return new Response(JSON.stringify({ error: 'HR Admin 권한 필요' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. 요청 파라미터
    const { response_id } = await req.json()
    if (!response_id || typeof response_id !== 'string') {
      return new Response(JSON.stringify({ error: 'response_id 필요 (문자열)' }), {
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
    const prompt = `당신은 HRD/온보딩 경험 분석 전문가입니다. 당신의 작업은 신입사원의 온보딩/멘토링 관련 서술형 응답에서 독립적이고 실행 가능한 경험 요인(aspect)과 감성(sentiment)을 추출하는 것입니다.

[핵심 목표]
- 응답 내용을 과세분화하지 말고, 실제 개선 액션 단위의 aspect로 정리하십시오.
- 파트명(예: 멘토링 태도, 조직 적응 지원)을 aspect로 그대로 사용하지 마십시오.
- aspect는 가능한 한 가치중립적인 명사구로 작성하고, 긍정/부정 평가는 sentiment 필드에만 담으십시오.
- 응답이 없거나 유의미한 정보가 없으면 빈 배열 []을 반환하십시오.

[aspect 정의]
- aspect는 응답자가 평가하거나 경험한 "독립적 경험 요인"입니다.
- 좋은 aspect 예시:
  - 멘토의 헌신적 업무 안내
  - 피드백 신속성
  - 자율적 업무 시도 기회
  - 동료 네트워킹 지원
  - 비공식 소통 기회
  - 멘토링 예산 운용 유연성
  - 사무 비품 지원
- 나쁜 aspect 예시:
  - 멘토링 태도
  - 조직 적응 지원
  - 좋음
  - 부족함
  - 문제점
  - 아쉬움

[한국어 해석 원칙]
1. 생략된 주어/목적어는 문맥으로 복원하십시오.
2. "하지만 / 다만 / 근데 / 그런데" 뒤의 내용이 핵심 평가인 경우가 많으므로 주의하십시오.
3. "도움이 되는 것 같기는 하다", "좋기는 하다"는 유보적 긍정일 수 있습니다.
4. "좀 아쉽다", "아쉽지만", "부족한 것 같다"는 약한 부정일 수 있습니다.
5. "나쁘지 않다", "괜찮다"는 문맥에 따라 약간긍정 또는 중립일 수 있습니다.
6. "가이드를 너무 잘 주시는 게 문제"처럼 겉보기에는 칭찬 같아도 실제 핵심 불만을 파악하십시오.
7. 감정 표현이 약하더라도 개선 희망이 드러나면 약간부정 가능성을 검토하십시오.

[분리 규칙]
아래 조건 중 하나라도 충족하면 aspect를 분리하십시오.
1. 해결 주체가 다르다.
2. 서로 독립적인 개선 액션이 필요하다.
3. 동일 문장 안에 병렬로 다른 평가 대상이 언급된다.
4. 같은 field 안에서도 서로 다른 감성 극성이 드러난다.

[통합 규칙]
아래 조건이면 하나의 aspect로 통합하십시오.
1. 원인-결과 관계이다.
2. 동일 행동을 다른 각도에서 다시 표현한 것이다.
3. 같은 뿌리의 문제에서 나온 파생 효과이다.
4. 같은 field 안에서 동일 aspect가 반복되며 감성이 동일하다.

[중요 판단 예시]
- "시간을 내어 알려주셔서 빠르게 파악했다" -> "빠르게 파악했다"는 결과이므로 보통 하나로 통합
- "즉시 말하라고 해주셨고 바로 피드백을 주셨다" -> 같은 지원 행동 패턴이므로 보통 하나로 통합
- "개인적 대화는 거의 없고, 동료 소개도 받지 못했다" -> 해결 주체와 개선 액션이 다를 수 있으므로 분리 가능
- "멘토링비 이월이 안 되고, 비품도 부족하다" -> 서로 독립 이슈이므로 분리

[감성 분류 기준]
- 긍정: 명확한 만족, 칭찬, 효과 체감
- 약간긍정: 유보적 인정, 약한 호감, 제한적 만족
- 중립: 사실 서술, 판단 유보, 감정이 거의 없음
- 약간부정: 아쉬움, 완곡한 불만, 개선 희망
- 부정: 명시적 불만, 강한 문제 제기, 반복적 불편

[confidence 기준]
- 높음: 감성 및 aspect 근거가 원문에 직접적으로 명시됨
- 보통: 문맥 해석이 필요하지만 근거가 충분함
- 낮음: 해석 여지가 크고 근거가 약함

[출력 규칙]
1. 각 결과는 하나의 source_field에만 연결하십시오.
2. 같은 aspect가 다른 field에도 등장하면 field별로 각각 별도 row로 출력하십시오.
3. quote는 반드시 원문 그대로의 최소 근거 구절만 사용하십시오.
4. quote는 aspect와 sentiment 판단에 필요한 핵심 부분만 짧게 발췌하십시오.
5. aspect명에 "좋음", "불만", "부족", "문제", "아쉬움" 같은 감성 단어를 넣지 마십시오.
6. source_field는 반드시 q1_5 / q2_5 / q3_5 / q4_5 / q5_1 / q5_2 / q5_3 중 하나만 사용하십시오.
7. 응답이 "-", "없음", "모르겠음", 공란 등 유의미한 정보가 없으면 해당 field는 제외하십시오.
8. 최종 응답은 반드시 JSON 배열만 반환하십시오.
9. JSON 배열 외의 설명, 머리말, 마크다운, 코드블록은 절대 출력하지 마십시오.
10. sentiment_score 같은 숫자 필드는 출력하지 마십시오.

[출력 형식]
[
  {
    "source_field": "q1_5",
    "aspect": "실제 개념명",
    "sentiment": "긍정|약간긍정|중립|약간부정|부정",
    "confidence": "높음|보통|낮음",
    "quote": "원문 발췌",
    "rationale_short": "짧은 판단 근거 한 문장"
  }
]

[예시 1] 원인/결과는 통합
입력:
[업무 지식 전수] 멘토가 바쁜데도 매일 시간을 내어 알려주셔서 빠르게 일을 파악할 수 있었습니다.
출력:
[{"source_field":"q2_5","aspect":"멘토의 헌신적 업무 안내","sentiment":"긍정","confidence":"높음","quote":"바쁜데도 매일 시간을 내어 알려주셔서","rationale_short":"빠른 파악은 안내의 결과라 통합"}]

[예시 2] 동일 행동의 다른 표현은 통합
입력:
[실무 피드백] 어려운 게 있으면 바로 말하라고 해주셨고, 말씀드리면 피드백도 바로 주셔서 좋았습니다.
출력:
[{"source_field":"q3_5","aspect":"질문 수용성과 피드백 신속성","sentiment":"긍정","confidence":"높음","quote":"바로 말하라고 해주셨고, 말씀드리면 피드백도 바로 주셔서","rationale_short":"같은 지원 행동 패턴으로 통합"}]

[예시 3] 역설 표현도 핵심 불만 하나로
입력:
[실무 피드백] 가이드를 너무 잘 주시는 게 문제입니다. 제가 스스로 해볼 기회가 좀 더 많았으면 좋겠습니다.
출력:
[{"source_field":"q3_5","aspect":"자율적 업무 시도 기회","sentiment":"약간부정","confidence":"높음","quote":"제가 스스로 해볼 기회가 좀 더 많았으면 좋겠습니다","rationale_short":"칭찬형 표현이지만 핵심은 자율성 부족"}]

[예시 4] 해결 주체가 다르면 분리
입력:
[조직 적응 지원] 직무 외 개인적인 대화는 거의 없고, 주변 동료들도 따로 소개받지 못해서 좀 아쉬웠습니다.
출력:
[{"source_field":"q4_5","aspect":"멘토와의 비공식 소통","sentiment":"약간부정","confidence":"높음","quote":"직무 외 개인적인 대화는 거의 없고","rationale_short":"멘토와의 관계 이슈"},{"source_field":"q4_5","aspect":"동료 네트워킹 지원","sentiment":"약간부정","confidence":"높음","quote":"주변 동료들도 따로 소개받지 못해서","rationale_short":"조직 적응 지원 이슈"}]

[예시 5] 유보적 긍정 + 미충족 욕구 분리
입력:
[자유 의견] 멘토링 프로그램이 있어서 도움은 되는 것 같기는 합니다. 하지만 일 외적으로도 말씀을 많이 나눌 수 있으면 좋겠습니다.
출력:
[{"source_field":"q5_3","aspect":"멘토링 프로그램의 전반적 효용","sentiment":"약간긍정","confidence":"보통","quote":"도움은 되는 것 같기는 합니다","rationale_short":"유보적 표현이므로 약한 긍정"},{"source_field":"q5_3","aspect":"비공식 소통 기회","sentiment":"약간부정","confidence":"높음","quote":"일 외적으로도 말씀을 많이 나눌 수 있으면 좋겠습니다","rationale_short":"미충족 욕구가 직접 표현됨"}]

[실제 입력]
[멘토링 태도] ${response.q1_5 || '없음'}
[업무 지식 전수] ${response.q2_5 || '없음'}
[실무 피드백] ${response.q3_5 || '없음'}
[조직 적응 지원] ${response.q4_5 || '없음'}
[강점/유지] ${response.q5_1 || '없음'}
[개선 제안] ${response.q5_2 || '없음'}
[자유 의견] ${response.q5_3 || '없음'}`

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
    if (!claudeRes.ok) {
      throw new Error(`Claude API 오류 (${claudeRes.status}): ${claudeData.error?.message ?? JSON.stringify(claudeData)}`)
    }
    const rawResult = claudeData.content[0].text

    const jsonMatch = rawResult.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다. (응답이 잘렸거나 형식이 올바르지 않을 수 있습니다)')
    const aspects = JSON.parse(jsonMatch[0])

    // 6. analysis_results 저장
    const { data: saved, error: insertError } = await supabase
      .from('analysis_results')
      .insert({ response_id, aspects, raw_result: rawResult })
      .select('id')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: '이미 분석된 응답입니다.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw insertError
    }

    return new Response(
      JSON.stringify({ analysis_result_id: saved.id, aspects }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
