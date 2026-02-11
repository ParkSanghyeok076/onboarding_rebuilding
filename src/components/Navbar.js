import React, { useState } from 'react';
import './Navbar.css';

function Navbar({ user, onLogout, onPasswordChange }) {
  const [showDropdown, setShowDropdown] = useState(false);

  // 멘토링 기간 계산
  const getMentoringPeriod = () => {
    if (user.type === 'A') {
      return `${user.period_1_start} ~ ${user.period_3_end}`;
    } else {
      return `${user.period_1_start} ~ ${user.period_1_end}`;
    }
  };

  return (
    <div className="navbar">
      <div className="navbar-left">
        <h2>신규입사자 온보딩 시스템</h2>
      </div>
      <div className="navbar-right">
        <div className="user-info">
          <span className="user-team">{user.team}</span>
          <span className="user-name">{user.name}</span>
          <span className="user-period">📅 {getMentoringPeriod()}</span>
        </div>

        <div className="profile-menu">
          <button
            className="profile-button"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            👤 프로필 ▼
          </button>
          {showDropdown && (
            <div className="dropdown-menu">
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowDropdown(false);
                  onPasswordChange();
                }}
              >
                🔑 비밀번호 변경
              </button>
              <button
                className="dropdown-item logout"
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
              >
                🚪 로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;
