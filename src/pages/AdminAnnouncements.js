import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import DOMPurify from 'dompurify';
import { supabase } from '../lib/supabase';
import './Pages.css';
import './AdminAnnouncements.css';

const tiptapExtensions = [
  StarterKit,
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  Underline,
];

function EditorToolbar({ editor }) {
  if (!editor) return null;
  return (
    <div className="tiptap-toolbar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="굵게"><strong>B</strong></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="기울임"><em>I</em></button>
      <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} title="밑줄"><u>U</u></button>
      <span className="tiptap-sep" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}>H1</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}>H3</button>
      <span className="tiptap-sep" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="불릿 목록">• 목록</button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="번호 목록">1. 목록</button>
      <span className="tiptap-sep" />
      <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="표 삽입">표 삽입</button>
      <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가">열+</button>
      <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} title="열 삭제">열-</button>
      <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가">행+</button>
      <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} title="행 삭제">행-</button>
      <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제">표 삭제</button>
    </div>
  );
}

function AdminAnnouncements({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: '', is_pinned: false });
  const [pdfFile, setPdfFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', is_pinned: false });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [removePdf, setRemovePdf] = useState(false);
  const [newPdfFile, setNewPdfFile] = useState(null);
  const newPdfRef = useRef(null);

  const createEditor = useEditor({ extensions: tiptapExtensions, content: '' });
  const editEditor = useEditor({ extensions: tiptapExtensions, content: '' });

  // 모달 열릴 때 에디터 초기화
  useEffect(() => {
    if (modalOpen && createEditor) createEditor.commands.setContent('');
  }, [modalOpen]); // eslint-disable-line

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('pin_order', { ascending: true, nullsFirst: false })
      .order('published_at', { ascending: false });
    if (!error) setAnnouncements(data || []);
    setLoading(false);
  };

  const handlePinMove = async (ann, direction) => {
    const pinned = announcements
      .filter(a => a.is_pinned)
      .sort((a, b) => {
        if (a.pin_order == null && b.pin_order == null) return 0;
        if (a.pin_order == null) return 1;
        if (b.pin_order == null) return -1;
        return a.pin_order - b.pin_order;
      });

    const idx = pinned.findIndex(a => a.id === ann.id);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pinned.length) return;

    const current = pinned[idx];
    const target  = pinned[targetIdx];
    const newOrderCurrent = targetIdx + 1;
    const newOrderTarget  = idx + 1;

    await Promise.all([
      supabase.from('announcements').update({ pin_order: newOrderCurrent }).eq('id', current.id),
      supabase.from('announcements').update({ pin_order: newOrderTarget  }).eq('id', target.id),
    ]);

    setAnnouncements(prev => prev
      .map(a => {
        if (a.id === current.id) return { ...a, pin_order: newOrderCurrent };
        if (a.id === target.id)  return { ...a, pin_order: newOrderTarget };
        return a;
      })
      .sort((a, b) => {
        if (!a.is_pinned && !b.is_pinned) return 0;
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        if (a.pin_order == null) return 1;
        if (b.pin_order == null) return -1;
        return a.pin_order - b.pin_order;
      })
    );
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const enterEditMode = () => {
    setEditForm({ title: selected.title, is_pinned: selected.is_pinned });
    setRemovePdf(false);
    setNewPdfFile(null);
    if (editEditor) editEditor.commands.setContent(selected.content || '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setRemovePdf(false);
    setNewPdfFile(null);
    if (newPdfRef.current) newPdfRef.current.value = '';
  };

  const handleCreate = async () => {
    const content = createEditor?.getHTML() || '';
    if (!form.title.trim() || !content || content === '<p></p>') {
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

    const pinnedCount = announcements.filter(a => a.is_pinned).length;
    const { error } = await supabase.from('announcements').insert({
      title: form.title,
      content,
      is_pinned: form.is_pinned,
      pin_order: form.is_pinned ? pinnedCount + 1 : null,
      author: '인사기획팀 박상혁',
      pdf_url,
    });

    if (error) {
      alert('등록 실패: ' + error.message);
    } else {
      setModalOpen(false);
      setForm({ title: '', is_pinned: false });
      setPdfFile(null);
      fetchAnnouncements();
    }
    setSubmitting(false);
  };

  const handleUpdate = async () => {
    const content = editEditor?.getHTML() || '';
    if (!editForm.title.trim() || !content || content === '<p></p>') {
      alert('제목과 본문을 입력해 주세요.');
      return;
    }
    setEditSubmitting(true);

    let pdf_url = selected.pdf_url;

    if (removePdf && selected.pdf_url) {
      const filePath = selected.pdf_url.split('/').pop();
      await supabase.storage.from('announcements-files').remove([filePath]);
      pdf_url = null;
    }

    if (newPdfFile) {
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

    let pin_order = selected.pin_order;
    if (editForm.is_pinned && !selected.is_pinned) {
      const pinnedCount = announcements.filter(a => a.is_pinned).length;
      pin_order = pinnedCount + 1;
    } else if (!editForm.is_pinned) {
      pin_order = null;
    }

    const { error } = await supabase
      .from('announcements')
      .update({ title: editForm.title, content, is_pinned: editForm.is_pinned, pin_order, pdf_url })
      .eq('id', selected.id);

    if (error) {
      alert('수정 실패: ' + error.message);
    } else {
      const updated = { ...selected, title: editForm.title, content, is_pinned: editForm.is_pinned, pdf_url };
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
          <div className="admin-header">
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
                  className="announcement-detail-content tiptap-display"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selected.content) }}
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

                <div className="tiptap-editor-wrap">
                  <EditorToolbar editor={editEditor} />
                  <EditorContent editor={editEditor} className="tiptap-editor" />
                </div>

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
            <div className="admin-modal admin-modal--wide">
              <h2>새 공지 작성</h2>
              <div className="admin-form-group">
                <label>제목 *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="공지 제목" />
              </div>
              <div className="admin-form-group">
                <label>본문 *</label>
                <div className="tiptap-editor-wrap">
                  <EditorToolbar editor={createEditor} />
                  <EditorContent editor={createEditor} className="tiptap-editor" />
                </div>
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
                <button className="confirm-btn confirm-cancel" onClick={() => { setModalOpen(false); setForm({ title: '', is_pinned: false }); setPdfFile(null); }}>취소</button>
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
          <button className="admin-create-btn" onClick={() => setModalOpen(true)}>
            + 새 공지 작성
          </button>
        </div>

        <div className="admin-list">
          {announcements.length === 0 && <p className="admin-empty">등록된 공지사항이 없습니다.</p>}
          {(() => {
            const pinnedItems = announcements.filter(a => a.is_pinned);
            return announcements.map(a => {
              const pinnedIdx = a.is_pinned ? pinnedItems.findIndex(x => x.id === a.id) : -1;
              return (
                <div
                  key={a.id}
                  className="admin-list-item admin-list-item-clickable"
                  onClick={() => setSelected(a)}
                >
                  <div className="admin-item-info">
                    {a.is_pinned && (
                      <div className="pin-order-btns" onClick={e => e.stopPropagation()}>
                        <button
                          className="pin-order-btn"
                          disabled={pinnedIdx === 0}
                          onClick={() => handlePinMove(a, 'up')}
                          title="위로"
                        >▲</button>
                        <button
                          className="pin-order-btn"
                          disabled={pinnedIdx === pinnedItems.length - 1}
                          onClick={() => handlePinMove(a, 'down')}
                          title="아래로"
                        >▼</button>
                      </div>
                    )}
                    {a.is_pinned && <span className="pin-badge">📌</span>}
                    <span className="admin-item-title">{a.title}</span>
                    <span className="admin-item-date">{a.published_at?.slice(0, 10)}</span>
                    {a.pdf_url && <span className="admin-item-pdf">PDF 첨부</span>}
                  </div>
                  <button className="admin-delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(a); }}>삭제</button>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {modalOpen && (
        <div className="confirm-overlay">
          <div className="admin-modal admin-modal--wide">
            <h2>새 공지 작성</h2>
            <div className="admin-form-group">
              <label>제목 *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="공지 제목" />
            </div>
            <div className="admin-form-group">
              <label>본문 *</label>
              <div className="tiptap-editor-wrap">
                <EditorToolbar editor={createEditor} />
                <EditorContent editor={createEditor} className="tiptap-editor" />
              </div>
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
              <button className="confirm-btn confirm-cancel" onClick={() => { setModalOpen(false); setForm({ title: '', is_pinned: false }); setPdfFile(null); }}>취소</button>
              <button className="confirm-btn confirm-ok" onClick={handleCreate} disabled={submitting}>{submitting ? '등록 중...' : '등록'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAnnouncements;
