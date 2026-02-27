# HR Admin 화면 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** HR Admin 전용 화면 구현 — 공지사항 관리 / 온보딩 현황 / 설문조사 관리 (ABSA + 이메일 초안)

**Architecture:** 기존 App.js에서 `currentUser.role === 'hr_admin'` 분기로 Admin 메뉴/페이지를 렌더링. 직원 화면은 변경 없음. Admin 전용 컴포넌트 4개 신규 생성.

**Tech Stack:** React, Supabase JS Client, Supabase Storage, `src/lib/edgeFunctions.js` (runAnalyze, runGenerateEmail)

---

## 컨텍스트

- 프로젝트 경로: `C:\Users\ADMIN\AppData\Local\WEMEETS\yulink\yulink files\■■■Claude House■■■\onboarding app_rebuild\onboarding-app`
- bash 경로: `/c/Users/ADMIN/AppData/Local/WEMEETS/yulink/yulink files/■■■Claude House■■■/onboarding app_rebuild/onboarding-app`
- 기존 페이지는 `src/pages/Pages.css` 공통 스타일 사용
- Supabase client: `src/lib/supabase.js`
- Edge Function 유틸: `src/lib/edgeFunctions.js`
- App.js 라우팅: `currentPage` state + `setCurrentPage` 함수 사용 (React Router 없음)
- 공지사항 Storage 버킷: `announcements-files`
- 온보딩 이미지 Storage 버킷: `onboarding-images`

---

## Task 1: App.js 분기 + AdminMenu.js

**Files:**
- Modify: `src/App.js`
- Create: `src/components/AdminMenu.js`

### Step 1: AdminMenu.js 생성

`src/components/AdminMenu.js`:

```jsx
import React from 'react';
import './MainMenu.css';

function AdminMenu({ onSelectMenu }) {
  const menuItems = [
    {
      id: 'admin-announcements',
      icon: '📢',
      title: '공지사항 관리',
      description: '공지 작성 · PDF 업로드 · 삭제',
      color: '#FF6B6B'
    },
    {
      id: 'admin-onboarding',
      icon: '📋',
      title: '온보딩 현황',
      description: '신입사원별 프로그램 제출 현황',
      color: '#4ECDC4'
    },
    {
      id: 'admin-survey',
      icon: '📝',
      title: '설문조사 관리',
      description: '응답 확인 · ABSA 분석 · 이메일 초안',
      color: '#95E1D3'
    }
  ];

  return (
    <div className="main-menu">
      <h1 className="menu-title">HR Admin</h1>
      <p className="menu-subtitle">온보딩 관리 시스템</p>
      <div className="menu-grid">
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
  );
}

export default AdminMenu;
```

### Step 2: App.js 수정

`src/App.js`에서:
1. import 추가 (파일 상단):
```jsx
import AdminMenu from './components/AdminMenu';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminOnboarding from './pages/AdminOnboarding';
import AdminSurvey from './pages/AdminSurvey';
```

2. `return` 안의 JSX에서 `currentPage === 'menu'` 부분을 아래로 교체:
```jsx
{currentPage === 'menu' && (
  currentUser.role === 'hr_admin'
    ? <AdminMenu onSelectMenu={handleSelectMenu} />
    : <MainMenu onSelectMenu={handleSelectMenu} />
)}
{currentPage === 'admin-announcements' && (
  <AdminAnnouncements onBack={handleBack} />
)}
{currentPage === 'admin-onboarding' && (
  <AdminOnboarding onBack={handleBack} />
)}
{currentPage === 'admin-survey' && (
  <AdminSurvey onBack={handleBack} />
)}
```

### Step 3: 빈 페이지 파일 3개 생성 (이후 Task에서 채움)

`src/pages/AdminAnnouncements.js`:
```jsx
import React from 'react';
function AdminAnnouncements({ onBack }) {
  return <div><button onClick={onBack}>← 메뉴로 돌아가기</button><p>공지사항 관리 (준비 중)</p></div>;
}
export default AdminAnnouncements;
```

`src/pages/AdminOnboarding.js`:
```jsx
import React from 'react';
function AdminOnboarding({ onBack }) {
  return <div><button onClick={onBack}>← 메뉴로 돌아가기</button><p>온보딩 현황 (준비 중)</p></div>;
}
export default AdminOnboarding;
```

`src/pages/AdminSurvey.js`:
```jsx
import React from 'react';
function AdminSurvey({ onBack }) {
  return <div><button onClick={onBack}>← 메뉴로 돌아가기</button><p>설문조사 관리 (준비 중)</p></div>;
}
export default AdminSurvey;
```

### Step 4: 동작 확인

`npm start` 실행 → `admin001` 계정 로그인 → "HR Admin / 온보딩 관리 시스템" 메뉴 3개 표시 확인

