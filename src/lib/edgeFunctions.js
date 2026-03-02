import { supabase } from './supabase';

export async function runAnalyze(responseId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await supabase.functions.invoke('analyze', {
    body: { response_id: responseId },
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
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function registerUsers(users) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('로그인이 필요합니다.');

  const res = await supabase.functions.invoke('register-users', {
    body: { users },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}
