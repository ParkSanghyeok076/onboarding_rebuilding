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
    },
    {
      id: 'admin-users',
      icon: '👥',
      title: '직원 관리',
      description: 'CSV 일괄 등록 · 직원 목록',
      color: '#A29BFE'
    },
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