### Step 5: 커밋

```bash
git add src/App.js src/components/AdminMenu.js src/pages/AdminAnnouncements.js src/pages/AdminOnboarding.js src/pages/AdminSurvey.js
git commit -m "feat: HR Admin 메뉴 분기 및 빈 페이지 추가"
```

---

## Task 2: AdminAnnouncements.js — 공지사항 관리

**Files:**
- Modify: `src/pages/AdminAnnouncements.js`
- Modify: `src/pages/Pages.css` (admin 스타일 추가)

### Step 1: AdminAnnouncements.js 전체 구현

```jsx
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
              <button className="confirm-btn confirm-cancel" onClick={() => { setModalOpen(false); setForm({ title: '', content: '', is_pinned: false }); setPdfFile(null); }}>
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
```

### Step 2: Pages.css에 Admin 공통 스타일 추가

`src/pages/Pages.css` 맨 아래에 추가:

```css
/* ===== Admin 공통 ===== */
.admin-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 1rem 2rem;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.admin-create-btn {
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  font-weight: 600;
}

.admin-create-btn:hover { background: #3db8b0; }

.admin-list { display: flex; flex-direction: column; gap: 0.75rem; }

.admin-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 1rem 1.25rem;
}

.admin-item-info { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.admin-item-title { font-weight: 600; font-size: 1rem; }
.admin-item-date { color: #888; font-size: 0.85rem; }
.admin-item-pdf { background: #f0f0f0; color: #555; font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; }
.pin-badge { font-size: 1rem; }
.admin-empty { color: #aaa; text-align: center; padding: 2rem; }

.admin-delete-btn {
  background: #ff4d4d;
  color: white;
  border: none;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

.admin-delete-btn:hover { background: #e03333; }

.admin-modal {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  overflow-y: auto;
}

.admin-modal h2 { margin-bottom: 1.5rem; font-size: 1.2rem; }

.admin-form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.admin-form-group label { font-size: 0.9rem; font-weight: 600; color: #555; }

.admin-form-group input[type="text"],
.admin-form-group textarea {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.95rem;
  resize: vertical;
}

.admin-form-check { margin-bottom: 1.5rem; font-size: 0.95rem; }
```

### Step 3: 동작 확인

앱에서 공지사항 관리 진입 → 새 공지 작성 → 목록 표시 → 삭제 동작 확인

### Step 4: 커밋

```bash
git add src/pages/AdminAnnouncements.js src/pages/Pages.css
git commit -m "feat: 공지사항 관리 페이지 구현"
```

---

## Task 3: AdminOnboarding.js — 온보딩 현황

**Files:**
- Modify: `src/pages/AdminOnboarding.js`

### Step 1: AdminOnboarding.js 전체 구현

```jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';

function AdminOnboarding({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('전체'); // '전체' | '완료' | '미완료'
  const [sortKey, setSortKey] = useState(null); // 'name' | 'status'
  const [sortAsc, setSortAsc] = useState(true);
  const [imageUrl, setImageUrl] = useState(null); // 팝업용

  useEffect(() => {
    const fetchData = async () => {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, name, department, employee_type')
        .eq('role', 'employee');

      if (userError || !users) { setLoading(false); return; }

      const { data: subs } = await supabase
        .from('onboarding_submissions')
        .select('user_id, program_id, image_url');

      const subMap = {};
      for (const s of subs || []) {
        if (!subMap[s.user_id]) subMap[s.user_id] = {};
        subMap[s.user_id][s.program_id] = s.image_url;
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
    const { data } = await supabase.storage
      .from('onboarding-images')
      .createSignedUrl(storagePath, 3600);
    if (data) setImageUrl(data.signedUrl);
  };

  let displayed = [...rows];
  if (filter === '완료') displayed = displayed.filter(r => r.completed);
  if (filter === '미완료') displayed = displayed.filter(r => !r.completed);
  if (sortKey === 'name') displayed.sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  if (sortKey === 'status') displayed.sort((a, b) => sortAsc ? (a.completed ? 1 : -1) : (a.completed ? -1 : 1));

  const SortIcon = ({ k }) => sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ' ↑↓';

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
                  이름<SortIcon k="name" />
                </th>
                <th>팀</th>
                <th>유형</th>
                {[1,2,3,4,5,6].map(n => <th key={n}>{n}</th>)}
                <th className="sortable" onClick={() => handleSort('status')}>
                  상태<SortIcon k="status" />
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
                <tr><td colSpan={11} className="admin-empty">해당하는 데이터가 없습니다.</td></tr>
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
```

### Step 2: Pages.css에 테이블 스타일 추가

