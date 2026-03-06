// src/components/AdminLayout.js
import React, { useState } from 'react';
import AdminOnboarding from '../pages/AdminOnboarding';
import AdminAnnouncements from '../pages/AdminAnnouncements';
import AdminSurvey from '../pages/AdminSurvey';
import AdminUsers from '../pages/AdminUsers';
import './AdminLayout.css';

const MENU_ITEMS = [
  { id: 'admin-onboarding',    icon: '📋', label: '온보딩 현황' },
  { id: 'admin-announcements', icon: '📢', label: '공지사항 관리' },
  { id: 'admin-survey',        icon: '📝', label: '설문조사 관리' },
  { id: 'admin-users',         icon: '👥', label: '직원 관리' },
];

const PAGE_TITLES = {
  'admin-onboarding':    '온보딩 현황',
  'admin-announcements': '공지사항 관리',
  'admin-survey':        '설문조사 관리',
  'admin-users':         '직원 관리',
};

function formatDate(d) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function AdminLayout({ user, onLogout }) {
  const [activePage, setActivePage] = useState('admin-onboarding');

  const userName = user?.name || user?.employee_id || 'Admin';
  const avatarChar = userName.charAt(0);

  return (
    <div className="admin-layout">
      {/* 사이드바 */}
      <aside className="admin-sidebar">
        {/* 로고 */}
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-icon">🏢</div>
          <div className="admin-sidebar-logo-title">온보딩 시스템</div>
          <div className="admin-sidebar-logo-sub">HR Admin</div>
        </div>

        {/* 네비게이션 */}
        <nav className="admin-sidebar-nav">
          {MENU_ITEMS.map(item => (
            <div
              key={item.id}
              className={`admin-sidebar-item${activePage === item.id ? ' active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="admin-sidebar-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* 하단 사용자 정보 */}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar">{avatarChar}</div>
          <div className="admin-sidebar-user-info">
            <div className="admin-sidebar-user-name">{userName}</div>
            <div className="admin-sidebar-user-role">HR 관리자</div>
          </div>
          <button className="admin-sidebar-logout" onClick={onLogout} title="로그아웃">⏻</button>
        </div>
      </aside>

      {/* 콘텐츠 영역 */}
      <div className="admin-content">
        {/* 상단 바 */}
        <div className="admin-topbar">
          <span className="admin-topbar-title">{PAGE_TITLES[activePage]}</span>
          <span className="admin-topbar-date">{formatDate(new Date())}</span>
        </div>

        {/* 페이지 */}
        <main className="admin-main">
          {activePage === 'admin-onboarding' && (
            <AdminOnboarding onBack={() => setActivePage('admin-onboarding')} />
          )}
          {activePage === 'admin-announcements' && (
            <AdminAnnouncements onBack={() => setActivePage('admin-onboarding')} />
          )}
          {activePage === 'admin-survey' && (
            <AdminSurvey onBack={() => setActivePage('admin-onboarding')} />
          )}
          {activePage === 'admin-users' && (
            <AdminUsers onBack={() => setActivePage('admin-onboarding')} />
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
