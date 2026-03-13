import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 객관식 문항 키 (scale 타입)
const SCALE_KEYS = ['q1_1','q1_2','q1_3','q1_4','q2_1','q2_2','q2_3','q2_4','q3_1','q3_2','q3_3','q3_4','q4_1','q4_2','q4_3','q4_4']

const PART_LABELS: Record<string, string> = {
  part1: 'Part 1. OJT 준비 및 멘토링 태도',
  part2: 'Part 2. 업무 지식 및 기술 전수',
  part3: 'Part 3. 실무 지도 및 피드백',
  part4: 'Part 4. 조직 적응 지원 및 소통',
}

function calcPartAvg(row: Record<string, number>, prefix: string): number {
  const keys = ['1','2','3','4'].map(n => `${prefix}_${n}`)
  const vals = keys.map(k => row[k]).filter(v => typeof v === 'number')
  if (vals.length === 0) return 0
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100
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
    const { user_id } = await req.json()
    if (!user_id || typeof user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'user_id 필요 (문자열)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. 이미 분석된 경우 기존 결과 반환
    const { data: existing } = await supabase
      .from('objective_analyses')
      .select('id, chart_data, summary')
      .eq('user_id', user_id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ chart_data: existing.chart_data, summary: existing.summary, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. 3개 차수 객관식 데이터 조회
    const { data: rounds, error: roundError } = await supabase
      .from('survey_responses')
      .select(`id, round_number, ${SCALE_KEYS.join(', ')}`)
      .eq('user_id', user_id)
      .in('round_number', [1, 2, 3])
      .order('round_number', { ascending: true })

    if (roundError || !rounds) {
      return new Response(JSON.stringify({ error: '설문 데이터 조회 실패' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (rounds.length < 3) {
      return new Response(JSON.stringify({ error: '3차 설문이 모두 완료되지 않았습니다.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 5. 차트 데이터 계산 (파트별 평균)
    const chart_data = rounds.map(row => ({
      round: `${row.round_number}차`,
      part1: calcPartAvg(row as Record<string, number>, 'q1'),
      part2: calcPartAvg(row as Record<string, number>, 'q2'),
      part3: calcPartAvg(row as Record<string, number>, 'q3'),
      part4: calcPartAvg(row as Record<string, number>, 'q4'),
    }))

    // 6. Claude 총평 프롬프트 작성
    const dataText = chart_data.map(d =>
      `[${d.round}]\n${Object.entries(PART_LABELS).map(([k, label]) => `  ${label}: ${(d as Record<string, unknown>)[k]}점`).join('\n')}`
    ).join('\n\n')

    const prompt = `아래는 신입사원의 온보딩 설문 객관식 결과입니다 (5점 척도, 소수점 2자리).

${dataText}

위 3회차 시계열 데이터를 바탕으로 HR 담당자를 위한 한국어 총평을 작성해주세요.
반드시 아래 3개 소제목 구조로 작성하세요. 각 항목은 2~3문장 내외로 간결하게 작성합니다.

**전반적 추이 및 성장 패턴**
(3회차에 걸친 점수 변화와 전반적인 흐름 분석)

**강점 영역 및 주목할 점**
(가장 높은 점수 영역, 지속적으로 높은 영역 등)

**HR 팀 관찰 포인트**
(낮거나 하락하는 영역, 주의가 필요한 부분 등)`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const claudeData = await claudeRes.json()
    if (!claudeRes.ok) {
      throw new Error(`Claude API 오류 (${claudeRes.status}): ${claudeData.error?.message ?? JSON.stringify(claudeData)}`)
    }
    const summary = claudeData.content[0].text

    // 7. objective_analyses 저장
    const { error: insertError } = await supabase
      .from('objective_analyses')
      .insert({ user_id, chart_data, summary })

    if (insertError && insertError.code !== '23505') {
      throw insertError
    }

    return new Response(
      JSON.stringify({ chart_data, summary }),
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
