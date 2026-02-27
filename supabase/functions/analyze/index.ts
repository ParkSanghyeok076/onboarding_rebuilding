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