```css
/* ===== Admin 테이블 ===== */
.admin-filter-group { display: flex; gap: 0.5rem; }
.admin-filter-btn {
  border: 1px solid #ddd;
  background: white;
  padding: 0.4rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
}
.admin-filter-btn.active { background: #4ECDC4; color: white; border-color: #4ECDC4; }

.admin-table-wrap { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.admin-table th, .admin-table td {
  border: 1px solid #e0e0e0;
  padding: 0.6rem 0.8rem;
  text-align: center;
}
.admin-table th { background: #f8f8f8; font-weight: 600; }
.admin-table th.sortable { cursor: pointer; user-select: none; }
.admin-table th.sortable:hover { background: #eee; }

.program-cell { font-size: 1.1rem; }
.program-done { cursor: pointer; }
.program-done:hover { opacity: 0.7; }

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}
.status-badge.done { background: #d4edda; color: #155724; }
.status-badge.undone { background: #f8d7da; color: #721c24; }

/* ===== 이미지 팝업 ===== */
.image-popup {
  background: white;
  border-radius: 12px;
  padding: 1rem;
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}
.image-popup-close {
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #555;
}
.image-popup-img { max-width: 80vw; max-height: 80vh; border-radius: 8px; display: block; }
```

### Step 3: 동작 확인

온보딩 현황 진입 → 테이블 표시 → 이름/상태 정렬 → 완료/미완료 필터 → ✅ 클릭 이미지 팝업 확인

### Step 4: 커밋

```bash
git add src/pages/AdminOnboarding.js src/pages/Pages.css
git commit -m "feat: 온보딩 현황 페이지 구현 (정렬/필터/이미지 팝업)"
```

---

## Task 4: AdminSurvey.js — 설문조사 관리

**Files:**
- Modify: `src/pages/AdminSurvey.js`

### Step 1: AdminSurvey.js 전체 구현

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { runAnalyze, runGenerateEmail } from '../lib/edgeFunctions';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

