import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { registerUsers } from '../lib/edgeFunctions';
import './AdminMentorRequests.css';

const STATUS_LABEL = { pending: '승인 대기', approved: '승인 완료', rejected: '거절' };
const STATUS_CLASS  = { pending: 'amr-badge--pending', approved: 'amr-badge--approved', rejected: 'amr-badge--rejected' };

function AdminMentorRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState({}); // { [id]: true }
  const [msg, setMsg] = useState({});               // { [id]: '메시지' }
  const [filter, setFilter] = useState('pending');  // 'all' | 'pending' | 'approved' | 'rejected'

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('mentor_requests')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (!error && data) setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  /* ── 승인 ── */
  const handleApprove = async (req) => {
    setProcessing(p => ({ ...p, [req.id]: true }));
    setMsg(m => ({ ...m, [req.id]: '' }));

    try {
      // 1. 멘토 계정 생성 (중복이면 Edge Function에서 자동 skip)
      const res = await registerUsers([{
        employee_id: req.mentor_employee_id,
        name: req.mentor_name,
        department: req.mentee_department ?? '',
        role: 'mentor',
      }]);

      if (res.failed?.length > 0 && res.success?.length === 0) {
        setMsg(m => ({ ...m, [req.id]: `계정 생성 실패: ${res.failed[0].reason}` }));
        setProcessing(p => ({ ...p, [req.id]: false }));
        return;
      }

      // 2. mentor_requests status → approved
      await supabase
        .from('mentor_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', req.id);

      setRequests(prev =>
        prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r)
      );
      setMsg(m => ({ ...m, [req.id]: '승인 완료' }));
    } catch (e) {
      setMsg(m => ({ ...m, [req.id]: `오류: ${e.message}` }));
    }

    setProcessing(p => ({ ...p, [req.id]: false }));
  };

  /* ── 거절 ── */
  const handleReject = async (req) => {
    setProcessing(p => ({ ...p, [req.id]: true }));
    await supabase
      .from('mentor_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', req.id);
    setRequests(prev =>
      prev.map(r => r.id === req.id ? { ...r, status: 'rejected' } : r)
    );
    setProcessing(p => ({ ...p, [req.id]: false }));
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="amr-wrap">
      {/* 필터 탭 */}
      <div className="amr-tabs">
        {[
          { key: 'pending',  label: `승인 대기 ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
          { key: 'approved', label: '승인 완료' },
          { key: 'rejected', label: '거절' },
          { key: 'all',      label: '전체' },
        ].map(t => (
          <button
            key={t.key}
            className={`amr-tab${filter === t.key ? ' active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      {loading ? (
        <p className="amr-loading">로딩 중...</p>
      ) : filtered.length === 0 ? (
        <div className="amr-empty">요청이 없습니다.</div>
      ) : (
        <table className="amr-table">
          <thead>
            <tr>
              <th>신청일</th>
              <th>신입사원</th>
              <th>부서</th>
              <th>멘토 이름</th>
              <th>멘토 사번</th>
              <th>상태</th>
              <th>처리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(req => (
              <tr key={req.id}>
                <td>{req.created_at?.slice(0, 10)}</td>
                <td>{req.mentee_name ?? '-'}</td>
                <td>{req.mentee_department ?? '-'}</td>
                <td className="amr-mentor-name">{req.mentor_name}</td>
                <td>{req.mentor_employee_id}</td>
                <td>
                  <span className={`amr-badge ${STATUS_CLASS[req.status]}`}>
                    {STATUS_LABEL[req.status]}
                  </span>
                </td>
                <td>
                  {req.status === 'pending' ? (
                    <div className="amr-actions">
                      <button
                        className="amr-btn amr-btn--approve"
                        onClick={() => handleApprove(req)}
                        disabled={processing[req.id]}
                      >
                        {processing[req.id] ? '처리 중...' : '승인'}
                      </button>
                      <button
                        className="amr-btn amr-btn--reject"
                        onClick={() => handleReject(req)}
                        disabled={processing[req.id]}
                      >
                        거절
                      </button>
                      {msg[req.id] && (
                        <span className={`amr-msg ${msg[req.id].includes('실패') || msg[req.id].includes('오류') ? 'error' : 'success'}`}>
                          {msg[req.id]}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="amr-done">
                      {req.status === 'approved' ? '✓ 처리 완료' : '✕ 거절됨'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminMentorRequests;
