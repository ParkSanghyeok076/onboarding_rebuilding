import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import { runAnalyze, runGenerateEmail, runAnalyzeObjective } from '../lib/edgeFunctions';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

const PART_COLORS = {
  part1: '#6366f1',
  part2: '#10b981',
  part3: '#f59e0b',
  part4: '#ef4444',
};


function AdminSurvey({ onBack }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState('전체');
  const [nameFilter, setNameFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [objectiveModal, setObjectiveModal] = useState(null); // { userName, chartData, summary }
  // user_id → { chart_data, summary }
  const [objectiveMap, setObjectiveMap] = useState({});

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
      .select('id, response_id, aspects')
      .in('response_id', ids);

    const { data: drafts } = await supabase
      .from('email_drafts')
      .select('id, response_id, recipient_type, subject, body')
      .in('response_id', ids);

    const analysisMap = {};
    for (const a of analyses || []) analysisMap[a.response_id] = { id: a.id, aspects: a.aspects };

    const draftMap = {};
    for (const d of drafts || []) {
      if (!draftMap[d.response_id]) draftMap[d.response_id] = {};
      draftMap[d.response_id][d.recipient_type] = d;
    }

    const mapped = surveyData.map(r => ({
      ...r,
      userName: r.users?.name || '—',
      analysisId: analysisMap[r.id]?.id || null,
      analysisAspects: analysisMap[r.id]?.aspects || null,
      drafts: draftMap[r.id] || {},
    }));

    setResponses(mapped);

    // 유저별 제출 차수 집계 → 3차 완료자 목록 추출
    const roundCountByUser = {};
    for (const r of mapped) {
      roundCountByUser[r.user_id] = (roundCountByUser[r.user_id] || 0) + 1;
    }
    const threeRoundUserIds = Object.entries(roundCountByUser)
      .filter(([, cnt]) => cnt >= 3)
      .map(([uid]) => uid);

    // 기존 objective_analyses 조회
    if (threeRoundUserIds.length > 0) {
      const { data: objData } = await supabase
        .from('objective_analyses')
        .select('user_id, chart_data, summary')
        .in('user_id', threeRoundUserIds);

      const newObjMap = {};
      for (const o of objData || []) newObjMap[o.user_id] = { chart_data: o.chart_data, summary: o.summary };
      setObjectiveMap(newObjMap);
    } else {
      setObjectiveMap({});
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  // 유저별 제출 차수 수 (렌더링 시 참조)
  const roundCountByUser = {};
  for (const r of responses) {
    roundCountByUser[r.user_id] = (roundCountByUser[r.user_id] || 0) + 1;
  }

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
    if (!response.analysisId) { alert('분석을 먼저 실행해주세요.'); return; }
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

  const handleResetAnalysis = async (responseId) => {
    // analysis_results 삭제 → email_drafts도 같이 삭제 (이메일은 분석 기반이므로)
    await supabase.from('email_drafts').delete().eq('response_id', responseId);
    await supabase.from('analysis_results').delete().eq('response_id', responseId);
    setSelectedAnalysis(null);
    await fetchResponses();
  };

  const handleResetEmailDraft = async (draftId) => {
    await supabase.from('email_drafts').delete().eq('id', draftId);
    setEmailDraft(null);
    await fetchResponses();
  };

  const handleAnalyzeObjective = async (response) => {
    const key = `objective_${response.user_id}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      const result = await runAnalyzeObjective(response.user_id);
      // 로컬 상태 즉시 업데이트
      setObjectiveMap(prev => ({
        ...prev,
        [response.user_id]: { chart_data: result.chart_data, summary: result.summary },
      }));
      setObjectiveModal({ userId: response.user_id, userName: response.userName, chartData: result.chart_data, summary: result.summary });
    } catch (e) {
      const msg = e.message?.includes('session') ? '세션이 만료되었습니다. 다시 로그인해 주세요.' : e.message;
      alert('분석 실패: ' + msg);
    } finally {
      setActionLoading(p => ({ ...p, [key]: false }));
    }
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const displayed = responses
    .filter(r => roundFilter === '전체' || r.round_number === Number(roundFilter.replace('차', '')))
    .filter(r => !nameFilter.trim() || r.userName.includes(nameFilter.trim()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = (a.userName || '').localeCompare(b.userName || '', 'ko');
      if (sortKey === 'round') cmp = a.round_number - b.round_number;
      return sortAsc ? cmp : -cmp;
    });

  if (loading) {
    return (
      <div className="page-container">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (selectedResponse) {
    return <SurveyDetail response={selectedResponse} onBack={() => setSelectedResponse(null)} />;
  }

  return (
    <div className="page-container">
      <div className="admin-container">
        <div className="admin-header">
<div className="admin-header-right">
            <input
              type="text"
              className="survey-name-search"
              placeholder="이름 검색..."
              value={nameFilter}
              onChange={e => setNameFilter(e.target.value)}
            />
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
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{textAlign:'center', cursor:'pointer'}} onClick={() => toggleSort('name')}>
                  이름 {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : '↑↓'}
                </th>
                <th style={{cursor:'pointer'}} onClick={() => toggleSort('round')}>
                  차수 {sortKey === 'round' ? (sortAsc ? '↑' : '↓') : '↑↓'}
                </th>
                <th>제출일</th>
                <th>ABSA 분석</th>
                <th>멘토 이메일</th>
                <th>팀장 이메일</th>
                <th>객관식 분석</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => {
                const analyzingKey = `analyze_${r.id}`;
                const mentorKey = `email_${r.id}_mentor`;
                const teamKey = `email_${r.id}_team_leader`;
                const objKey = `objective_${r.user_id}`;
                const userRoundCount = roundCountByUser[r.user_id] || 0;
                const objResult = objectiveMap[r.user_id];

                return (
                  <tr key={r.id} className="survey-row" onClick={() => setSelectedResponse(r)}>
                    <td>{r.userName}</td>
                    <td>{r.round_number}차</td>
                    <td>{r.submitted_at?.slice(0, 10)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {r.analysisId ? (
                        <span className="status-badge done clickable"
                          onClick={() => setSelectedAnalysis({ aspects: r.analysisAspects, userName: r.userName, roundNumber: r.round_number, responseId: r.id })}>
                          완료 (확인)
                        </span>
                      ) : (
                        <button className="admin-action-btn" disabled={actionLoading[analyzingKey]} onClick={() => handleAnalyze(r)}>
                          {actionLoading[analyzingKey] ? '분석 중...' : '분석 실행'}
                        </button>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {!r.analysisId ? <span className="status-badge undone">미분석</span>
                        : r.drafts.mentor
                          ? <span className="status-badge done clickable" onClick={() => setEmailDraft(r.drafts.mentor)}>완료 (확인)</span>
                          : <button className="admin-action-btn" disabled={actionLoading[mentorKey]} onClick={() => handleGenerateEmail(r, 'mentor')}>
                              {actionLoading[mentorKey] ? '생성 중...' : '멘토'}
                            </button>
                      }
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {!r.analysisId ? <span className="status-badge undone">미분석</span>
                        : r.drafts.team_leader
                          ? <span className="status-badge done clickable" onClick={() => setEmailDraft(r.drafts.team_leader)}>완료 (확인)</span>
                          : <button className="admin-action-btn" disabled={actionLoading[teamKey]} onClick={() => handleGenerateEmail(r, 'team_leader')}>
                              {actionLoading[teamKey] ? '생성 중...' : '팀장'}
                            </button>
                      }
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {userRoundCount < 3
                        ? <span className="status-badge undone">미완료</span>
                        : objResult
                          ? <span className="status-badge done clickable"
                              onClick={() => setObjectiveModal({ userId: r.user_id, userName: r.userName, chartData: objResult.chart_data, summary: objResult.summary })}>
                              완료 (확인)
                            </span>
                          : <button className="admin-action-btn" disabled={actionLoading[objKey]} onClick={() => handleAnalyzeObjective(r)}>
                              {actionLoading[objKey] ? '분석 중...' : '분석 실행'}
                            </button>
                      }
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr><td colSpan={7} className="admin-empty">응답 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 이메일 초안 팝업 */}
      {emailDraft && (
        <div className="obj-overlay" onClick={() => setEmailDraft(null)}>
          <div className="popup-modal" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <div className="obj-header-left">
                <div className="obj-header-icon">✉️</div>
                <div>
                  <p className="obj-header-sub">이메일 초안</p>
                  <h2 className="obj-header-title">
                    {emailDraft.recipient_type === 'mentor' ? '멘토 발송용' : '팀장 발송용'}
                  </h2>
                </div>
              </div>
              <span className="obj-header-badge">AI 생성 초안</span>
            </div>
            <div className="popup-body">
              <div className="popup-subject-card">
                <p className="popup-field-label">제목</p>
                <p className="popup-subject-text">{emailDraft.subject}</p>
              </div>
              <div className="popup-body-card">
                <p className="popup-field-label">본문</p>
                <pre className="popup-body-text">{emailDraft.body}</pre>
              </div>
            </div>
            <div className="obj-footer">
              <button className="obj-btn-reset"
                onClick={() => { if (window.confirm('이메일 초안을 삭제할까요?')) handleResetEmailDraft(emailDraft.id); }}>
                초기화
              </button>
              <button className="obj-btn-close" onClick={() => setEmailDraft(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ABSA 분석 결과 팝업 */}
      {selectedAnalysis && (() => {
        const aspects = selectedAnalysis.aspects || [];
        const posCount = aspects.filter(a => a.sentiment?.includes('긍정')).length;
        const negCount = aspects.filter(a => a.sentiment?.includes('부정')).length;
        const neutCount = aspects.length - posCount - negCount;
        return (
          <div className="obj-overlay" onClick={() => setSelectedAnalysis(null)}>
            <div className="popup-modal popup-modal-wide" onClick={e => e.stopPropagation()}>
              <div className="popup-header">
                <div className="obj-header-left">
                  <div className="obj-header-icon">🔍</div>
                  <div>
                    <p className="obj-header-sub">주관식 감성 분석 (ABSA)</p>
                    <h2 className="obj-header-title">{selectedAnalysis.userName}</h2>
                  </div>
                </div>
                <span className="obj-header-badge">{selectedAnalysis.roundNumber}차 설문</span>
              </div>
              <div className="popup-body">
                {/* 요약 통계 */}
                <div className="absa-stats-row">
                  <div className="absa-stat-card">
                    <span className="absa-stat-num">{aspects.length}</span>
                    <span className="absa-stat-label">분석 항목</span>
                  </div>
                  <div className="absa-stat-card" style={{ borderTop: '3px solid #10b981' }}>
                    <span className="absa-stat-num" style={{ color: '#059669' }}>{posCount}</span>
                    <span className="absa-stat-label">긍정</span>
                  </div>
                  <div className="absa-stat-card" style={{ borderTop: '3px solid #94a3b8' }}>
                    <span className="absa-stat-num" style={{ color: '#64748b' }}>{neutCount}</span>
                    <span className="absa-stat-label">중립</span>
                  </div>
                  <div className="absa-stat-card" style={{ borderTop: '3px solid #ef4444' }}>
                    <span className="absa-stat-num" style={{ color: '#dc2626' }}>{negCount}</span>
                    <span className="absa-stat-label">부정</span>
                  </div>
                </div>
                {/* 분석 테이블 */}
                {aspects.length === 0 ? (
                  <p className="admin-empty">분석 데이터가 없습니다.</p>
                ) : (
                  <div className="absa-table-wrap">
                    <table className="absa-table">
                      <thead>
                        <tr>
                          <th>항목</th>
                          <th>감성</th>
                          <th>신뢰도</th>
                          <th>원문 발췌</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aspects.map((a, i) => (
                          <tr key={i}>
                            <td className="absa-aspect">{a.aspect}</td>
                            <td><span className={`sentiment-badge sentiment-${a.sentiment}`}>{a.sentiment}</span></td>
                            <td><span className="absa-confidence">{a.confidence}</span></td>
                            <td className="absa-quote">"{a.quote}"</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="obj-footer">
                <button className="obj-btn-reset"
                  onClick={() => { if (window.confirm('ABSA 분석과 연결된 이메일 초안도 함께 삭제됩니다. 초기화할까요?')) handleResetAnalysis(selectedAnalysis.responseId); }}>
                  초기화
                </button>
                <button className="obj-btn-close" onClick={() => setSelectedAnalysis(null)}>닫기</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 객관식 시계열 분석 팝업 */}
      {objectiveModal && (
        <ObjectiveModal
          userName={objectiveModal.userName}
          chartData={objectiveModal.chartData}
          summary={objectiveModal.summary}
          onClose={() => setObjectiveModal(null)}
          onReset={async () => {
            await supabase
              .from('objective_analyses')
              .delete()
              .eq('user_id', objectiveModal.userId);
            setObjectiveMap(prev => {
              const next = { ...prev };
              delete next[objectiveModal.userId];
              return next;
            });
            setObjectiveModal(null);
          }}
        />
      )}
    </div>
  );
}

function parseSummary(summary) {
  const sections = { trend: '', strengths: '', observation: '' };
  // ** 굵게 ** 또는 ## 마크다운 헤딩 두 형식 모두 처리
  const trendMatch = summary.match(/(?:\*\*전반적 추이[^*]*\*\*|#{1,3}\s*전반적 추이[^\n]*)\n?([\s\S]*?)(?=\n(?:\*\*|#{1,3}\s)|$)/);
  const strengthsMatch = summary.match(/(?:\*\*강점 영역[^*]*\*\*|#{1,3}\s*강점 영역[^\n]*)\n?([\s\S]*?)(?=\n(?:\*\*|#{1,3}\s)|$)/);
  const observationMatch = summary.match(/(?:\*\*HR[^*]*\*\*|#{1,3}\s*HR[^\n]*)\n?([\s\S]*?)(?=\n(?:\*\*|#{1,3}\s)|$)/);
  if (trendMatch) sections.trend = trendMatch[1].trim();
  if (strengthsMatch) sections.strengths = strengthsMatch[1].trim();
  if (observationMatch) sections.observation = observationMatch[1].trim();
  // 파싱 실패 시 전체 텍스트 fallback
  if (!sections.trend && !sections.strengths && !sections.observation) {
    sections.trend = summary;
  }
  // 남은 마크다운 기호 제거 (## * 등)
  const cleanMd = (s) => s.replace(/^#{1,3}\s+/gm, '').replace(/\*\*/g, '');
  sections.trend = cleanMd(sections.trend);
  sections.strengths = cleanMd(sections.strengths);
  sections.observation = cleanMd(sections.observation);
  return sections;
}

const PART_SHORT = { part1: 'OJT 준비/태도', part2: '업무 지식 전수', part3: '실무 지도/피드백', part4: '조직 적응/소통' };
const PART_TREND_LABEL = (diff) => {
  if (diff >= 0.5) return { label: '뚜렷한 상승', color: '#059669' };
  if (diff >= 0.1) return { label: '소폭 상승', color: '#10b981' };
  if (diff > -0.1) return { label: '안정 유지', color: '#6b7280' };
  if (diff > -0.5) return { label: '소폭 하락', color: '#f59e0b' };
  return { label: '주의 필요', color: '#ef4444' };
};

function ObjectiveModal({ userName, chartData, summary, onClose, onReset }) {
  const sections = parseSummary(summary);
  const r1 = chartData[0], r3 = chartData[chartData.length - 1];
  const avg = (r) => ((r.part1 + r.part2 + r.part3 + r.part4) / 4);
  const avg3 = avg(r3).toFixed(2);
  const growth = (avg(r3) - avg(r1)).toFixed(2);
  const growthSign = growth >= 0 ? '+' : '';
  const highestPart = Object.keys(PART_SHORT).reduce((a, b) => r3[a] >= r3[b] ? a : b);
  const overallDir = growth >= 0.1 ? '성장세' : growth <= -0.1 ? '하락세' : '안정세';
  const overallDirColor = growth >= 0.1 ? '#059669' : growth <= -0.1 ? '#ef4444' : '#6b7280';

  return (
    <div className="obj-overlay" onClick={onClose}>
      <div className="obj-modal" onClick={e => e.stopPropagation()}>

        {/* ── 헤더 ── */}
        <div className="obj-header">
          <div className="obj-header-left">
            <div className="obj-header-icon">📊</div>
            <div>
              <p className="obj-header-sub">온보딩 설문 분석 리포트</p>
              <h2 className="obj-header-title">{userName}</h2>
            </div>
          </div>
          <span className="obj-header-badge">1차 → 3차 시계열</span>
        </div>

        <div className="obj-body">

          {/* ── KPI 카드 4개 ── */}
          <div className="obj-kpi-grid">
            <div className="obj-kpi-card">
              <p className="obj-kpi-label">3차 전체 평균</p>
              <p className="obj-kpi-value">{avg3}<span className="obj-kpi-unit"> / 5.00</span></p>
              <div className="obj-kpi-bar"><div className="obj-kpi-bar-fill" style={{ width: `${(avg3 / 5) * 100}%` }} /></div>
            </div>
            <div className="obj-kpi-card">
              <p className="obj-kpi-label">1→3차 성장률</p>
              <p className="obj-kpi-value" style={{ color: growth >= 0 ? '#059669' : '#ef4444' }}>
                {growthSign}{growth}<span className="obj-kpi-unit"> 점</span>
              </p>
              <p className="obj-kpi-sub">1차 대비 최종 차수 변화</p>
            </div>
            <div className="obj-kpi-card">
              <p className="obj-kpi-label">최고 점수 영역</p>
              <p className="obj-kpi-value" style={{ fontSize: '1.1rem' }}>{PART_SHORT[highestPart]}</p>
              <p className="obj-kpi-sub" style={{ color: '#059669' }}>3차 {r3[highestPart].toFixed(2)}점</p>
            </div>
            <div className="obj-kpi-card">
              <p className="obj-kpi-label">전반적 흐름</p>
              <p className="obj-kpi-value" style={{ color: overallDirColor, fontSize: '1.3rem' }}>{overallDir}</p>
              <p className="obj-kpi-sub">온보딩 3개월 종합</p>
            </div>
          </div>

          {/* ── 차트 카드 ── */}
          <div className="obj-chart-card">
            <div className="obj-chart-card-header">
              <div>
                <h3 className="obj-section-title">설문 점수 추이</h3>
                <p className="obj-section-sub">3회차에 걸친 파트별 평균 점수 (5점 척도)</p>
              </div>
              <div className="obj-legend">
                {Object.entries(PART_COLORS).map(([key, color]) => (
                  <div key={key} className="obj-legend-item">
                    <span className="obj-legend-dot" style={{ background: color }} />
                    <span>{PART_SHORT[key]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="obj-chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="round" tick={{ fontSize: 13, fill: '#64748b' }} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    formatter={(value, name) => [`${value}점`, PART_SHORT[name] || name]}
                    contentStyle={{ borderRadius: '10px', fontSize: '13px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  {Object.entries(PART_COLORS).map(([key, color]) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: color }}
                      activeDot={{ r: 7 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 파트별 요약 */}
            <div className="obj-part-grid">
              {Object.entries(PART_SHORT).map(([key, label]) => {
                const diff = r3[key] - r1[key];
                const { label: trendLabel, color: trendColor } = PART_TREND_LABEL(diff);
                return (
                  <div key={key} className="obj-part-card">
                    <div className="obj-part-dot" style={{ background: PART_COLORS[key] }} />
                    <p className="obj-part-label">{label}</p>
                    <p className="obj-part-score">{r3[key].toFixed(2)}<span>점</span></p>
                    <p className="obj-part-trend" style={{ color: trendColor }}>{trendLabel}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── AI 인사이트 ── */}
          <div className="obj-insights-card">
            <div className="obj-insights-header">
              <span>🤖</span>
              <h3>AI 인사이트 &amp; 종합 평가</h3>
            </div>
            <div className="obj-insights-body">
              <div className="obj-insights-grid">
                {/* 전반적 추이 */}
                <div className="obj-insight-col">
                  <div className="obj-insight-col-title">
                    <span className="obj-insight-icon">📈</span>
                    <span>전반적 추이</span>
                  </div>
                  <p className="obj-insight-text">{sections.trend || '—'}</p>
                </div>
                {/* 강점 영역 */}
                <div className="obj-insight-col">
                  <div className="obj-insight-col-title">
                    <span className="obj-insight-icon">✅</span>
                    <span>강점 영역</span>
                  </div>
                  <p className="obj-insight-text">{sections.strengths || '—'}</p>
                </div>
                {/* HR 관찰 포인트 */}
                <div className="obj-insight-col">
                  <div className="obj-insight-col-title">
                    <span className="obj-insight-icon">👁️</span>
                    <span>HR 관찰 포인트</span>
                  </div>
                  <div className="obj-insight-observation">
                    <p className="obj-insight-text">{sections.observation || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>{/* end obj-body */}

        {/* ── 푸터 ── */}
        <div className="obj-footer">
          <button className="obj-btn-reset"
            onClick={() => { if (window.confirm('분석 결과를 초기화하면 다시 분석을 실행해야 합니다. 초기화할까요?')) onReset(); }}>
            초기화
          </button>
          <button className="obj-btn-close" onClick={onClose}>닫기</button>
        </div>

      </div>
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
      <p>로딩 중...</p>
    </div>
  );
  if (!detail) return <div className="page-container"><p>데이터를 불러올 수 없습니다.</p></div>;

  return (
    <div className="page-container">
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="page-title">{response.userName} — {response.round_number}차 설문</h1>
          <button onClick={onBack} className="back-button">돌아가기</button>
        </div>
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
