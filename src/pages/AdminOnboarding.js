import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';

function SortIcon({ sortKey, col, sortAsc }) {
  if (sortKey !== col) return <span> ↑↓</span>;
  return <span>{sortAsc ? ' ↑' : ' ↓'}</span>;
}

// 날짜 정규화 헬퍼
function toDate(str) {
  if (!str) return null;
  const d = new Date(str);
  d.setHours(0, 0, 0, 0);
  return d;
}

// "2026-03-11" → "3/11"
function formatShortDate(str) {
  if (!str) return '—';
  const d = toDate(str);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 기간 포맷팅: "3/5 ~ 5/5"
function formatPeriod(startStr, endStr) {
  if (!startStr || !endStr) return '—';
  const start = formatShortDate(startStr);
  const end = formatShortDate(endStr);
  return `${start} ~ ${end}`;
}

function ProgramGridPopup({ user, onClose }) {
  const [imageUrls, setImageUrls] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSignedUrls = async () => {
      const urls = {};
      for (let i = 1; i <= 6; i++) {
        const imagePath = user.programs[i];
        if (imagePath) {
          const { data } = await supabase.storage
            .from('onboarding-images')
            .createSignedUrl(imagePath, 3600);
          if (data) urls[i] = data.signedUrl;
        }
      }
      setImageUrls(urls);
      setLoading(false);
    };
    loadSignedUrls();
  }, [user.programs]);

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="program-popup" onClick={e => e.stopPropagation()}>
        <div className="program-popup-header">
          <h3>{user.name} - 온보딩 프로그램</h3>
          <button className="program-popup-close" onClick={onClose}>✕</button>
        </div>
        <div className="prog-grid-popup">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="prog-grid-slot">
              {loading ? (
                <div style={{ width: '100%', height: '100%', background: '#f0f0f0' }} />
              ) : imageUrls[i] ? (
                <img src={imageUrls[i]} alt={`프로그램 ${i}`} />
              ) : (
                <div className="prog-grid-slot empty">
                  <span>미제출</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminOnboarding({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체'); // '전체' | '완료' | '미완료'
  const [sortKey, setSortKey] = useState(null); // 'name' | 'status'
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null); // ProgramGridPopup용

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const fetchData = async () => {
      // 1. 사용자 정보 조회 (hire_date, periods, ojt_plan_received 포함)
      const { data: users, error: userError } = await supabase
        .from('users')
        .select(`id, name, department, employee_type, hire_date,
                 period_1_start, period_1_end, period_2_start, period_2_end,
                 period_3_start, period_3_end, ojt_plan_received`)
        .eq('role', 'employee');

      if (userError || !users) {
        console.error('사용자 조회 실패:', userError?.message);
        setLoading(false);
        return;
      }

      // 2. 온보딩 제출 현황 조회
      const { data: subs, error: subsError } = await supabase
        .from('onboarding_submissions')
        .select('user_id, program_id, image_url');

      if (subsError) {
        console.error('온보딩 제출 현황 조회 실패:', subsError.message);
      }

      // 3. 설문조사 제출 현황 조회
      const { data: surveys, error: surveyError } = await supabase
        .from('survey_responses')
        .select('user_id, round_number, submitted_at');

      if (surveyError) {
        console.error('설문조사 조회 실패:', surveyError.message);
      }

      // 4. 데이터 맵 구성
      const subMap = {};
      for (const s of subs || []) {
        if (!subMap[s.user_id]) subMap[s.user_id] = {};
        subMap[s.user_id][Number(s.program_id)] = s.image_url;
      }

      const surveyMap = {};
      for (const s of surveys || []) {
        if (!surveyMap[s.user_id]) surveyMap[s.user_id] = [];
        surveyMap[s.user_id].push(Number(s.round_number));
      }

      // 5. 완료 여부 판별
      const isComplete = (u) => {
        const hasAllPrograms = Object.keys(subMap[u.id] || {}).length === 6;
        const hasOjtPlan = u.ojt_plan_received === true;

        // 필요한 설문 차수 확인
        const isNewHire = u.employee_type === '신입';
        const requiredRounds = isNewHire ? [1, 2, 3] : [1];
        const submittedRounds = surveyMap[u.id] || [];
        const hasAllSurveys = requiredRounds.every(r => submittedRounds.includes(r));

        return hasAllPrograms && hasOjtPlan && hasAllSurveys;
      };

      setRows(users.map(u => ({
        ...u,
        programs: subMap[u.id] || {},
        submittedRounds: surveyMap[u.id] || [],
        completed: isComplete(u),
      })));
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  // 계획서 체크박스 변경
  const handleOjtCheckChange = async (userId, checked) => {
    // 낙관적 업데이트
    setRows(rows.map(r => r.id === userId ? { ...r, ojt_plan_received: checked } : r));

    // DB 업데이트
    const { error } = await supabase
      .from('users')
      .update({ ojt_plan_received: checked })
      .eq('id', userId);

    if (error) {
      console.error('계획서 상태 업데이트 실패:', error.message);
      // 롤백
      setRows(rows.map(r => r.id === userId ? { ...r, ojt_plan_received: !checked } : r));
    }
  };

  let displayed = [...rows];
  if (filter === '완료') displayed = displayed.filter(r => r.completed);
  if (filter === '미완료') displayed = displayed.filter(r => !r.completed);
  if (sortKey === 'name') displayed.sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  if (sortKey === 'status') displayed.sort((a, b) => sortAsc ? (a.completed ? 1 : -1) : (a.completed ? -1 : 1));

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="page-title">📋 온보딩 현황</h1>
          <div className="admin-filter-group">
            {['전체', '완료', '미완료'].map(f => (
              <button
                key={f}
                className={`admin-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
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
                <th className="sortable" onClick={() => handleSort('name')}>
                  이름<SortIcon sortKey={sortKey} col="name" sortAsc={sortAsc} />
                </th>
                <th>팀</th>
                <th>유형</th>
                <th>기간</th>
                <th>계획서</th>
                <th>프로그램</th>
                <th>설문조사</th>
                <th className="sortable" onClick={() => handleSort('status')}>
                  상태<SortIcon sortKey={sortKey} col="status" sortAsc={sortAsc} />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(row => {
                const isNewHire = row.employee_type === '신입';
                const periodStart = toDate(isNewHire ? row.period_1_start : row.period_1_start);
                const periodEnd = toDate(isNewHire ? row.period_3_end : row.period_1_end);
                const periodStr = isNewHire
                  ? formatPeriod(row.period_1_start, row.period_3_end)
                  : formatPeriod(row.period_1_start, row.period_1_end);

                const programCount = Object.keys(row.programs).length;

                // 필요한 설문 차수
                const requiredRounds = isNewHire ? [1, 2, 3] : [1];

                return (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.department || '—'}</td>
                    <td>{row.employee_type || '—'}</td>

                    {/* 기간 */}
                    <td>{periodStr}</td>

                    {/* 계획서 */}
                    <td className="ojt-cell">
                      <input
                        type="checkbox"
                        className="ojt-checkbox"
                        checked={row.ojt_plan_received || false}
                        onChange={(e) => handleOjtCheckChange(row.id, e.target.checked)}
                      />
                    </td>

                    {/* 프로그램 */}
                    <td>
                      <span
                        className={`prog-count ${programCount === 6 ? 'done' : 'undone'}`}
                        onClick={() => setSelectedUser(row)}
                      >
                        {programCount}/6
                      </span>
                    </td>

                    {/* 설문조사 */}
                    <td className="survey-cell">
                      {requiredRounds.map(round => {
                        const p_start = toDate(row[`period_${round}_start`]);
                        const p_end = toDate(row[`period_${round}_end`]);
                        const isSubmitted = row.submittedRounds.includes(round);
                        const isUpcoming = p_start && today < p_start;
                        let icon, className;

                        if (isSubmitted) {
                          icon = '✅';
                          className = 'survey-icon-check';
                        } else if (isUpcoming) {
                          icon = '△';
                          className = 'survey-icon-tri';
                        } else {
                          icon = '❌';
                          className = 'survey-icon-x';
                        }

                        return (
                          <span key={round} className={`survey-icon ${className}`} title={`${round}차`}>
                            {icon}
                          </span>
                        );
                      })}
                    </td>

                    {/* 상태 */}
                    <td>
                      <span className={`status-badge ${row.completed ? 'done' : 'undone'}`}>
                        {row.completed ? '완료' : '미완료'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr><td colSpan={8} className="admin-empty">해당하는 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && <ProgramGridPopup user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
}

export default AdminOnboarding;
