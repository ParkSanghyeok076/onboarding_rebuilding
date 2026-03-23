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
      .select('name, mentor_name, team_leader_name, employee_type')
      .eq('id', surveyResponse.user_id)
      .single()

    if (employeeError || !employee) {
      return new Response(JSON.stringify({ error: '직원 정보를 찾을 수 없습니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const recipientName = (recipient_type === 'mentor'
      ? employee.mentor_name
      : employee.team_leader_name) || (recipient_type === 'mentor' ? '멘토' : '팀장')

    const isNew = employee.employee_type === '신입'
    const employeeLabel = isNew ? '신입사원' : '경력사원'

    // 고정 제목
    const subject = recipient_type === 'mentor'
      ? `${employee.name} - 1개월차 멘토링 가이드 메일`
      : `[인사기획팀] ${employee.name} - 1개월차 정기 모니터링 공유`

    // 고정 인사말
    const greeting = recipient_type === 'mentor'
      ? `${recipientName}님, 안녕하세요!\n인사기획팀 교육담당입니다.`
      : `팀장님, 안녕하세요!\n인사기획팀 교육담당입니다.`

    // 고정 연락처 문구
    const contactFooter = recipient_type === 'mentor'
      ? `멘토링 진행 중 궁금한 점이 생기시면 언제든 연락주세요! 문의 - 인사기획팀 교육담당(1456)`
      : `온보딩 진행 중 궁금한 점이 생기시면 언제든 연락주세요! 문의 - 인사기획팀 교육담당(1456)`

    // 6. Claude API 호출
    const prompt = recipient_type === 'mentor'
      ? `[분석 결과 입력]
${JSON.stringify(analysisResult.aspects, null, 2)}

당신은 온보딩 경험을 바탕으로 멘토에게 보내는 넛지 메일 본문 작성자입니다.
이 메일의 목적은 멘토를 평가하거나 지적하는 것이 아니라,
이미 잘하고 있는 점을 인정하고 바로 실천 가능한 1가지 보완 포인트를 따뜻하게 제안하는 것입니다.
(인사말과 연락처 문구는 별도로 삽입되므로 본문에 포함하지 마세요)

발신자: 인사기획팀 교육담당
대상 직원 유형: ${employeeLabel}
대상 직원명: ${employee.name}
수신자명: ${recipientName}

[반드시 먼저 내부적으로 수행할 판단]
1. 입력된 aspect를 모두 사용하지 말고, 멘토가 실제로 영향을 줄 수 있는 항목만 먼저 선별하십시오.
2. 강점은 최대 1개, 보완 포인트는 최대 1개만 선택하십시오.
3. 여러 aspect가 같은 의미를 말하면 하나로 통합하십시오.
4. 원인과 결과가 따로 쪼개져 있더라도, 멘토 입장에서 하나의 행동으로 다룰 수 있으면 하나로 묶으십시오.
5. quote, source_field, confidence, sentiment 라벨을 본문에 그대로 쓰지 마십시오.
6. 예산, 비품, 제도, 팀 전체 운영처럼 멘토가 직접 통제하기 어려운 항목은 제외하거나 아주 간접적으로만 언급하십시오.

[선택 우선순위]
- 강점 후보 우선순위
  1) 긍정 또는 약간긍정
  2) q1_5, q2_5, q3_5에서 나온 항목 우선
  3) 질문하기 편한 분위기, 빠른 안내, 세심한 설명, 안정감 형성, 헌신적 지원과 관련된 항목 우선
- 보완 후보 우선순위
  1) 약간부정 또는 부정
  2) q3_5, q4_5, q5_3에서 나온 항목 우선
  3) 자율적 업무 시도 기회, 업무 외 비공식 소통, 관계 형성, 스스로 정리해볼 기회와 관련된 항목 우선
- 제외 또는 후순위
  - q5_2의 예산/비품/제도성 이슈
  - 팀장 또는 HR이 주로 해결해야 하는 항목
  - confidence가 낮은 모호한 항목
  - 의미가 비슷한 세부 항목의 중복 나열

[문체 가이드]
- 인사말과 연락처 문구는 이미 별도로 들어가므로 절대 반복하지 마십시오.
- "설문" 대신 "정기 체크인" 또는 "확인 과정"을 사용하십시오.
- "피드백" 대신 "의견" 또는 "제안 사항"을 사용하십시오.
- "분석 결과" 대신 "최근 파악한 내용"을 사용하십시오.
- "응답"이라는 단어는 사용하지 마십시오.
- 원문 quote를 그대로 인용하지 말고, 부드러운 요약 표현으로 바꾸십시오.
- "문제가 있습니다", "부족합니다", "낮게 나타났습니다", "불만이 있습니다" 같은 평가 문장을 쓰지 마십시오.
- 멘토를 방어적으로 만들 수 있는 표현보다 동료적인 제안 어조를 사용하십시오.
- 대상 직원 유형이 신입사원이면 첫 사회생활 적응과 심리적 안정감을 고려한 표현을 쓰십시오.
- 대상 직원 유형이 경력사원이면 이전 회사 경험을 존중하는 어조를 사용하고 가르치려 드는 표현을 피하십시오.

[본문 구조]
- 총 3~4문단
- 1문단: 최근 확인 과정에서 보인 강점 1개를 구체적으로 언급하며 감사
- 2문단: 함께 살펴보면 좋을 포인트 1개를 완곡하게 제시
- 3문단: 다음 1~2주 안에 실천 가능한 제안 1~2개 제시
- 4문단: 멘토의 헌신에 대한 감사와 응원
- 문단마다 2~4문장 이내
- 불릿 포인트 사용 금지

[실행 가능한 제안으로 바꾸는 방식]
- 바로 답을 주기보다 먼저 한 번 시도해볼 시간을 드린 뒤 함께 점검해 보기
- 업무 외 이야기를 짧게 나눌 수 있는 시간을 가볍게 가져 보기
- 주변 동료와 자연스럽게 연결될 수 있는 자리를 한 번 만들어 보기
- 설명 후 이해 여부를 바로 확인하기보다 스스로 정리해볼 여유를 주기

[특수 규칙]
- 부정 항목이 여러 개여도 하나만 핵심으로 쓰십시오.
- 긍정 항목이 뚜렷하지 않더라도 억지로 과장하지 말고, 상대적으로 안정적으로 보이는 점 하나만 골라 표현하십시오.
- 보완 포인트가 전혀 멘토 액션으로 연결되지 않으면, 유지 포인트 중심의 짧은 응원 메일로 작성하십시오.
- aspect명 자체를 기계적으로 나열하지 말고, 멘토가 이해하기 쉬운 자연스러운 문장으로 바꾸십시오.

[미니 예시]
입력 aspect에 "질문 수용성과 의견 제안의 신속성: 긍정", "자율적 업무 시도 기회: 약간부정"이 있으면,
본문은 "질문하기 편한 분위기와 빠른 안내"를 강점으로 쓰고,
"먼저 시도해볼 시간 제공"을 보완 제안으로 연결하십시오.
직접 라벨명이나 감성명은 쓰지 마십시오.

[출력 규칙]
- 반드시 유효한 JSON 객체 하나만 반환하십시오.
- 마크다운 코드블록, 설명, 머리말, 꼬리말 금지
- body 값에는 인사말, 서명, 연락처를 넣지 마십시오.
- 줄바꿈은 \\n 으로 이스케이프된 문자열로 넣으십시오.
- 반환 형식:
{"body":"이메일 본문"}

[출력 예시]
{"body":"최근 확인 과정에서 업무 관련 질문을 편하게 주고받을 수 있는 분위기가 형성되어 있었고, 필요한 안내도 적시에 이어진 점이 인상적이었습니다. 초기 적응에 큰 도움이 되고 있는 부분이라 감사드립니다.\\n\\n한편 업무를 이해하는 과정에서는 충분한 안내를 받고 있으나, 스스로 한 번 정리해 보고 점검받는 기회가 조금 더 있으면 좋겠다는 흐름도 함께 보였습니다.\\n\\n가능하시다면 설명 후 바로 답을 주시기보다, 작은 단위의 업무는 먼저 시도해볼 시간을 드린 뒤 함께 확인해 주시는 방식도 도움이 될 것 같습니다. 또 짧게라도 업무 외 이야기를 나눌 수 있는 시간을 한 번씩 가져 주시면 안정감 형성에 더욱 도움이 될 수 있겠습니다.\\n\\n항상 세심하게 멘토링해 주셔서 감사드리며, 앞으로의 멘토링도 잘 이어질 수 있도록 응원하겠습니다."}`
      : `[분석 결과 입력]
${JSON.stringify(analysisResult.aspects, null, 2)}

당신은 온보딩 경험을 바탕으로 팀장에게 보내는 1개월차 정기 모니터링 공유 메일 본문 작성자입니다.
이 메일의 목적은 개인 비판을 전달하는 것이 아니라,
초기 적응 상태를 짧고 구조적으로 공유하고 팀 차원에서 도와줄 수 있는 포인트를 알려드리는 것입니다.
(인사말과 연락처 문구는 별도로 삽입되므로 본문에 포함하지 마세요)

발신자: 인사기획팀 교육담당
대상 직원 유형: ${employeeLabel}
대상 직원명: ${employee.name}
수신자명: ${recipientName}

[반드시 먼저 내부적으로 수행할 판단]
1. aspect를 모두 나열하지 말고, 전반 상태를 설명하는 데 필요한 핵심만 추리십시오.
2. 유지 포인트는 최대 1개, 함께 살펴볼 포인트는 최대 2개까지만 선택하십시오.
3. 팀장 또는 팀 차원에서 지원 가능한 항목을 우선 선택하십시오.
4. HR/제도/예산 이슈는 팀장에게 책임을 돌리지 말고, 참고 또는 협업 필요 항목으로 표현하십시오.
5. 여러 aspect가 같은 의미이면 하나로 통합하십시오.
6. 원인과 결과가 따로 나뉘어 있더라도 팀 차원의 액션이 하나라면 하나로 묶으십시오.
7. quote, source_field, confidence, sentiment 라벨을 본문에 그대로 쓰지 마십시오.

[선택 우선순위]
- 우선 검토 field
  - q4_5 조직 적응 지원
  - q5_1 강점/유지
  - q5_2 개선 제안
  - q5_3 자유 의견
- 조건부 포함 field
  - q1_5, q2_5, q3_5는 반복적으로 나타나거나 업무 설계/팀 지원과 직접 연결될 때만 포함
- 우선 선택 aspect 유형
  - 동료 네트워킹, 팀 내 비공식 소통, 온보딩 적응 지원, 역할 명확화, 자율적 시도 기회, 업무환경/비품, 멘토링 운영 지원
- 후순위 또는 제외
  - 순수하게 멘토 개인의 말투나 1:1 관계 디테일만 담긴 항목
  - confidence가 낮은 모호한 항목
  - 같은 뜻의 세부 항목 여러 개 나열

[문체 가이드]
- 인사말과 연락처 문구는 이미 별도로 들어가므로 절대 반복하지 마십시오.
- "설문" 대신 "정기 체크인" 또는 "확인 과정"을 사용하십시오.
- "피드백" 대신 "의견" 또는 "제안 사항"을 사용하십시오.
- "분석 결과" 대신 "최근 파악한 내용"을 사용하십시오.
- "응답"이라는 단어는 사용하지 마십시오.
- 개인을 평가하는 어조가 아니라 운영적이고 협조를 구하는 어조를 사용하십시오.
- "문제가 있습니다", "낮게 나타났습니다", "불만이 많습니다" 같은 단정적 표현은 금지합니다.
- 전체 감성 분포는 숫자나 비율로 쓰지 말고, "전반적으로 업무 적응은 안정적인 편이나...", "긍정 신호가 우세하나..."처럼 질적으로 요약하십시오.
- 대상 직원 유형이 경력사원이면 이전 회사 방식과의 차이에서 오는 적응 이슈일 수 있음을 완곡하게 반영하십시오.

[본문 구조]
- 총 2~3문단
- 1문단: 전체 상태를 한 문장으로 요약하고, 현재 안정적으로 보이는 강점 1개 언급
- 2문단: 아래 3개 불릿을 사용해 구조화
  - 유지 포인트
  - 함께 살펴볼 포인트
  - 팀 차원 제안
- 3문단: 팀장님의 관심과 지원을 정중하게 요청하고, HR도 함께 살펴보겠다는 협업 문장으로 마무리
- 각 불릿은 1~2문장 이내
- 단답식 보고서처럼 끊지 말고, 구어체 문장으로 작성하십시오.

[팀 차원 제안으로 바꾸는 방식]
- 초기 적응을 위해 함께 일하는 구성원과 자연스럽게 연결될 기회를 한 번 마련해 보기
- 기본 비품이나 업무환경을 간단히 점검해 보기
- 설명 위주 지원에 더해 직접 해보는 작은 업무 단위를 설계해 보기
- 멘토링이 안정적으로 운영될 수 있도록 일정이나 업무 배분을 한 번 살펴보기
- 제도성 이슈는 HR과 함께 검토 포인트로 정리하기

[특수 규칙]
- 멘토가 잘하고 있는 부분을 팀장 메일에서 길게 확장하지 마십시오.
- 환경/제도 이슈가 있다면 팀장에게 모든 해결 책임을 지우지 마십시오.
- 강점보다 보완점이 많아도 최대 2개만 제시하십시오.
- 직접 인용문 사용 금지
- aspect명 자체를 기계적으로 나열하지 말고, 팀장에게 이해되기 쉬운 문장으로 재서술하십시오.

[미니 예시]
입력 aspect에 "동료 네트워킹 지원: 약간부정", "사무 비품 지원: 약간부정", "질문하기 편한 분위기: 긍정"이 있으면,
본문은 "업무 적응은 전반적으로 안정적"이라고 요약하고,
유지 포인트에는 질문 가능한 분위기를,
함께 살펴볼 포인트에는 네트워킹과 업무환경을,
팀 차원 제안에는 동료 소개 기회와 기본 환경 점검을 넣으십시오.
직접 라벨명이나 감성명은 쓰지 마십시오.

[출력 규칙]
- 반드시 유효한 JSON 객체 하나만 반환하십시오.
- 마크다운 코드블록, 설명, 머리말, 꼬리말 금지
- body 값에는 인사말, 서명, 연락처를 넣지 마십시오.
- 줄바꿈은 \\n 으로 이스케이프된 문자열로 넣으십시오.
- 반환 형식:
{"body":"이메일 본문"}

[출력 예시]
{"body":"최근 확인 과정을 보면 업무 적응은 전반적으로 안정적인 편이며, 초기에 질문하고 필요한 안내를 받을 수 있는 분위기는 비교적 잘 형성되고 있는 것으로 보입니다.\\n\\n- 유지 포인트: 업무 관련 안내와 의견 교환 경험은 대체로 안정적으로 인식되고 있어, 초기 적응의 기반이 잘 마련되고 있는 흐름입니다.\\n- 함께 살펴볼 포인트: 다만 팀 내 비공식 소통이나 주변 동료와의 자연스러운 연결은 조금 더 보완되면 좋겠다는 신호가 있었습니다. 또한 기본적인 업무환경 지원은 초반 적응 체감에 영향을 줄 수 있어 함께 살펴볼 필요가 있어 보입니다.\\n- 팀 차원 제안: 함께 일하는 구성원과 자연스럽게 연결될 수 있는 자리를 한 번 마련해 주시고, 기본 비품이나 업무환경도 가볍게 점검해 주시면 초기 안착에 도움이 될 수 있겠습니다.\\n\\n신규 구성원의 안정적인 적응을 위해 팀장님의 관심과 지원이 큰 역할을 하고 있어, 가능한 범위에서 함께 살펴봐 주시면 감사하겠습니다. 제도나 운영 차원의 부분은 HR에서도 함께 확인해 보겠습니다."}`

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

    if (!emailData.body) {
      throw new Error('Claude 응답에 body가 없습니다.')
    }

    // 인사말 + 본문 + 연락처 조립
    const finalBody = `${greeting}\n\n${emailData.body}\n\n${contactFooter}`

    // 7. email_drafts 저장
    const { data: saved, error: insertError } = await supabase
      .from('email_drafts')
      .insert({
        response_id: analysisResult.response_id,
        recipient_type,
        subject,
        body: finalBody,
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
      JSON.stringify({ email_draft_id: saved.id, subject, body: finalBody }),
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
