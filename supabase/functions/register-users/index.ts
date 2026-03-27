import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
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

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    })
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
      const { employee_id, name, department, hire_date, employee_type, role = 'employee' } = u

      // 멘토는 hire_date / employee_type 불필요
      if (role === 'mentor') {
        if (!employee_id || !name) {
          failed.push({ employee_id: employee_id ?? '(unknown)', reason: '필수 필드 누락 (사번, 이름)' })
          continue
        }

        try {
          // 동일 사번 계정 이미 존재하는지 확인
          const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('employee_id', employee_id)
            .single()

          if (existing) {
            // 계정 이미 있음 → 건너뛰고 success 처리 (매칭은 mentor_id로 자동)
            success.push(employee_id)
            continue
          }

          // 멘토 Auth 계정 생성
          const { data: authData, error: createError } = await supabase.auth.admin.createUser({
            email: `${employee_id}@company.internal`,
            password: 'y' + employee_id,
            email_confirm: true,
          })

          if (createError) {
            // 이미 존재하는 이메일 오류도 success 처리
            if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
              success.push(employee_id)
            } else {
              failed.push({ employee_id, reason: createError.message })
            }
            continue
          }

          const { error: insertError } = await supabase.from('users').insert({
            id: authData.user.id,
            email: `${employee_id}@company.internal`,
            employee_id,
            name,
            department: department ?? '',
            role: 'mentor',
          })

          if (insertError) {
            await supabase.auth.admin.deleteUser(authData.user.id)
            failed.push({ employee_id, reason: insertError.message })
            continue
          }

          success.push(employee_id)
        } catch (e: unknown) {
          failed.push({ employee_id, reason: e instanceof Error ? e.message : String(e) })
        }
        continue
      }

      // ── 일반 직원 등록 (기존 로직) ──
      if (!employee_id || !name || !hire_date || !['신입', '경력'].includes(employee_type)) {
        failed.push({ employee_id: employee_id ?? '(unknown)', reason: '필수 필드 누락 또는 구분 오류' })
        continue
      }

      const period_1_start = hire_date
      const period_1_end = addDays(hire_date, 28)
      let period_2_start = null, period_2_end = null
      let period_3_start = null, period_3_end = null

      if (employee_type === '신입') {
        period_2_start = addDays(hire_date, 29)
        period_2_end   = addDays(hire_date, 56)
        period_3_start = addDays(hire_date, 57)
        period_3_end   = addDays(hire_date, 84)
      }

      try {
        const { data: authData, error: createError } = await supabase.auth.admin.createUser({
          email: `${employee_id}@company.internal`,
          password: 'y' + employee_id,
          email_confirm: true,
        })

        if (createError) {
          failed.push({ employee_id, reason: createError.message })
          continue
        }

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
