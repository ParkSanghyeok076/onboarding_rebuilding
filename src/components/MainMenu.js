import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import OnboardingTimeline from './OnboardingTimeline';
import './MainMenu.css';

const TODAY = new Date().toISOString().slice(0, 10);

function MainMenu({ user, onSelectMenu }) {
  const [programCount, setProgramCount] = useState(0);
  const [ojtJournals, setOjtJournals]   = useState({});

  // 멘토 입력 팝업
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorName, setMentorName] = useState(user.mentor_name || '');
  const [mentorId,   setMentorId]   = useState(user.mentor_id   || '');
  const [mentorSaving, setMentorSaving] = useState(false);

  /* ── 데이터 fetch ── */
  const fetchData = useCallback(async () => {
    const [progRes, ojtRes] = await Promise.all([
      supabase.from('onboarding_submissions').select('program_id').eq('user_id', user.id),
      supabase.from('ojt_journals').select('week_number,status').eq('user_id', user.id),
    ]);
    if (!progRes.error) setProgramCount(progRes.data?.length ?? 0);
    if (!ojtRes.error && ojtRes.data) {
      const map = {};
      ojtRes.data.forEach(j => { map[j.week_number] = j.status; });
      setOjtJournals(map);
    }
  }, [user.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── 멘토 저장 ── */
  const handleMentorSave = async () => {
    setMentorSaving(true);
    const cleanId = mentorId.replace(/\D/g, '').slice(0, 6);
    await supabase.from('users').update({ mentor_name: mentorName, mentor_id: cleanId }).eq('id', user.id);
    user.mentor_name = mentorName;
    user.mentor_id   = cleanId;
    setMentorSaving(false);
    setShowMentorModal(false);
  };

  /* ── 헬퍼 ── */
  const addDays = (dateStr, days) => {
    const d = new Date(dateStr); d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const totalWeeks    = user.employee_type === '신입' ? 12 : 4;
  const hireDate      = user.period_1_start;
  const currentWeekNum = hireDate
    ? Math.min(Math.max(1, Math.floor((new Date(TODAY) - new Date(hireDate)) / (7 * 24 * 3600 * 1000)) + 1), totalWeeks)
    : 1;

  /* 현재 주차 OJT 상태 */
  const getOjtStatus = (weekNum) => {
    const s = ojtJournals[weekNum];
    if (s === 'approved')  return { label: '승인',    cls: 'dash-badge--approved'  };
    if (s === 'submitted') return { label: '제출',    cls: 'dash-badge--submitted' };
    if (s === 'draft')     return { label: '작성 중', cls: 'dash-badge--draft'     };
    if (!hireDate) return { label: '미작성', cls: 'dash-badge--empty' };
    const weekStart = addDays(hireDate, (weekNum - 1) * 7);
    if (TODAY < weekStart) return { label: '미작성', cls: 'dash-badge--empty' };
    return { label: '미작성', cls: 'dash-badge--empty' };
  };

  /* 가장 가까운 설문조사 */
  const getNearestSurvey = () => {
    const rounds = user.employee_type === '신입' ? [1, 2, 3] : [1];
    for (const r of rounds) {
      const start = user[`period_${r}_start`];
      const end   = user[`period_${r}_end`];
      if (!start || !end) continue;
      if (TODAY >= start && TODAY <= end) return { round: r, start, end, status: 'active' };
    }
    for (const r of rounds) {
      const start = user[`period_${r}_start`];
      const end   = user[`period_${r}_end`];
      if (start && TODAY < start) return { round: r, start, end, status: 'upcoming' };
    }
    // 모두 지났으면 마지막 차수 반환
    const last = rounds[rounds.length - 1];
    return { round: last, start: user[`period_${last}_start`], end: user[`period_${last}_end`], status: 'done' };
  };

  const survey   = getNearestSurvey();
  const ojtSt    = getOjtStatus(currentWeekNum);
  const mentorSet = !!(user.mentor_name || mentorName);

  const menuItems = [
    { id: 'announcements', icon: '📢', title: '공지사항',      description: '중요 공지사항 및 자료 확인',   color: '#344dbe' },
    { id: 'onboarding',    icon: '📋', title: '온보딩 프로그램', description: '6가지 온보딩 활동 수행',     color: '#4f67d8' },
    { id: 'survey',        icon: '📝', title: '설문조사',       description: '온보딩 과정 설문조사',        color: '#7b8fe8' },
    { id: 'ojt-journal',   icon: '📓', title: 'OJT 일지',      description: '주간 학습 내용 기록 및 제출',  color: '#344dbe' },
  ];

  return (
    <div className="main-menu">
      <div className="main-layout">

        {/* ── 좌측 대시보드 ── */}
        <div className="dashboard-panel">
          <div className="dash-greeting">
            <span className="dash-name">{user.name}님</span>
            <span className="dash-hello"> 환영합니다! 👋</span>
          </div>

          {/* 1. 타임라인 */}
          <div className="dash-widget">
            <div className="dash-widget-title">온보딩 진행 현황</div>
            <OnboardingTimeline user={user} />
          </div>

          {/* 2. 멘토 정보 */}
          <div className="dash-widget">
            <div className="dash-widget-title">담당 멘토</div>
            {mentorSet ? (
              <div className="dash-mentor-info">
                <div className="dash-mentor-name">
                  {user.mentor_name || mentorName}
                  {(user.mentor_id || mentorId) && (
                    <span className="dash-mentor-id"> | {user.mentor_id || mentorId}</span>
                  )}
                </div>
                <button className="dash-mentor-edit" onClick={() => setShowMentorModal(true)}>수정</button>
              </div>
            ) : (
              <div className="dash-mentor-empty">
                <span>멘토 정보가 없습니다.</span>
                <button className="dash-btn-primary" onClick={() => setShowMentorModal(true)}>멘토 정보 입력</button>
              </div>
            )}
          </div>

          {/* 3. 온보딩 프로그램 */}
          <div className="dash-widget">
            <div className="dash-widget-title">온보딩 프로그램</div>
            <div className="dash-prog-row">
              <span className="dash-prog-count"><strong>{programCount}</strong> / 6 완료</span>
              <button className="dash-link-btn" onClick={() => onSelectMenu('onboarding')}>바로가기 →</button>
            </div>
            <div className="dash-prog-bar-bg">
              <div className="dash-prog-bar-fill" style={{ width: `${(programCount / 6) * 100}%` }} />
            </div>
          </div>

          {/* 4. 설문조사 */}
          <div className="dash-widget">
            <div className="dash-widget-title">설문조사 일정</div>
            {survey ? (
              <div className="dash-survey-row">
                <div className="dash-survey-info">
                  <span className="dash-survey-round">{survey.round}차 설문</span>
                  <span className="dash-survey-period">{survey.start} ~ {survey.end}</span>
                </div>
                <span className={`dash-badge ${
                  survey.status === 'active'   ? 'dash-badge--submitted' :
                  survey.status === 'upcoming' ? 'dash-badge--empty'     : 'dash-badge--approved'
                }`}>
                  {survey.status === 'active' ? '진행 중' : survey.status === 'upcoming' ? '예정' : '종료'}
                </span>
              </div>
            ) : (
              <p className="dash-empty-text">설문 정보 없음</p>
            )}
          </div>

          {/* 5. OJT 일지 */}
          <div className="dash-widget">
            <div className="dash-widget-title">OJT 일지</div>
            <div className="dash-ojt-row">
              <div className="dash-ojt-info">
                <span className="dash-ojt-week">{currentWeekNum}주차</span>
                <span className={`dash-badge ${ojtSt.cls}`}>{ojtSt.label}</span>
              </div>
              <div className="dash-ojt-summary">
                제출 완료&nbsp;
                <strong>{Object.values(ojtJournals).filter(s => s === 'submitted' || s === 'approved').length}</strong>
                &nbsp;/ {totalWeeks}주
              </div>
            </div>
          </div>
        </div>

        {/* ── 우측 메뉴 카드 2×2 ── */}
        <div className="menu-cards-panel">
          {menuItems.map(item => (
            <div
              key={item.id}
              className="menu-card"
              onClick={() => onSelectMenu(item.id)}
              style={{ borderColor: item.color }}
            >
              <div className="menu-icon">{item.icon}</div>
              <h3 className="menu-card-title">{item.title}</h3>
              <p className="menu-card-description">{item.description}</p>
              <div className="menu-card-arrow" style={{ color: item.color }}>→</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 멘토 입력 모달 ── */}
      {showMentorModal && (
        <div className="dash-modal-overlay" onClick={() => setShowMentorModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <h3 className="dash-modal-title">멘토 정보 입력</h3>
            <div className="dash-modal-field">
              <label>멘토 이름</label>
              <input
                type="text"
                value={mentorName}
                onChange={e => setMentorName(e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>
            <div className="dash-modal-field">
              <label>멘토 사번 (6자리)</label>
              <input
                type="text"
                value={mentorId}
                onChange={e => setMentorId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="예: 223069"
                maxLength={6}
              />
            </div>
            <div className="dash-modal-actions">
              <button className="dash-btn-secondary" onClick={() => setShowMentorModal(false)}>취소</button>
              <button
                className="dash-btn-primary"
                onClick={handleMentorSave}
                disabled={mentorSaving || !mentorName.trim()}
              >
                {mentorSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
