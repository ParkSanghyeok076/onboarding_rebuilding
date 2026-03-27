import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

function Login() {
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="login-layout">
      {/* 좌측 히어로 섹션 */}
      <section className="login-hero">
        <div className="login-hero-bg-blur login-hero-bg-blur--top" />
        <div className="login-hero-bg-blur login-hero-bg-blur--bottom" />

        <div className="login-hero-content">
          <div className="login-hero-brand">
            <span className="login-hero-title">YURA 온보딩 시스템</span>
          </div>

          <h1 className="login-hero-headline">
            유라코퍼레이션 입사를<br />
            진심으로 환영합니다!
          </h1>

          <div className="login-hero-cards">
            <div className="login-hero-card">
              <span className="material-symbols-outlined login-hero-card-icon">rocket_launch</span>
              <div className="login-hero-card-title">온보딩 프로그램</div>
              <div className="login-hero-card-desc">6가지 활동으로 빠르게 적응하세요.</div>
            </div>
            <div className="login-hero-card">
              <span className="material-symbols-outlined login-hero-card-icon">diversity_3</span>
              <div className="login-hero-card-title">멘토 매칭</div>
              <div className="login-hero-card-desc">전담 멘토와 함께 성장하세요.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 우측 로그인 폼 */}
      <section className="login-form-section">
        <div className="login-form-inner">
          <header className="login-form-header">
            <img src="/YURA_SYMBOL.png" alt="YURA 로고" className="login-form-logo" />
            <p className="login-form-subheading">로그인하여 시작하세요.</p>
          </header>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="login-field-label" htmlFor="employee-id">사번 (아이디)</label>
              <div className="login-input-wrap">
                <span className="material-symbols-outlined login-input-icon">badge</span>
                <input
                  id="employee-id"
                  type="text"
                  className="login-input"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="예: 223069"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="password">비밀번호</label>
              <div className="login-input-wrap">
                <span className="material-symbols-outlined login-input-icon">lock</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input login-input--password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="예: y223069"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="login-input-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="login-hint">
            <span className="material-symbols-outlined login-hint-icon">info</span>
            초기 비밀번호: y + 사번 &nbsp;(예: y223069)
          </p>
          <p className="login-contact">
            <span className="material-symbols-outlined login-hint-icon">call</span>
            문의 : 인사기획팀 박상혁 선임(1456)
          </p>
        </div>

        <footer className="login-footer">
          <span className="material-symbols-outlined login-footer-icon">verified_user</span>
          © 2026 YURA Corporation. All rights reserved.
        </footer>
      </section>
    </div>
  );
}

export default Login;
