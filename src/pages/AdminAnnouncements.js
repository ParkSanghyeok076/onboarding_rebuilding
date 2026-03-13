import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';
import './AdminAnnouncements.css';

function AdminAnnouncements({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false });
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', content: '', is_pinned: false });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [removePdf, setRemovePdf] = useState(false);
  const [newPdfFile, setNewPdfFile] = useState(null);
  const newPdfRef = useRef(null);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });
    if (!error) setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const enterEditMode = () => {
    setEditForm({ title: selected.title, content: selected.content, is_pinned: selected.is_pinned });
    setRemovePdf(false);
    setNewPdfFile(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setRemovePdf(false);
    setNewPdfFile(null);
    if (newPdfRef.current) newPdfRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 본문을 입력해 주세요.');
      return;
    }
    setSubmitting(true);

    let pdf_url = null;
    if (pdfFile) {
      const filePath = `${Date.now()}_${pdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('announcements-files')
        .upload(filePath, pdfFile);
      if (uploadError) {
        alert('PDF 업로드 실패: ' + uploadError.message);
        setSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('announcements-files')
        .getPublicUrl(filePath);
      pdf_url = urlData.publicUrl;
    }

    const { error } = await supabase.from('announcements').insert({
      title: form.title,
      content: form.content,
      is_pinned: form.is_pinned,
      author: '인사기획팀 박상혁',
      pdf_url,
    });

    if (error) {
      alert('등록 실패: ' + error.message);
    } else {
      setModalOpen(false);
      setForm({ title: '', content: '', is_pinned: false });
      setPdfFile(null);
      fetchAnnouncements();
    }
    setSubmitting(false);
  };

  const handleUpdate = async () => {
    if (!editForm.title.trim() || !editForm.content.trim()) {
      alert('제목과 본문을 입력해 주세요.');
      return;
    }
    setEditSubmitting(true);

    let pdf_url = selected.pdf_url;

    // 기존 PDF 삭제
    if (removePdf && selected.pdf_url) {
      const filePath = selected.pdf_url.split('/').pop();
      await supabase.storage.from('announcements-files').remove([filePath]);
      pdf_url = null;
    }

    // 새 PDF 업로드
    if (newPdfFile) {
      // 기존 파일이 있으면 먼저 삭제
      if (selected.pdf_url && !removePdf) {
        const oldPath = selected.pdf_url.split('/').pop();
        await supabase.storage.from('announcements-files').remove([oldPath]);
      }
      const filePath = `${Date.now()}_${newPdfFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('announcements-files')
        .upload(filePath, newPdfFile);
      if (uploadError) {
        alert('PDF 업로드 실패: ' + uploadError.message);
        setEditSubmitting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from('announcements-files')
        .getPublicUrl(filePath);
      pdf_url = urlData.publicUrl;
    }

    const { error } = await supabase
      .from('announcements')
      .update({ title: editForm.title, content: editForm.content, is_pinned: editForm.is_pinned, pdf_url })
      .eq('id', selected.id);

    if (error) {
      alert('수정 실패: ' + error.message);
    } else {
      const updated = { ...selected, title: editForm.title, content: editForm.content, is_pinned: editForm.is_pinned, pdf_url };
      setSelected(updated);
      setIsEditing(false);
      setRemovePdf(false);
      setNewPdfFile(null);
      if (newPdfRef.current) newPdfRef.current.value = '';
      fetchAnnouncements();
    }
    setEditSubmitting(false);
  };

  const handleDelete = async (announcement) => {
    if (!window.confirm(`"${announcement.title}" 공지를 삭제하시겠습니까?`)) return;

    if (announcement.pdf_url) {
      const filePath = announcement.pdf_url.split('/').pop();
      await supabase.storage.from('announcements-files').remove([filePath]);
    }

    const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      if (selected?.id === announcement.id) setSelected(null);
      fetchAnnouncements();
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p>로딩 중...</p>
      </div>
    );
  }

  // ── 상세 / 편집 뷰 ──
  if (selected) {
    const currentPdfUrl = selected.pdf_url;
    const showCurrentPdf = currentPdfUrl && !removePdf;

    return (
      <div className="page-container">
        <div className="admin-container">
          {/* 헤더 */}
          <div className="admin-header">
            <div className="admin-header-left">
              <h1 className="page-title">📢 공지사항 관리</h1>
            </div>
            <button className="admin-create-btn" onClick={() => setModalOpen(true)}>
              + 새 공지 작성
            </button>
          </div>

          <button onClick={() => { setSelected(null); setIsEditing(false); }} className="detail-back-button">
            ← 목록으로
          </button>

          <div className="announcement-detail">
            {/* ── 읽기 모드 ── */}
            {!isEditing && (
              <>
                <div className="announcement-detail-header">
                  {selected.is_pinned && (
                    <span className="detail-pin-badge">📌 고정 공지</span>
                  )}
                  <h1 className="announcement-detail-title">{selected.title}</h1>
                  <div className="announcement-detail-meta">
                    <span className="detail-author">{selected.author}</span>
                    <span className="detail-date">{selected.published_at?.slice(0, 10)}</span>
                  </div>
                </div>

                <div
                  className="announcement-detail-content"
                  dangerouslySetInnerHTML={{ __html: selected.content }}
                />

                {selected.pdf_url && (
                  <a href={selected.pdf_url} target="_blank" rel="noopener noreferrer" className="pdf-link">
                    📎 첨부 파일 열기
                  </a>
                )}

                <div className="ann-edit-toolbar">
                  <button className="ann-edit-btn" onClick={enterEditMode}>✏️ 편집</button>
                  <button className="admin-delete-btn admin-delete-btn--lg" onClick={() => handleDelete(selected)}>삭제</button>
                </div>
              </>
            )}

            {/* ── 편집 모드 ── */}
            {isEditing && (
              <>
                <div className="announcement-detail-header">
                  <label className="ann-pin-check">
                    <input
                      type="checkbox"
                      checked={editForm.is_pinned}
                      onChange={e => setEditForm(p => ({ ...p, is_pinned: e.target.checked }))}
                    />
                    <span className={editForm.is_pinned ? 'detail-pin-badge' : 'ann-pin-label'}>
                      📌 고정 공지
                    </span>
                  </label>
                  <input
                    className="ann-edit-title-input"
                    value={editForm.title}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="제목을 입력하세요"
                  />
                  <div className="announcement-detail-meta">
                    <span className="detail-author">{selected.author}</span>
                    <span className="detail-date">{selected.published_at?.slice(0, 10)}</span>
                  </div>
                </div>

                <textarea
                  className="ann-edit-content-input"
                  value={editForm.content}
                  onChange={e => setEditForm(p => ({ ...p, content: e.target.value }))}
                  placeholder="본문을 입력하세요"
                />

                {/* PDF 관리 */}
                <div className="ann-pdf-section">
                  {showCurrentPdf && (
                    <div className="ann-pdf-current">
                      <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-link" style={{ marginTop: 0 }}>
                        📎 현재 첨부 파일
                      </a>
                      <button className="ann-pdf-remove-btn" onClick={() => setRemovePdf(true)}>🗑️ 삭제</button>
                    </div>
                  )}
                  {removePdf && (
                    <div className="ann-pdf-removed">
                      <span>⚠️ 기존 첨부파일이 저장 시 삭제됩니다.</span>
                      <button className="ann-pdf-undo-btn" onClick={() => setRemovePdf(false)}>되돌리기</button>
                    </div>
                  )}
                  <label className="ann-pdf-upload-label">
                    {newPdfFile ? `📄 ${newPdfFile.name}` : (showCurrentPdf ? '↺ 다른 PDF로 교체' : '📎 PDF 첨부')}
                    <input
                      ref={newPdfRef}
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={e => {
                        setNewPdfFile(e.target.files[0] || null);
                        setRemovePdf(false);
                      }}
                    />
                  </label>
                  {newPdfFile && (
                    <button className="ann-pdf-remove-btn" onClick={() => { setNewPdfFile(null); if (newPdfRef.current) newPdfRef.current.value = ''; }}>
                      ✕ 취소
                    </button>
                  )}
                </div>

                <div className="ann-edit-toolbar">
                  <button className="ann-save-btn" onClick={handleUpdate} disabled={editSubmitting}>
                    {editSubmitting ? '저장 중...' : '💾 저장'}
                  </button>
                  <button className="ann-cancel-btn" onClick={cancelEdit}>취소</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 새 공지 작성 모달 */}
        {modalOpen && (
          <div className="confirm-overlay">
            <div className="admin-modal">
              <h2>새 공지 작성</h2>
              <div className="admin-form-group">
                <label>제목 *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="공지 제목" />
              </div>
              <div className="admin-form-group">
                <label>본문 *</label>
                <textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="공지 내용" />
              </div>
              <div className="admin-form-group">
                <label>PDF 첨부 (선택)</label>
                <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0] || null)} />
              </div>
              <div className="admin-form-check">
                <label>
                  <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))} />
                  {' '}상단 고정
                </label>
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn confirm-cancel" onClick={() => { setModalOpen(false); setForm({ title: '', content: '', is_pinned: false }); setPdfFile(null); }}>취소</button>
                <button className="confirm-btn confirm-ok" onClick={handleCreate} disabled={submitting}>{submitting ? '등록 중...' : '등록'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── 목록 뷰 ──
  return (
    <div className="page-container">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-header-left">
            <h1 className="page-title">📢 공지사항 관리</h1>
          </div>
          <button className="admin-create-btn" onClick={() => setModalOpen(true)}>
            + 새 공지 작성
          </button>
        </div>

        <div className="admin-list">
          {announcements.length === 0 && <p className="admin-empty">등록된 공지사항이 없습니다.</p>}
          {announcements.map(a => (
            <div
              key={a.id}
              className="admin-list-item admin-list-item-clickable"
              onClick={() => setSelected(a)}
            >
              <div className="admin-item-info">
                {a.is_pinned && <span className="pin-badge">📌</span>}
                <span className="admin-item-title">{a.title}</span>
                <span className="admin-item-date">{a.published_at?.slice(0, 10)}</span>
                {a.pdf_url && <span className="admin-item-pdf">PDF 첨부</span>}
              </div>
              <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(a); }}>삭제</button>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <div className="confirm-overlay">
          <div className="admin-modal">
            <h2>새 공지 작성</h2>
            <div className="admin-form-group">
              <label>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="공지 제목" />
            </div>
            <div className="admin-form-group">
              <label>본문 *</label>
              <textarea rows={6} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="공지 내용" />
            </div>
            <div className="admin-form-group">
              <label>PDF 첨부 (선택)</label>
              <input type="file" accept=".pdf" onChange={e => setPdfFile(e.target.files[0] || null)} />
            </div>
            <div className="admin-form-check">
              <label>
                <input type="checkbox" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))} />
                {' '}상단 고정
              </label>
            </div>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-cancel" onClick={() => { setModalOpen(false); setForm({ title: '', content: '', is_pinned: false }); setPdfFile(null); }}>취소</button>
              <button className="confirm-btn confirm-ok" onClick={handleCreate} disabled={submitting}>{submitting ? '등록 중...' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAnnouncements;
