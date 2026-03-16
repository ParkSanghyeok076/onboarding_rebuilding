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
  const EMPTY_ROW = () => ({ employee_id: '', name: '', department: '', hire_date: '', employee_type: '신입' });
  const [manualRows, setManualRows] = useState([EMPTY_ROW()]);

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

  const updateRow = (idx, field, value) => {
    setManualRows(prev => {
      const next = prev.map((r, i) => i === idx ? { ...r, [field]: value } : r);
      // 마지막 행 편집 중 데이터 입력 시 빈 행 자동 추가
      if (idx === prev.length - 1) {
        const last = next[next.length - 1];
        if (last.employee_id || last.name || last.hire_date) return [...next, EMPTY_ROW()];
      }
      return next;
    });
  };

  const deleteRow = (idx) => {
    setManualRows(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [EMPTY_ROW()] : next;
    });
  };

  const handleManualPaste = (e) => {
    const text = e.clipboardData.getData('text');
    // 탭이나 줄바꿈 없으면 일반 셀 붙여넣기로 처리
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const lines = text.trim().split('\n').filter(l => l.trim());
    const parsed = lines.map(line => {
      const cols = line.split('\t');
      const type = (cols[4] || '').trim();
      return {
        employee_id: (cols[0] || '').trim(),
        name: (cols[1] || '').trim(),
        department: (cols[2] || '').trim(),
        hire_date: (cols[3] || '').trim(),
        employee_type: ['신입', '경력'].includes(type) ? type : '신입',
      };
    });
    setManualRows([...parsed, EMPTY_ROW()]);
  };

  const handleManualRegister = async () => {
    const filled = manualRows.filter(r => r.employee_id || r.name || r.hire_date);
    if (filled.length === 0) {
      setError('입력된 데이터가 없습니다.');
      return;
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const invalid = filled.filter(r =>
      !r.employee_id || !r.name || !r.hire_date ||
      !datePattern.test(r.hire_date) ||
      !['신입', '경력'].includes(r.employee_type)
    );
    if (invalid.length > 0) {
      const badIds = invalid.map(r => r.employee_id || '(사번없음)').join(', ');
      setError(`형식 오류 ${invalid.length}건 (${badIds}): 사번·이름·입사일(YYYY-MM-DD)·구분(신입/경력) 확인 필요`);
      return;
    }
    const ids = filled.map(r => r.employee_id);
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicates.length > 0) {
      setError(`중복 사번 ${duplicates.length}건: ${[...new Set(duplicates)].join(', ')}`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await registerUsers(filled);
      setResult(res);
      setManualRows([EMPTY_ROW()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="au-wrapper">
        <div className="admin-header-left" style={{marginBottom: 8}}>
          <h1 className="page-title">👥 대상자 관리</h1>
        </div>
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

        {/* 수기입력 + 구분선 + CSV 업로드 — preview/result 없을 때만 표시 */}
        {!preview && !result && (
          <>
            <div className="au-manual" onPaste={handleManualPaste}>
              <div className="au-manual-header">
                <span className="au-manual-hint">💡 Ctrl+V 로 엑셀 데이터 붙여넣기 가능</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="au-cancel-btn"
                    onClick={() => { setManualRows([EMPTY_ROW()]); setError(null); }}
                  >
                    초기화
                  </button>
                  <button
                    className="submit-button au-manual-submit"
                    onClick={handleManualRegister}
                    disabled={loading || manualRows.every(r => !r.employee_id && !r.name && !r.hire_date)}
                  >
                    {loading ? '등록 중...' : `${manualRows.filter(r => r.employee_id || r.name || r.hire_date).length}명 등록하기`}
                  </button>
                </div>
              </div>

              <div className="au-manual-table-wrap">
                <table className="au-manual-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>사번 *</th>
                      <th>이름 *</th>
                      <th>부서</th>
                      <th>입사일 *</th>
                      <th>구분 *</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {manualRows.map((row, idx) => (
                      <tr key={idx} className={row.employee_id || row.name ? 'au-row-filled' : ''}>
                        <td className="au-row-num">{idx + 1}</td>
                        <td><input className="au-cell-input" value={row.employee_id} onChange={e => updateRow(idx, 'employee_id', e.target.value)} placeholder="사번" /></td>
                        <td><input className="au-cell-input" value={row.name} onChange={e => updateRow(idx, 'name', e.target.value)} placeholder="이름" /></td>
                        <td><input className="au-cell-input" value={row.department} onChange={e => updateRow(idx, 'department', e.target.value)} placeholder="부서" /></td>
                        <td><input className="au-cell-input au-cell-date" value={row.hire_date} onChange={e => updateRow(idx, 'hire_date', e.target.value)} placeholder="YYYY-MM-DD" /></td>
                        <td>
                          <select className="au-cell-select" value={row.employee_type} onChange={e => updateRow(idx, 'employee_type', e.target.value)}>
                            <option value="신입">신입</option>
                            <option value="경력">경력</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="au-row-delete"
                            onClick={() => deleteRow(idx)}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="au-add-row-btn" onClick={() => setManualRows(prev => [...prev, EMPTY_ROW()])}>
                + 행 추가
              </button>
            </div>

            <div className="au-divider">
              <div className="au-divider-line" />
              <span className="au-divider-text">또는 CSV 업로드</span>
              <div className="au-divider-line" />
            </div>

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
          </>
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
