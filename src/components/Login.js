import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = `${employeeId}@company.internal`;

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('사번 또는 비밀번호가 올바르지 않습니다.');
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src="/YURA_SYMBOL.png" alt="YURA 로고" className="login-logo" />
        <h1>온보딩 시스템</h1>
        <p className="login-subtitle">로그인하여 시작하세요</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>사번 (아이디)</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="예: 223069"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="예: y223069"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="login-hint">
          💡 초기 비밀번호: y + 사번 (예: y223069)
        </p>
      </div>
    </div>
  );
}

export default Login;
