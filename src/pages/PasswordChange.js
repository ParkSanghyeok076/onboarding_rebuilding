import React, { useState } from 'react';
import './PasswordChange.css';
import './Pages.css';
import { supabase } from '../lib/supabase';

function PasswordChange({ user, onBack, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // 새 비밀번호 유효성 검사
    if (newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setLoading(false);

    if (updateError) {
      setError('비밀번호 변경에 실패했습니다: ' + updateError.message);
      return;
    }

    // 성공 처리
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    // 부모 컴포넌트에 알림
    if (onPasswordChanged) {
      onPasswordChanged();
    }
  };

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>

      <div className="password-change-container">
        <div className="password-change-box">
          <h1>🔑 비밀번호 변경</h1>
          <p className="subtitle">새로운 비밀번호를 설정하세요</p>

          {success && (
            <div className="success-message">
              ✅ 비밀번호가 성공적으로 변경되었습니다!
              <br />
              <small>잠시 후 메뉴로 돌아갑니다...</small>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>현재 비밀번호</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호를 입력하세요"
                  required
                />
              </div>

              <div className="form-group">
                <label>새 비밀번호</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (최소 6자)"
                  required
                />
              </div>

              <div className="form-group">
                <label>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" className="submit-button" disabled={loading}>
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}

          <div className="info-box">
            <strong>💡 비밀번호 규칙:</strong>
            <ul>
              <li>최소 6자 이상</li>
              <li>현재 비밀번호와 달라야 함</li>
              <li>안전한 비밀번호를 사용하세요</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordChange;
