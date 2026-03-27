import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';
import './OJTJournal.css';

function OJTJournal({ user, onBack }) {
  const [journals, setJournals] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [educationContent, setEducationContent] = useState('');
  const [challenges, setChallenges] = useState('');
  const [goals, setGoals] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const hireDate = user.period_1_start;
  const totalWeeks = user.employee_type === '신입' ? 12 : 4;

  const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const getWeekRange = (weekNum) => {
    const start = addDays(hireDate, (weekNum - 1) * 7);
    const end = addDays(hireDate, weekNum * 7 - 1);
    return { start, end };
  };

  // 주차 7일 중 평일(월~금)만 "MM월 DD일\n: " 형태로 기본값 생성
  const buildDefaultContent = (weekNum) => {
    const { start } = getWeekRange(weekNum);
    const lines = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dayOfWeek = d.getDay(); // 0=일, 6=토
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dayLabel = ['일','월','화','수','목','금','토'][dayOfWeek];
      lines.push(`${mm}월 ${dd}일(${dayLabel})\n: `);
    }
    return lines.join('\n\n');
  };

  const today = new Date().toISOString().slice(0, 10);

  const getWeekStatus = (weekNum, journal) => {
    if (journal?.status === 'approved') return 'approved';
    if (journal?.status === 'submitted') return 'submitted';

    const { start, end } = getWeekRange(weekNum);
    const deadline = addDays(end, 3); // 종료일 + 3일

    if (today < start) return 'upcoming';          // 기간 미도래 → 비활성화
    if (today > deadline) return 'expired';         // 마감 지남 → 잠금

    if (journal?.status === 'draft') return 'draft'; // 임시저장됨 → 작성 중
    return 'empty';                                  // 기간 내, 미작성
  };

  const fetchJournals = useCallback(async () => {
    const { data, error } = await supabase
      .from('ojt_journals')
      .select('*')
      .eq('user_id', user.id);
    if (!error && data) {
      const map = {};
      data.forEach(j => { map[j.week_number] = j; });
      setJournals(map);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  const handleSelectWeek = (weekNum) => {
    const journal = journals[weekNum];
    setSelectedWeek(weekNum);
    // 저장된 내용이 있으면 사용, 없으면 날짜 기본값 채워줌
    setEducationContent(journal?.education_content ?? buildDefaultContent(weekNum));
    setChallenges(journal?.challenges || '');
    setGoals(journal?.next_week_goals || '');
    setSaveMsg('');
  };

  const handleSave = async (submit = false) => {
    setSaving(true);
    setSaveMsg('');
    const { start, end } = getWeekRange(selectedWeek);
    const payload = {
      user_id: user.id,
      week_number: selectedWeek,
      week_start_date: start,
      week_end_date: end,
      education_content: educationContent,
      challenges,
      next_week_goals: goals,
      status: submit ? 'submitted' : 'draft',
      submitted_at: submit ? new Date().toISOString() : (journals[selectedWeek]?.submitted_at || null),
      updated_at: new Date().toISOString(),
    };

    const existing = journals[selectedWeek];
    let error;
    if (existing) {
      ({ error } = await supabase.from('ojt_journals').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('ojt_journals').insert({ ...payload, created_at: new Date().toISOString() }));
    }

    if (!error) {
      setSaveMsg(submit ? '제출 완료!' : '임시 저장됨');
      fetchJournals();
    } else {
      setSaveMsg('저장 실패: ' + error.message);
    }
    setSaving(false);
  };

  const STATUS_LABEL = {
    approved:  '승인',
    submitted: '제출',
    draft:     '작성 중',
    empty:     '미작성',
    upcoming:  '미작성',
    expired:   '미작성',
  };
  const STATUS_CLASS = {
    approved:  'ojt-status-approved',
    submitted: 'ojt-status-submitted',
    draft:     'ojt-status-draft',
    empty:     'ojt-status-empty',
    upcoming:  'ojt-status-upcoming',
    expired:   'ojt-status-expired',
  };

  if (loading) return (
    <div className="page-container"><div className="ojt-container"><p>로딩 중...</p></div></div>
  );

  /* ── 작성 화면 ── */
  if (selectedWeek !== null) {
    const journal = journals[selectedWeek];
    const status = getWeekStatus(selectedWeek, journal);
    const isReadOnly = ['approved', 'submitted', 'expired'].includes(status);
    const isUpcoming = status === 'upcoming';
    const { start, end } = getWeekRange(selectedWeek);
    const hasContent = educationContent.trim().length > 0;

    return (
      <div className="page-container">
        <div className="ojt-form-layout">
        <button onClick={() => setSelectedWeek(null)} className="back-button ojt-back-btn">← 목록으로</button>
        <div className="ojt-form-wrap">
          <div className="ojt-form-card">

            {/* 헤더 */}
            <div className="ojt-form-top">
              <div className="ojt-form-logo">
                <img src="/YURA_SYMBOL.png" alt="YURA" className="ojt-logo-img" />
              </div>
              <div className="ojt-form-title-block">
                <span className="ojt-form-title">
                  {user.team} {user.name} — {selectedWeek}주차 OJT 일지
                </span>
              </div>
              <div className="ojt-form-daterange">
                <div className="ojt-daterange-left">
                  <span className="ojt-daterange-value">{start}</span>
                  <span className="ojt-daterange-value">{end}</span>
                </div>
                <div className="ojt-daterange-right">
                  <span className={`ojt-status ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                </div>
              </div>
            </div>

            {/* 상태 안내 배너 */}
            {isUpcoming && (
              <div className="ojt-notice ojt-notice-upcoming">
                🔒 아직 작성 기간이 아닙니다. ({start} 부터 작성 가능)
              </div>
            )}
            {status === 'expired' && (
              <div className="ojt-notice ojt-notice-expired">
                🔒 작성 기간이 종료되었습니다. ({end} + 3일 경과)
              </div>
            )}
            {status === 'submitted' && (
              <div className="ojt-notice ojt-notice-submitted">
                ✅ 제출 완료. 멘토 승인을 기다리는 중입니다.
              </div>
            )}

            {/* 본문 테이블 */}
            <table className="ojt-table">
              <colgroup>
                <col style={{ width: '120px' }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th className="ojt-th" colSpan={2}>세부 교육 내용</th>
                </tr>
              </thead>
              <tbody>
                {/* 교육 내용 — 단일 넓은 textarea */}
                <tr>
                  <td className="ojt-td-content" colSpan={2} style={{ padding: 0 }}>
                    <textarea
                      className="ojt-cell-textarea ojt-education-textarea"
                      value={educationContent}
                      onChange={e => setEducationContent(e.target.value)}
                      disabled={isReadOnly}
                      rows={10}
                    />
                  </td>
                </tr>

                {/* 어려웠던 점 */}
                <tr>
                  <td className="ojt-td-section">어려웠던 점</td>
                  <td className="ojt-td-content ojt-section-content">
                    <textarea
                      className="ojt-cell-textarea"
                      value={challenges}
                      onChange={e => setChallenges(e.target.value)}
                      disabled={isReadOnly}
                      placeholder={isReadOnly ? '' : '업무나 적응 과정에서 어려웠던 점을 작성해 주세요.'}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* 다음 주 목표 */}
                <tr>
                  <td className="ojt-td-section">다음 주 목표</td>
                  <td className="ojt-td-content ojt-section-content">
                    <textarea
                      className="ojt-cell-textarea"
                      value={goals}
                      onChange={e => setGoals(e.target.value)}
                      disabled={isReadOnly}
                      placeholder={isReadOnly ? '' : '다음 주에 달성하고 싶은 목표를 작성해 주세요.'}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* 지도의견 (멘토) */}
                <tr>
                  <td className="ojt-td-section ojt-mentor-cell">
                    지도의견<br /><span className="ojt-mentor-sub">(멘토)</span>
                  </td>
                  <td className="ojt-td-content ojt-mentor-content">
                    {journal?.mentor_comment
                      ? <p className="ojt-mentor-text">{journal.mentor_comment}</p>
                      : <p className="ojt-mentor-empty">멘토가 코멘트를 작성하면 여기에 표시됩니다.</p>
                    }
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 저장/제출 버튼 */}
            {!isReadOnly && (
              <div className="ojt-form-actions">
                {saveMsg && (
                  <span className={`ojt-save-msg ${saveMsg.includes('실패') ? 'error' : 'success'}`}>
                    {saveMsg}
                  </span>
                )}
                <button
                  className="ojt-btn ojt-btn-secondary"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? '저장 중...' : '임시 저장'}
                </button>
                <button
                  className="ojt-btn ojt-btn-primary"
                  onClick={() => handleSave(true)}
                  disabled={saving || !hasContent}
                >
                  {saving ? '처리 중...' : '제출하기'}
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }

  /* ── 목록 화면 ── */
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const currentWeekNum = hireDate
    ? Math.min(Math.floor((new Date(today) - new Date(hireDate)) / (7 * 24 * 3600 * 1000)) + 1, totalWeeks)
    : 1;

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="ojt-container">
        <div className="ojt-list-header">
          <div>
            <h1 className="ojt-title">📓 OJT 일지</h1>
            <p className="ojt-subtitle">매주 배운 내용을 기록하고 멘토에게 제출하세요.</p>
          </div>
          <div className="ojt-progress-summary">
            <span className="ojt-progress-text">
              제출 완료&nbsp;
              <strong>{Object.values(journals).filter(j => j.status === 'submitted' || j.status === 'approved').length}</strong>
              &nbsp;/ {totalWeeks}주
            </span>
          </div>
        </div>

        <div className="ojt-week-list">
          {weeks.map(weekNum => {
            const journal = journals[weekNum];
            const status = getWeekStatus(weekNum, journal);
            const { start, end } = getWeekRange(weekNum);
            const isCurrent = weekNum === currentWeekNum;

            return (
              <div
                key={weekNum}
                className={`ojt-week-card ${isCurrent ? 'current' : ''} ${status === 'upcoming' ? 'disabled' : 'clickable'}`}
                onClick={() => status !== 'upcoming' && handleSelectWeek(weekNum)}
              >
                <div className="ojt-week-info">
                  <div className="ojt-week-num">
                    {weekNum}주차
                    {isCurrent && <span className="ojt-current-badge">현재</span>}
                  </div>
                  <div className="ojt-week-period">{start} ~ {end}</div>
                </div>
                <div className="ojt-week-right">
                  <span className={`ojt-status ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default OJTJournal;
