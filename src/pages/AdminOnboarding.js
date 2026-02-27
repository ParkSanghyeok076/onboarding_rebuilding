import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';

function SortIcon({ sortKey, col, sortAsc }) {
  if (sortKey !== col) return <span> ↑↓</span>;
  return <span>{sortAsc ? ' ↑' : ' ↓'}</span>;
}

function AdminOnboarding({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체'); // '전체' | '완료' | '미완료'
  const [sortKey, setSortKey] = useState(null); // 'name' | 'status'
  const [sortAsc, setSortAsc] = useState(true);
  const [imageUrl, setImageUrl] = useState(null); // 팝업용
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, department, employee_type')
        .eq('role', 'employee');

      if (userError || !users) { setLoading(false); return; }

      const { data: subs, error: subsError } = await supabase
        .from('onboarding_submissions')
        .select('user_id, program_id, image_url');

      if (subsError) {
        console.error('온보딩 제출 현황 조회 실패:', subsError.message);
      }

      const subMap = {};
      for (const s of subs || []) {
        if (!subMap[s.user_id]) subMap[s.user_id] = {};
        subMap[s.user_id][Number(s.program_id)] = s.image_url;
      }

      setRows(users.map(u => ({
        ...u,
        programs: subMap[u.id] || {},
        completed: Object.keys(subMap[u.id] || {}).length === 6,
      })));
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleImageClick = async (storagePath) => {
    if (imageLoading) return;
    setImageLoading(true);
    const { data, error } = await supabase.storage
      .from('onboarding-images')
      .createSignedUrl(storagePath, 3600);
    if (data) setImageUrl(data.signedUrl);
    else alert('이미지를 불러올 수 없습니다: ' + (error?.message || '알 수 없는 오류'));
    setImageLoading(false);
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
                {[1,2,3,4,5,6].map(n => <th key={n}>{n}</th>)}
                <th className="sortable" onClick={() => handleSort('status')}>
                  상태<SortIcon sortKey={sortKey} col="status" sortAsc={sortAsc} />
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(row => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.department || '—'}</td>
                  <td>{row.employee_type || '—'}</td>
                  {[1,2,3,4,5,6].map(n => (
                    <td key={n} className="program-cell">
                      {row.programs[n]
                        ? <span className="program-done" onClick={() => handleImageClick(row.programs[n])}>✅</span>
                        : <span className="program-none">❌</span>
                      }
                    </td>
                  ))}
                  <td>
                    <span className={`status-badge ${row.completed ? 'done' : 'undone'}`}>
                      {row.completed ? '완료' : '미완료'}
                    </span>
                  </td>
                </tr>
              ))}
              {displayed.length === 0 && (
                <tr><td colSpan={10} className="admin-empty">해당하는 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {imageUrl && (
        <div className="confirm-overlay" onClick={() => setImageUrl(null)}>
          <div className="image-popup" onClick={e => e.stopPropagation()}>
            <button className="image-popup-close" onClick={() => setImageUrl(null)}>✕</button>
            <img src={imageUrl} alt="제출 이미지" className="image-popup-img" />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOnboarding;
