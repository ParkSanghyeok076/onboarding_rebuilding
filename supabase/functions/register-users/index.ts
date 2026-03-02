import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // 관리자 작업용 서비스 롤 클라이언트
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // HR Admin 권한 확인
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '인증 필요' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 사용자 JWT 검증: anon key + user JWT (Supabase 권장 패턴)
    const userClient = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )
    const { data: { user }, error: authError } = await userClient.auth.getUser()
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

    // 요청 데이터
    const { users } = await req.json()
    if (!Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ error: 'users 배열 필요' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const success: string[] = []
    const failed: { employee_id: string; reason: string }[] = []

    for (const u of users) {
      const { employee_id, name, department, hire_date, employee_type } = u

      if (!employee_id || !name || !hire_date || !['신입', '경력'].includes(employee_type)) {
        failed.push({ employee_id: employee_id ?? '(unknown)', reason: '필수 필드 누락 또는 구분 오류' })
        continue
      }

      // 기간 자동 계산
      const period_1_start = hire_date
      const period_1_end = addMonths(hire_date, 1)
      let period_2_start = null, period_2_end = null
      let period_3_start = null, period_3_end = null

      if (employee_type === '신입') {
        period_2_start = addMonths(hire_date, 1)
        period_2_end = addMonths(hire_date, 2)
        period_3_start = addMonths(hire_date, 2)
        period_3_end = addMonths(hire_date, 3)
      }

      try {
        // Auth 계정 생성 (이메일은 내부용, 비밀번호는 y+사번)
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: `${employee_id}@company.internal`,
          password: 'y' + employee_id,
          email_confirm: true,
        })

        if (createError) {
          failed.push({ employee_id, reason: createError.message })
          continue
        }

        // users 테이블 insert
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: `${employee_id}@company.internal`,
          employee_id,
          name,
          department,
          hire_date,
          employee_type,
          role: 'employee',
          period_1_start,
          period_1_end,
          period_2_start,
          period_2_end,
          period_3_start,
          period_3_end,
        })

        if (insertError) {
          // Auth 계정은 만들어졌지만 프로필 실패 — Auth 계정 삭제
          await supabase.auth.admin.deleteUser(authData.user.id)
          failed.push({ employee_id, reason: insertError.message })
          continue
        }

        success.push(employee_id)
      } catch (e: unknown) {
        failed.push({ employee_id, reason: e instanceof Error ? e.message : String(e) })
      }
    }

    return new Response(
      JSON.stringify({ success, failed }),
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
