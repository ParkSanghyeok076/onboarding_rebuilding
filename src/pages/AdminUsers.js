import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { registerUsers } from '../lib/edgeFunctions';
import './Pages.css';

function AdminUsers({ onBack }) {
  const [preview, setPreview] = useState(null);   // 파싱된 CSV 행 배열
  const [result, setResult] = useState(null);     // { success, failed }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setResult(null);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        // CSV 헤더: 사번,이름,부서,입사일,구분
        const rows = data.map(row => ({
          employee_id: row['사번']?.trim(),
          name: row['이름']?.trim(),
          department: row['부서']?.trim(),
          hire_date: row['입사일']?.trim(),
          employee_type: row['구분']?.trim(),
        }));

        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        const invalid = rows.filter(
          r => !r.employee_id || !r.name || !r.hire_date ||
               !datePattern.test(r.hire_date) ||
               !['신입', '경력'].includes(r.employee_type)
        );

        if (invalid.length > 0) {
          const badIds = invalid.map(r => r.employee_id || '(사번없음)').join(', ');
          setError(`형식 오류 ${invalid.length}건 (${badIds}): 사번·이름·입사일(YYYY-MM-DD)·구분(신입/경력) 확인 필요`);
          setPreview(null);
          return;
        }

        const ids = rows.map(r => r.employee_id);
        const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
        if (duplicates.length > 0) {
          setError(`중복 사번 ${duplicates.length}건: ${[...new Set(duplicates)].join(', ')}`);
          setPreview(null);
          return;
        }
        setPreview(rows);
      },
      error: (err) => setError('CSV 파싱 실패: ' + err.message),
    });
  };

  const handleRegister = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await registerUsers(preview);
      setResult(res);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>← 뒤로</button>
        <h1 className="page-title">직원 일괄 등록</h1>
      </div>

      <div className="admin-section">
        <p className="admin-guide">
          CSV 형식: <code>사번,이름,부서,입사일,구분</code>
          &nbsp;(입사일: YYYY-MM-DD, 구분: 신입 또는 경력)
        </p>
        <input type="file" accept=".csv" onChange={handleFile} ref={fileInputRef} />
      </div>

      {error && <p className="error-message">{error}</p>}

      {preview && (
        <div className="admin-section">
          <h2 className="section-title">미리보기 ({preview.length}명)</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>사번</th><th>이름</th><th>부서</th>
                <th>입사일</th><th>구분</th><th>온보딩 기간</th>
              </tr>
            </thead>
            <tbody>
              {preview.map(r => (
                <tr key={r.employee_id}>
                  <td>{r.employee_id}</td>
                  <td>{r.name}</td>
                  <td>{r.department || '—'}</td>
                  <td>{r.hire_date}</td>
                  <td>{r.employee_type}</td>
                  <td>
                    {r.employee_type === '신입'
                      ? `${r.hire_date} ~ +12주 (84일)`
                      : `${r.hire_date} ~ +4주 (28일)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            className="submit-button"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? '등록 중...' : `${preview.length}명 등록`}
          </button>
        </div>
      )}

      {result && (
        <div className="admin-section">
          <p className="success-message">성공 {result.success?.length ?? 0}건</p>
          {result.failed?.length > 0 && (
            <>
              <p className="error-message">실패 {result.failed.length}건</p>
              <ul>
                {result.failed.map(f => (
                  <li key={f.employee_id}>{f.employee_id}: {f.reason}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
