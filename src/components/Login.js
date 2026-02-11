import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin, users }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 사용자 찾기
    const user = users.find(u => u.id === id);

    if (!user) {
      setError('존재하지 않는 사번입니다.');
      return;
    }

    // 비밀번호 확인: 변경된 비밀번호 또는 초기 비밀번호
    const savedPasswords = JSON.parse(localStorage.getItem('passwords') || '{}');
    const currentPassword = savedPasswords[id]?.password || `y${id}`;

    if (password !== currentPassword) {
      setError('비밀번호가 올바르지 않습니다.');
      return;
    }

    // 로그인 성공
    onLogin(user);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>신규입사자 온보딩 시스템</h1>
        <p className="login-subtitle">로그인하여 시작하세요</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사번 (아이디)</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="예: 1001001"
              required
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="예: y1001001"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button">
            로그인
          </button>
        </form>

        <p className="login-hint">
          💡 초기 비밀번호: y + 사번 (예: y1001001)
        </p>
      </div>
    </div>
  );
}

export default Login;