function AdminSurvey({ onBack }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState('전체');
  const [selectedResponse, setSelectedResponse] = useState(null); // 상세 보기
  const [emailDraft, setEmailDraft] = useState(null); // 이메일 초안 팝업
  const [actionLoading, setActionLoading] = useState({}); // { [id_type]: true }

  const fetchResponses = useCallback(async () => {
    const { data: surveyData, error } = await supabase
      .from('survey_responses')
      .select('id, user_id, round_number, submitted_at, users(name)')
      .order('submitted_at', { ascending: false });

    if (error || !surveyData) { setLoading(false); return; }

    const ids = surveyData.map(r => r.id);

    const { data: analyses } = await supabase
      .from('analysis_results')
      .select('id, response_id')
      .in('response_id', ids);

    const { data: drafts } = await supabase
      .from('email_drafts')
      .select('id, response_id, recipient_type, subject, body')
      .in('response_id', ids);

    const analysisMap = {};
    for (const a of analyses || []) analysisMap[a.response_id] = a.id;

    const draftMap = {};
    for (const d of drafts || []) {
      if (!draftMap[d.response_id]) draftMap[d.response_id] = {};
      draftMap[d.response_id][d.recipient_type] = d;
    }

    setResponses(surveyData.map(r => ({
      ...r,
      userName: r.users?.name || '—',
      analysisId: analysisMap[r.id] || null,
      drafts: draftMap[r.id] || {},
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  const handleAnalyze = async (response) => {
    const key = `analyze_${response.id}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await runAnalyze(response.id);
      await fetchResponses();
    } catch (e) {
      alert('분석 실패: ' + e.message);
    }
    setActionLoading(p => ({ ...p, [key]: false }));
  };

  const handleGenerateEmail = async (response, recipientType) => {
    const key = `email_${response.id}_${recipientType}`;
    setActionLoading(p => ({ ...p, [key]: true }));
    try {
      await runGenerateEmail(response.analysisId, recipientType);
      await fetchResponses();
    } catch (e) {
      alert('이메일 생성 실패: ' + e.message);
    }
    setActionLoading(p => ({ ...p, [key]: false }));
  };

  const displayed = roundFilter === '전체'
    ? responses
    : responses.filter(r => r.round_number === Number(roundFilter.replace('차', '')));

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <p>로딩 중...</p>
      </div>
    );
  }

  // 상세 보기
  if (selectedResponse) {
    return <SurveyDetail response={selectedResponse} onBack={() => setSelectedResponse(null)} />;
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="admin-container">
        <div className="admin-header">
          <h1 className="page-title">📝 설문조사 관리</h1>
          <div className="admin-filter-group">
            {['전체', '1차', '2차', '3차'].map(f => (
              <button
                key={f}
                className={`admin-filter-btn ${roundFilter === f ? 'active' : ''}`}
                onClick={() => setRoundFilter(f)}
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
                <th>이름</th>
                <th>차수</th>
                <th>제출일</th>
                <th>ABSA 분석</th>
                <th>멘토 이메일</th>
                <th>팀장 이메일</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(r => {
                const analyzingKey = `analyze_${r.id}`;
                const mentorKey = `email_${r.id}_mentor`;
                const teamKey = `email_${r.id}_team_leader`;
                return (
                  <tr key={r.id} className="survey-row" onClick={() => setSelectedResponse(r)}>
                    <td>{r.userName}</td>
                    <td>{r.round_number}차</td>
                    <td>{r.submitted_at?.slice(0, 10)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {r.analysisId ? (
                        <span className="status-badge done">완료</span>
                      ) : (
                        <button
                          className="admin-action-btn"
                          disabled={actionLoading[analyzingKey]}
                          onClick={() => handleAnalyze(r)}
                        >
                          {actionLoading[analyzingKey] ? '분석 중...' : '분석 실행'}
                        </button>
                      )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {!r.analysisId ? <span className="status-badge undone">미분석</span>
                        : r.drafts.mentor ? (
                          <span
                            className="status-badge done clickable"
                            onClick={() => setEmailDraft(r.drafts.mentor)}
                          >완료 (확인)</span>
                        ) : (
                          <button
                            className="admin-action-btn"
                            disabled={actionLoading[mentorKey]}
                            onClick={() => handleGenerateEmail(r, 'mentor')}
                          >
                            {actionLoading[mentorKey] ? '생성 중...' : '멘토'}
                          </button>
                        )}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {!r.analysisId ? <span className="status-badge undone">미분석</span>
                        : r.drafts.team_leader ? (
                          <span
                            className="status-badge done clickable"
                            onClick={() => setEmailDraft(r.drafts.team_leader)}
                          >완료 (확인)</span>
                        ) : (
                          <button
                            className="admin-action-btn"
                            disabled={actionLoading[teamKey]}
                            onClick={() => handleGenerateEmail(r, 'team_leader')}
                          >
                            {actionLoading[teamKey] ? '생성 중...' : '팀장'}
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr><td colSpan={6} className="admin-empty">응답 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {emailDraft && (
        <div className="confirm-overlay" onClick={() => setEmailDraft(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h2>이메일 초안</h2>
            <p className="email-draft-subject"><strong>제목:</strong> {emailDraft.subject}</p>
            <pre className="email-draft-body">{emailDraft.body}</pre>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-ok" onClick={() => setEmailDraft(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SurveyDetail({ response, onBack }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('id', response.id)
        .single();
      setDetail(data);
      setLoading(false);
    };
    fetch();
  }, [response.id]);

  if (loading) return <div className="page-container"><p>로딩 중...</p></div>;

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <div className="admin-container">
        <h1 className="page-title">{response.userName} — {response.round_number}차 설문</h1>
        <p className="survey-detail-date">제출일: {response.submitted_at?.slice(0, 10)}</p>
        {PARTS.map(part => (
          <div key={part.number} className="result-part">
            <h3 className="result-part-title">{part.title}</h3>
            {part.questions.map((q, idx) => (
              <div key={q.key} className="result-question">
                <p className="result-q-text"><strong>{idx + 1}. {q.text}</strong></p>
                {q.type === 'scale' ? (
                  <p className="result-answer">
                    {detail[q.key] != null
                      ? `${detail[q.key]}점 — ${SCALE_LABELS[detail[q.key]]}`
                      : '(미응답)'}
                  </p>
                ) : (
                  <p className="result-answer result-text">
                    {detail[q.key] || '(미작성)'}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminSurvey;
```

### Step 2: Pages.css에 Survey Admin 스타일 추가

```css
/* ===== Admin Survey ===== */
.admin-action-btn {
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
}
.admin-action-btn:disabled { background: #aaa; cursor: not-allowed; }
.admin-action-btn:hover:not(:disabled) { background: #3db8b0; }

.survey-row { cursor: pointer; }
.survey-row:hover td { background: #f5fffe; }

.status-badge.clickable { cursor: pointer; text-decoration: underline; }

.email-draft-subject { margin-bottom: 0.75rem; }
.email-draft-body {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 1rem;
}

.survey-detail-date { color: #888; margin-bottom: 1.5rem; }
```

### Step 3: 동작 확인

설문조사 관리 진입 → 응답자 목록 표시 → 분석 실행 → 이메일 생성 → 완료 클릭 초안 확인 → 행 클릭 상세 보기 확인

### Step 4: 커밋

```bash
git add src/pages/AdminSurvey.js src/pages/Pages.css
git commit -m "feat: 설문조사 관리 페이지 구현 (ABSA + 이메일 초안)"
```

---

## Task 5: GitHub Push

```bash
git push origin main
```
