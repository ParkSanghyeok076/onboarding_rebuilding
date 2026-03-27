import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import './MentorPage.css';

/* ── 상태 헬퍼 ── */
const STATUS_LABEL = { draft: '작성 중', submitted: '제출', approved: '승인', empty: '미작성' };
const STATUS_CLASS  = { draft: 'mp-badge--draft', submitted: 'mp-badge--submitted', approved: 'mp-badge--approved', empty: 'mp-badge--empty' };

function MentorPage({ user, onLogout, onPasswordChange }) {
  /* ── view: 'mentees' | 'weeks' | 'journal' ── */
  const [view, setView]               = useState('mentees');
  const [mentees, setMentees]         = useState([]);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [journals, setJournals]       = useState({});
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [comment, setComment]         = useState('');
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState('');
  const [loading, setLoading]         = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  /* ── 멘티 목록 로드 ── */
  const fetchMentees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, name, team, employee_id, employee_type, period_1_start, period_1_end, period_3_end')
      .eq('mentor_id', user.employee_id);
    if (!error && data) setMentees(data);
    setLoading(false);
  }, [user.employee_id]);

  useEffect(() => { fetchMentees(); }, [fetchMentees]);

  /* ── 멘티 선택 → OJT 일지 목록 로드 ── */
  const handleSelectMentee = async (mentee) => {
    setSelectedMentee(mentee);
    setSaveMsg('');
    const { data, error } = await supabase
      .from('ojt_journals')
      .select('*')
      .eq('user_id', mentee.id)
      .order('week_number');
    if (!error && data) {
      const map = {};
      data.forEach(j => { map[j.week_number] = j; });
      setJournals(map);
    }
    setView('weeks');
  };

  /* ── 주차 선택 → 일지 상세 ── */
  const handleSelectJournal = (journal) => {
    setSelectedJournal(journal);
    setComment(journal.mentor_comment || '');
    setSaveMsg('');
    setView('journal');
  };

  /* ── 코멘트 저장 ── */
  const handleSaveComment = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase
      .from('ojt_journals')
      .update({ mentor_comment: comment, updated_at: new Date().toISOString() })
      .eq('id', selectedJournal.id);
    if (!error) {
      setSaveMsg('저장됐습니다.');
      setSelectedJournal(prev => ({ ...prev, mentor_comment: comment }));
      setJournals(prev => ({ ...prev, [selectedJournal.week_number]: { ...prev[selectedJournal.week_number], mentor_comment: comment } }));
    } else {
      setSaveMsg('저장 실패: ' + error.message);
    }
    setSaving(false);
  };

  /* ── 승인 처리 ── */
  const handleApprove = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase
      .from('ojt_journals')
      .update({
        status: 'approved',
        mentor_comment: comment,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedJournal.id);
    if (!error) {
      setSaveMsg('승인 완료!');
      const updated = { ...selectedJournal, status: 'approved', mentor_comment: comment };
      setSelectedJournal(updated);
      setJournals(prev => ({ ...prev, [selectedJournal.week_number]: updated }));
    } else {
      setSaveMsg('승인 실패: ' + error.message);
    }
    setSaving(false);
  };

  const totalWeeks = (m) => m?.employee_type === '신입' ? 12 : 4;

  /* ════════════════════════════════════════
     뷰 1: 멘티 목록
  ════════════════════════════════════════ */
  const renderMentees = () => (
    <div className="mp-container">
      <h1 className="mp-title">👥 담당 멘티</h1>
      <p className="mp-subtitle">총 {mentees.length}명의 멘티가 배정되어 있습니다.</p>
      {loading ? (
        <p className="mp-loading">로딩 중...</p>
      ) : mentees.length === 0 ? (
        <div className="mp-empty">배정된 멘티가 없습니다.</div>
      ) : (
        <div className="mp-mentee-list">
          {mentees.map(m => (
            <div key={m.id} className="mp-mentee-card" onClick={() => handleSelectMentee(m)}>
              <div className="mp-mentee-left">
                <div className="mp-mentee-name">{m.name}</div>
                <div className="mp-mentee-meta">{m.team} · {m.employee_id} · {m.employee_type}</div>
              </div>
              <div className="mp-mentee-right">
                <span className="mp-mentee-period">
                  {m.period_1_start} ~ {m.employee_type === '신입' ? m.period_3_end : m.period_1_end}
                </span>
                <span className="mp-chevron">→</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════
     뷰 2: OJT 주차 목록
  ════════════════════════════════════════ */
  const renderWeeks = () => {
    const weeks = totalWeeks(selectedMentee);
    return (
      <div className="mp-container">
        <button className="mp-back-btn" onClick={() => setView('mentees')}>← 멘티 목록으로</button>
        <h1 className="mp-title">📓 {selectedMentee.name}님의 OJT 일지</h1>
        <p className="mp-subtitle">
          제출 완료&nbsp;
          <strong>{Object.values(journals).filter(j => ['submitted','approved'].includes(j.status)).length}</strong>
          &nbsp;/ {weeks}주
        </p>
        <div className="mp-week-list">
          {Array.from({ length: weeks }, (_, i) => i + 1).map(weekNum => {
            const j = journals[weekNum];
            const status = j?.status || 'empty';
            const isClickable = ['submitted', 'approved', 'draft'].includes(status);
            return (
              <div
                key={weekNum}
                className={`mp-week-card ${isClickable ? 'clickable' : 'disabled'}`}
                onClick={() => isClickable && handleSelectJournal(j)}
              >
                <div className="mp-week-info">
                  <span className="mp-week-num">{weekNum}주차</span>
                  {j && <span className="mp-week-period">{j.week_start_date} ~ {j.week_end_date}</span>}
                </div>
                <div className="mp-week-right">
                  {j?.mentor_comment && <span className="mp-commented">코멘트 완료</span>}
                  <span className={`mp-badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════
     뷰 3: 일지 상세 + 코멘트/승인
  ════════════════════════════════════════ */
  const renderJournal = () => {
    const j = selectedJournal;
    const isApproved = j.status === 'approved';
    return (
      <div className="mp-container mp-container--wide">
        <button className="mp-back-btn" onClick={() => setView('weeks')}>← 주차 목록으로</button>

        <div className="mp-journal-card">
          {/* 헤더 */}
          <div className="mp-journal-header">
            <div className="mp-journal-header-left">
              <img src="/YURA_SYMBOL.png" alt="YURA" className="mp-journal-logo" />
            </div>
            <div className="mp-journal-header-center">
              <span className="mp-journal-title">
                {selectedMentee.team} {selectedMentee.name} — {j.week_number}주차 OJT 일지
              </span>
            </div>
            <div className="mp-journal-header-right">
              <div className="mp-journal-dates">
                <span>{j.week_start_date}</span>
                <span>{j.week_end_date}</span>
              </div>
              <span className={`mp-badge ${STATUS_CLASS[j.status]}`}>{STATUS_LABEL[j.status]}</span>
            </div>
          </div>

          {/* 본문 */}
          <table className="mp-table">
            <colgroup>
              <col style={{ width: '120px' }} />
              <col />
            </colgroup>
            <thead>
              <tr><th className="mp-th" colSpan={2}>세부 교육 내용</th></tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="mp-td-content" style={{ padding: 0 }}>
                  <textarea
                    className="mp-cell-textarea mp-education-textarea"
                    value={j.education_content || ''}
                    readOnly
                  />
                </td>
              </tr>
              <tr>
                <td className="mp-td-section">어려웠던 점</td>
                <td className="mp-td-content mp-section-content">
                  <textarea className="mp-cell-textarea" value={j.challenges || ''} readOnly rows={2} />
                </td>
              </tr>
              <tr>
                <td className="mp-td-section">다음 주 목표</td>
                <td className="mp-td-content mp-section-content">
                  <textarea className="mp-cell-textarea" value={j.next_week_goals || ''} readOnly rows={2} />
                </td>
              </tr>
              <tr>
                <td className="mp-td-section mp-mentor-cell">
                  지도의견<br /><span className="mp-mentor-sub">(멘토)</span>
                </td>
                <td className="mp-td-content mp-mentor-content">
                  <textarea
                    className="mp-cell-textarea"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    disabled={isApproved}
                    placeholder={isApproved ? '' : '멘티에게 전달할 지도의견을 작성해 주세요.'}
                    rows={4}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* 액션 버튼 */}
          <div className="mp-actions">
            {saveMsg && (
              <span className={`mp-save-msg ${saveMsg.includes('실패') ? 'error' : 'success'}`}>
                {saveMsg}
              </span>
            )}
            {!isApproved && (
              <>
                <button className="mp-btn mp-btn-secondary" onClick={handleSaveComment} disabled={saving}>
                  {saving ? '저장 중...' : '코멘트 저장'}
                </button>
                <button
                  className="mp-btn mp-btn-primary"
                  onClick={handleApprove}
                  disabled={saving}
                >
                  {saving ? '처리 중...' : '✓ 승인하기'}
                </button>
              </>
            )}
            {isApproved && (
              <span className="mp-approved-label">✅ 승인 완료된 일지입니다.</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar */}
      <div className="mp-navbar">
        <div className="mp-navbar-left">
          <h2>YURA 온보딩 시스템</h2>
        </div>
        <div className="mp-navbar-right">
          <span className="mp-navbar-name">{user.team || ''} {user.name} (멘토)</span>
          <div className="mp-profile-wrap">
            <button className="mp-profile-btn" onClick={() => setShowDropdown(d => !d)}>
              👤 프로필 ▼
            </button>
            {showDropdown && (
              <div className="mp-dropdown">
                <button className="mp-dropdown-item" onClick={() => { setShowDropdown(false); onPasswordChange(); }}>
                  🔑 비밀번호 변경
                </button>
                <button className="mp-dropdown-item mp-logout" onClick={() => { setShowDropdown(false); onLogout(); }}>
                  🚪 로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div style={{ flex: 1, background: '#f1f5f9' }}>
        {view === 'mentees' && renderMentees()}
        {view === 'weeks'   && renderWeeks()}
        {view === 'journal' && renderJournal()}
      </div>

      <footer style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '13px', borderTop: '1px solid #eee' }}>
        📞 문의 : 인사기획팀 박상혁 선임(1456)
      </footer>
    </div>
  );
}

export default MentorPage;
