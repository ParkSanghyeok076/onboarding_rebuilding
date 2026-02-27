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
    const { analysis_result_id, recipient_type } = await req.json()
    if (!analysis_result_id || typeof analysis_result_id !== 'string') {
      return new Response(JSON.stringify({ error: 'analysis_result_id 필요 (문자열)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (recipient_type !== 'mentor' && recipient_type !== 'team_leader') {
      return new Response(JSON.stringify({ error: 'recipient_type은 mentor 또는 team_leader여야 합니다.' }), {
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
    const { data: surveyResponse, error: surveyError } = await supabase
      .from('survey_responses')
      .select('user_id')
      .eq('id', analysisResult.response_id)
      .single()

    if (surveyError || !surveyResponse) {
      return new Response(JSON.stringify({ error: '설문 응답 정보를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: employee, error: employeeError } = await supabase
      .from('users')
      .select('name, mentor_name, team_leader_name')
      .eq('id', surveyResponse.user_id)
      .single()

    if (employeeError || !employee) {
      return new Response(JSON.stringify({ error: '직원 정보를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientName = recipient_type === 'mentor'
      ? employee.mentor_name
      : employee.team_leader_name

    if (!recipientName) {
      return new Response(JSON.stringify({ error: `${recipient_type === 'mentor' ? '멘토' : '팀장'} 정보가 없습니다.` }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
    if (!claudeRes.ok) {
      throw new Error(`Claude API 오류 (${claudeRes.status}): ${claudeData.error?.message ?? JSON.stringify(claudeData)}`)
    }
    const rawResult = claudeData.content[0].text

    const jsonMatch = rawResult.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude 응답에서 JSON을 찾을 수 없습니다. (응답이 잘렸거나 형식이 올바르지 않을 수 있습니다)')
    const emailData = JSON.parse(jsonMatch[0])

    if (!emailData.subject || !emailData.body) {
      throw new Error('Claude 응답에 subject 또는 body가 없습니다.')
    }

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

    if (insertError) {
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: '이미 생성된 이메일 초안입니다.' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      throw insertError
    }

    return new Response(
      JSON.stringify({ email_draft_id: saved.id, subject: emailData.subject, body: emailData.body }),
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
