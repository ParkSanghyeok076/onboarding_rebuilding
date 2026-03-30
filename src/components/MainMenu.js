import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import OnboardingTimeline from './OnboardingTimeline';
import './MainMenu.css';

const TODAY = new Date().toISOString().slice(0, 10);

function MainMenu({ user, onSelectMenu }) {
  const [programCount, setProgramCount] = useState(0);
  const [ojtJournals, setOjtJournals]   = useState({});

  // 멘토 등록 요청
  const [showMentorModal, setShowMentorModal] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorId,   setMentorId]   = useState('');
  const [mentorSaving, setMentorSaving] = useState(false);
  const [mentorRequest, setMentorRequest] = useState(null); // {id, status, mentor_name, mentor_employee_id}

  /* ── 데이터 fetch ── */
  const fetchData = useCallback(async () => {
    const [progRes, ojtRes, reqRes] = await Promise.all([
      supabase.from('onboarding_submissions').select('program_id').eq('user_id', user.id),
      supabase.from('ojt_journals').select('week_number,status').eq('user_id', user.id),
      supabase.from('mentor_requests').select('*').eq('mentee_id', user.id).order('created_at', { ascending: false }).limit(1),
    ]);
    if (!progRes.error) setProgramCount(progRes.data?.length ?? 0);
    if (!ojtRes.error && ojtRes.data) {
      const map = {};
      ojtRes.data.forEach(j => { map[j.week_number] = j.status; });
      setOjtJournals(map);
    }
    if (!reqRes.error && reqRes.data?.length > 0) {
      const req = reqRes.data[0];
      setMentorRequest(req);
      setMentorName(req.mentor_name);
      setMentorId(req.mentor_employee_id);
    } else if (user.mentor_name) {
      // 기존에 직접 저장한 멘토 정보가 있으면 표시
      setMentorName(user.mentor_name);
      setMentorId(user.mentor_id || '');
    }
  }, [user.id, user.mentor_name, user.mentor_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── 멘토 등록 요청하기 ── */
  const handleMentorRequest = async () => {
    setMentorSaving(true);
    const cleanId = mentorId.replace(/\D/g, '').slice(0, 6);

    // users 테이블에도 mentor_name, mentor_id 저장 (매칭용)
    await supabase.from('users').update({ mentor_name: mentorName, mentor_id: cleanId }).eq('id', user.id);
    user.mentor_name = mentorName;
    user.mentor_id   = cleanId;

    // mentor_requests에 요청 삽입
    const { data, error } = await supabase.from('mentor_requests').insert({
      mentee_id: user.id,
      mentee_name: user.name,
      mentee_department: user.department,
      mentor_name: mentorName,
      mentor_employee_id: cleanId,
    }).select().single();

    if (!error && data) setMentorRequest(data);
    setMentorSaving(false);
    setShowMentorModal(false);
  };

  /* ── 멘토 요청 수정 ── */
  const handleMentorUpdate = async () => {
    if (!mentorRequest) return;
    setMentorSaving(true);
    const cleanId = mentorId.replace(/\D/g, '').slice(0, 6);

    await supabase.from('users').update({ mentor_name: mentorName, mentor_id: cleanId }).eq('id', user.id);
    user.mentor_name = mentorName;
    user.mentor_id   = cleanId;

    const { data, error } = await supabase.from('mentor_requests')
      .update({ mentor_name: mentorName, mentor_employee_id: cleanId, updated_at: new Date().toISOString() })
      .eq('id', mentorRequest.id)
      .select().single();

    if (!error && data) setMentorRequest(data);
    setMentorSaving(false);
    setShowMentorModal(false);
  };

  /* ── 멘토 요청 취소 ── */
  const handleMentorCancel = async () => {
    if (!mentorRequest) return;
    setMentorSaving(true);
    await supabase.from('mentor_requests').delete().eq('id', mentorRequest.id);
    await supabase.from('users').update({ mentor_name: null, mentor_id: null }).eq('id', user.id);
    user.mentor_name = null;
    user.mentor_id   = null;
    setMentorRequest(null);
    setMentorName('');
    setMentorId('');
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
  const mentorSet = !!(mentorName);
  const reqStatus = mentorRequest?.status; // 'pending' | 'approved' | 'rejected' | undefined

  const isCareer = user.employee_type === '경력';

  const menuItems = [
    { id: 'announcements', icon: '📢', title: '공지사항',      description: '중요 공지사항 및 자료 확인',   color: '#344dbe' },
    { id: 'onboarding',    icon: '📋', title: '온보딩 프로그램', description: '6가지 온보딩 활동 수행',     color: '#4f67d8' },
    { id: 'survey',        icon: '📝', title: '설문조사',       description: '온보딩 과정 설문조사',        color: '#7b8fe8' },
    ...(!isCareer ? [{ id: 'ojt-journal', icon: '📓', title: 'OJT 일지', description: '주간 학습 내용 기록 및 제출', color: '#344dbe' }] : []),
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
                  {mentorName}
                  {mentorId && <span className="dash-mentor-id"> | {mentorId}</span>}
                </div>
                <div className="dash-mentor-status">
                  {reqStatus === 'pending' && <span className="dash-badge dash-badge--draft">승인 대기</span>}
                  {reqStatus === 'approved' && <span className="dash-badge dash-badge--approved">승인 완료</span>}
                  {reqStatus === 'rejected' && <span className="dash-badge dash-badge--empty">거절</span>}
                  {reqStatus === 'pending' && (
                    <button className="dash-mentor-edit" onClick={() => setShowMentorModal(true)}>수정</button>
                  )}
                  {(reqStatus === 'rejected' || !reqStatus) && mentorSet && (
                    <button className="dash-mentor-edit" onClick={() => setShowMentorModal(true)}>수정</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="dash-mentor-empty">
                <span>멘토 정보가 없습니다.</span>
                <button className="dash-btn-primary" onClick={() => setShowMentorModal(true)}>멘토 등록 요청</button>
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

          {/* 5. OJT 일지 (신입만) */}
          {!isCareer && (
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
          )}
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

      {/* ── 멘토 등록 요청 모달 ── */}
      {showMentorModal && (
        <div className="dash-modal-overlay" onClick={() => setShowMentorModal(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <h3 className="dash-modal-title">
              {mentorRequest?.status === 'pending' ? '멘토 등록 요청 수정' : '멘토 등록 요청'}
            </h3>
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
              {mentorRequest?.status === 'pending' && (
                <button className="dash-btn-danger" onClick={handleMentorCancel} disabled={mentorSaving}>
                  요청 취소
                </button>
              )}
              <button className="dash-btn-secondary" onClick={() => setShowMentorModal(false)}>닫기</button>
              <button
                className="dash-btn-primary"
                onClick={mentorRequest?.status === 'pending' ? handleMentorUpdate : handleMentorRequest}
                disabled={mentorSaving || !mentorName.trim() || mentorId.length < 6}
              >
                {mentorSaving ? '처리 중...' : mentorRequest?.status === 'pending' ? '수정하기' : '등록 요청하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainMenu;
