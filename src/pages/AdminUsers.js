import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { registerUsers } from '../lib/edgeFunctions';
import './Pages.css';
import './AdminUsers.css';

function AdminUsers({ onBack }) {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const parseFile = (file) => {
    if (!file) return;
    setResult(null);
    setError(null);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
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

  const handleFile = (e) => parseFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) parseFile(file);
    else setError('CSV 파일만 업로드할 수 있습니다.');
  };

  const handleRegister = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const res = await registerUsers(preview);
      setResult(res);
      setPreview(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-button" onClick={onBack}>← 뒤로</button>
        <h1 className="page-title">직원 일괄 등록</h1>
      </div>

      <div className="au-wrapper">
        {/* CSV 형식 안내 카드 */}
        <div className="au-guide-card">
          <div className="au-guide-icon">📋</div>
          <div className="au-guide-body">
            <div className="au-guide-title">CSV 파일 형식 안내</div>
            <div className="au-guide-cols">
              {['사번', '이름', '부서', '입사일', '구분'].map(col => (
                <span key={col} className="au-col-chip">{col}</span>
              ))}
            </div>
            <div className="au-guide-note">
              입사일: <code>YYYY-MM-DD</code> &nbsp;|&nbsp; 구분: <code>신입</code> 또는 <code>경력</code>
            </div>
          </div>
        </div>

        {/* 파일 업로드 존 */}
        {!preview && !result && (
          <div
            className={`au-dropzone${dragging ? ' au-dropzone--drag' : ''}${fileName ? ' au-dropzone--filled' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            {fileName ? (
              <>
                <div className="au-drop-icon au-drop-icon--ready">✅</div>
                <div className="au-drop-filename">{fileName}</div>
                <div className="au-drop-sub">다른 파일을 선택하려면 클릭하세요</div>
              </>
            ) : (
              <>
                <div className="au-drop-icon">+</div>
                <div className="au-drop-title">CSV 파일을 업로드하세요</div>
                <div className="au-drop-sub">클릭하거나 파일을 드래그하여 놓으세요</div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="au-error">
            <span className="au-error-icon">⚠️</span>
            {error}
            <button className="au-error-reset" onClick={handleReset}>다시 선택</button>
          </div>
        )}

        {/* 미리보기 테이블 */}
        {preview && (
          <div className="au-preview">
            <div className="au-preview-header">
              <span className="au-preview-title">미리보기 — {preview.length}명</span>
              <button className="au-cancel-btn" onClick={handleReset}>취소</button>
            </div>
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
            <div className="au-actions">
              <button className="submit-button" onClick={handleRegister} disabled={loading}>
                {loading ? '등록 중...' : `${preview.length}명 등록하기`}
              </button>
            </div>
          </div>
        )}

        {/* 등록 결과 */}
        {result && (
          <div className="au-result">
            <div className="au-result-success">
              <span>✅</span> 성공 <strong>{result.success?.length ?? 0}건</strong>
            </div>
            {result.failed?.length > 0 && (
              <div className="au-result-failed">
                <span>❌</span> 실패 <strong>{result.failed.length}건</strong>
                <ul className="au-failed-list">
                  {result.failed.map(f => (
                    <li key={f.employee_id}>{f.employee_id}: {f.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="au-again-btn" onClick={handleReset}>새 파일 등록</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
