import React from 'react';
import './MainMenu.css';

function MainMenu({ user, onSelectMenu }) {
  const menuItems = [
    {
      id: 'announcements',
      icon: '📢',
      title: '공지사항',
      description: '중요 공지사항 및 자료 확인',
      color: '#344dbe'
    },
    {
      id: 'onboarding',
      icon: '📋',
      title: '멘토링 프로그램',
      description: '6가지 멘토링 활동 수행',
      color: '#4f67d8'
    },
    {
      id: 'survey',
      icon: '📝',
      title: '설문조사',
      description: '멘토링 과정 설문조사',
      color: '#7b8fe8'
    }
  ];

  return (
    <div className="main-menu">
      <h1 className="menu-title">{user?.name}님 환영합니다! 👋</h1>
      <p className="menu-subtitle">온보딩 과정을 시작하세요!</p>

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
            <div className="menu-card-arrow" style={{ color: item.color }}>
              →
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MainMenu;
