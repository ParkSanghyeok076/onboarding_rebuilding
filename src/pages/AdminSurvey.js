import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { runAnalyze, runGenerateEmail } from '../lib/edgeFunctions';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

function AdminSurvey({ onBack }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState('전체');
  const [selectedResponse, setSelectedResponse] = useState(null); // 상세 보기
  const [emailDraft, setEmailDraft] = useState(null); // 이메일 초안 팝업
  const [actionLoading, setActionLoading] = useState({}); // { [key]: true }

  const fetchResponses = useCallback(async () => {
    const { data: surveyData, error } = await supabase
      .from('survey_responses')
      .select('id, user_id, round_number, submitted_at, users(name)')
      .order('submitted_at', { ascending: false });

    if (error || !surveyData) { setLoading(false); return; }

    const ids = surveyData.map(r => r.id);
    if (ids.length === 0) { setResponses([]); setLoading(false); return; }

    const { data: analyses } = await supabase
      .from('analysis_results')
      .select('id, response_id')
      .in('response_id', ids);

    const { data: drafts } = await supabase
      .from('email_drafts')
      .select('id, response_id, recipient_type, subject, body')
      .in('response_id', ids);

    const analysisMap = {};
    for (const a of analyses || []) analysisMap[a.response_id] = a.id;

    const draftMap = {};
    for (const d of drafts || []) {
      if (!draftMap[d.response_id]) draftMap[d.response_id] = {};
      draftMap[d.response_id][d.recipient_type] = d;
    }

    setResponses(surveyData.map(r => ({
      ...r,
      userName: r.users?.name || '—',
      analysisId: analysisMap[r.id] || null,
      drafts: draftMap[r.id] || {},
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const handleAnalyze = async (response) => {
    const key = `analyze_${response.id}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await runAnalyze(response.id);
      await fetchResponses();
    } catch (e) {
      const msg = e.message?.includes('session') ? '세션이 만료되었습니다. 다시 로그인해 주세요.' : e.message;
      alert('분석 실패: ' + msg);
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const handleGenerateEmail = async (response, recipientType) => {
    if (!response.analysisId) {
      alert('분석을 먼저 실행해주세요.');
      return;
    }
    const key = `email_${response.id}_${recipientType}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await runGenerateEmail(response.analysisId, recipientType);
      await fetchResponses();
    } catch (e) {
      const msg = e.message?.includes('session') ? '세션이 만료되었습니다. 다시 로그인해 주세요.' : e.message;
      alert('이메일 생성 실패: ' + msg);
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const displayed = roundFilter === '전체'
    ? responses
    : responses.filter(r => r.round_number === Number(roundFilter.replace('차', '')));

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (selectedResponse) {
    return <SurveyDetail response={selectedResponse} onBack={() => setSelectedResponse(null)} />;
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="page-title">📝 설문조사 관리</h1>
          <div className="admin-filter-group">
            {['전체', '1차', '2차', '3차'].map(f => (
              <button
                key={f}
                className={`admin-filter-btn ${roundFilter === f ? 'active' : ''}`}
                onClick={() => setRoundFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>차수</th>
                <th>제출일</th>
                <th>ABSA 분석</th>
                <th>멘토 이메일</th>
                <th>팀장 이메일</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => {
                const analyzingKey = `analyze_${r.id}`;
                const mentorKey = `email_${r.id}_mentor`;
                const teamKey = `email_${r.id}_team_leader`;
                return (
                  <tr key={r.id} className="survey-row" onClick={() => setSelectedResponse(r)}>
                    <td>{r.userName}</td>
                    <td>{r.round_number}차</td>
                    <td>{r.submitted_at?.slice(0, 10)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {r.analysisId ? (
                        <span className="status-badge done">완료</span>
                      ) : (
                        <button
                          className="admin-action-btn"
                          disabled={actionLoading[analyzingKey]}
                          onClick={() => handleAnalyze(r)}
                        >
                          {actionLoading[analyzingKey] ? '분석 중...' : '분석 실행'}
                        </button>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {!r.analysisId ? <span className="status-badge undone">미분석</span>
                        : r.drafts.mentor ? (
                          <span
                            className="status-badge done clickable"
                            onClick={() => setEmailDraft(r.drafts.mentor)}
                          >완료 (확인)</span>
                        ) : (
                          <button
                            className="admin-action-btn"
                            disabled={actionLoading[mentorKey]}
                            onClick={() => handleGenerateEmail(r, 'mentor')}
                          >
                            {actionLoading[mentorKey] ? '생성 중...' : '멘토'}
                          </button>
                        )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {!r.analysisId ? <span className="status-badge undone">미분석</span>
                        : r.drafts.team_leader ? (
                          <span
                            className="status-badge done clickable"
                            onClick={() => setEmailDraft(r.drafts.team_leader)}
                          >완료 (확인)</span>
                        ) : (
                          <button
                            className="admin-action-btn"
                            disabled={actionLoading[teamKey]}
                            onClick={() => handleGenerateEmail(r, 'team_leader')}
                          >
                            {actionLoading[teamKey] ? '생성 중...' : '팀장'}
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">응답 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {emailDraft && (
        <div className="confirm-overlay" onClick={() => setEmailDraft(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>이메일 초안</h2>
            <p className="email-draft-subject"><strong>제목:</strong> {emailDraft.subject}</p>
            <pre className="email-draft-body">{emailDraft.body}</pre>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-ok" onClick={() => setEmailDraft(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SurveyDetail({ response, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      const { data } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('id', response.id)
        .single();
      setDetail(data);
      setLoading(false);
    };
    fetchDetail();
  }, [response.id]);

  if (loading) return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <p>로딩 중...</p>
    </div>
  );
  if (!detail) return <div className="page-container"><button onClick={onBack} className="back-button">← 목록으로</button><p>데이터를 불러올 수 없습니다.</p></div>;

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <div className="admin-container">
        <h1 className="page-title">{response.userName} — {response.round_number}차 설문</h1>
        <p className="survey-detail-date">제출일: {response.submitted_at?.slice(0, 10)}</p>
        {PARTS.map(part => (
          <div key={part.number} className="result-part">
            <h3 className="result-part-title">{part.title}</h3>
            {part.questions.map((q, idx) => (
              <div key={q.key} className="result-question">
                <p className="result-q-text"><strong>{idx + 1}. {q.text}</strong></p>
                {q.type === 'scale' ? (
                  <p className="result-answer">
                    {detail[q.key] != null
                      ? `${detail[q.key]}점 — ${SCALE_LABELS[detail[q.key]] || ''}`
                      : '(미응답)'}
                  </p>
                ) : (
                  <p className="result-answer result-text">
                    {detail[q.key] || '(미작성)'}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminSurvey;
