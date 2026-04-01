import { supabase } from './supabase';

export async function runAnalyze(responseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await supabase.functions.invoke('analyze', {
    body: { response_id: responseId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function runGenerateEmail(analysisResultId, recipientType) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

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

export async function runAnalyzeObjective(userId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await supabase.functions.invoke('analyze-objective', {
    body: { user_id: userId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function resetPassword(authId, employeeId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await supabase.functions.invoke('reset-password', {
    body: { auth_id: authId, employee_id: employeeId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function registerUsers(users) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await supabase.functions.invoke('register-users', {
    body: { users },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}
