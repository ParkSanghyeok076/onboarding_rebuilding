import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';

function AdminAnnouncements({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', is_pinned: false });
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      fetchAnnouncements();
    }
  };

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
          <h1 className="page-title">📢 공지사항 관리</h1>
          <button className="admin-create-btn" onClick={() => setModalOpen(true)}>
            + 새 공지 작성
          </button>
        </div>

        <div className="admin-list">
          {announcements.length === 0 && <p className="admin-empty">등록된 공지사항이 없습니다.</p>}
          {announcements.map(a => (
            <div key={a.id} className="admin-list-item">
              <div className="admin-item-info">
                {a.is_pinned && <span className="pin-badge">📌</span>}
                <span className="admin-item-title">{a.title}</span>
                <span className="admin-item-date">{a.published_at?.slice(0, 10)}</span>
                {a.pdf_url && <span className="admin-item-pdf">PDF 첨부</span>}
              </div>
              <button className="admin-delete-btn" onClick={() => handleDelete(a)}>삭제</button>
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
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="공지 제목"
              />
            </div>
            <div className="admin-form-group">
              <label>본문 *</label>
              <textarea
                rows={6}
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                placeholder="공지 내용"
              />
            </div>
            <div className="admin-form-group">
              <label>PDF 첨부 (선택)</label>
              <input
                type="file"
                accept=".pdf"
                onChange={e => setPdfFile(e.target.files[0] || null)}
              />
            </div>
            <div className="admin-form-check">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_pinned}
                  onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))}
                />
                {' '}상단 고정
              </label>
            </div>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => {
                  setModalOpen(false);
                  setForm({ title: '', content: '', is_pinned: false });
                  setPdfFile(null);
                }}
              >
                취소
              </button>
              <button className="confirm-btn confirm-ok" onClick={handleCreate} disabled={submitting}>
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAnnouncements;
