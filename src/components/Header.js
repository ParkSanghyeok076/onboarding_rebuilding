import React, { useState } from 'react';
import OnboardingTimeline from './OnboardingTimeline';

function Header({ user, progress, total, mentorProps }) {
  const isComplete = progress === total;
  const [showPopup, setShowPopup] = useState(false);

  const {
    saved,
    name: mentorName,
    nameInput,
    empIdInput,
    setNameInput,
    setEmpIdInput,
    onSubmit,
    onReset,
    saving,
    resetLoading,
  } = mentorProps || {};

  const handleSubmit = async () => {
    await onSubmit();
    setShowPopup(false);
  };

  return (
    <div className="header">
      <OnboardingTimeline user={user} />
      <div className="progress-mentor-row">
        <div className={`progress ${isComplete ? 'complete' : ''}`}>
          <strong>진행 상황:</strong> {progress}/{total} {isComplete && '완료!!'}
        </div>
        {mentorProps && (
          <div className="mentor-btn-area">
            {saved ? (
              <button className="mentor-info-btn mentor-info-btn--saved" onClick={() => setShowPopup(true)}>
                👤 멘토: {mentorName}
              </button>
            ) : (
              <button className="mentor-info-btn" onClick={() => setShowPopup(true)}>
                멘토 정보 입력
              </button>
            )}
          </div>
        )}
      </div>

      {showPopup && mentorProps && (
        <div className="mentor-popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="mentor-popup" onClick={e => e.stopPropagation()}>
            <div className="mentor-popup-header">
              <h3>멘토 정보 입력</h3>
              <button className="mentor-popup-close" onClick={() => setShowPopup(false)}>✕</button>
            </div>
            <div className="mentor-popup-body">
              {saved ? (
                <>
                  <p className="mentor-popup-message">
                    {user.name}님의 멘토는 <strong>{mentorName}</strong>님입니다.<br />
                    {mentorName}님과 함께 아래 미션을 수행해 볼까요?
                  </p>
                  <div className="mentor-popup-actions">
                    <button
                      className="mentor-popup-reset-btn"
                      onClick={async () => { await onReset(); setShowPopup(false); }}
                      disabled={resetLoading}
                    >
                      {resetLoading ? '초기화 중...' : '초기화'}
                    </button>
                    <button className="mentor-popup-cancel-btn" onClick={() => setShowPopup(false)}>
                      닫기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mentor-popup-inputs">
                    <label>멘토 성명</label>
                    <input
                      className="mentor-popup-input"
                      placeholder="멘토 성명"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      autoFocus
                    />
                    <label>멘토 사번</label>
                    <input
                      className="mentor-popup-input"
                      placeholder="멘토 사번"
                      value={empIdInput}
                      maxLength={6}
                      onChange={e => setEmpIdInput(e.target.value.replace(/\D/g, ''))}
                    />
                    <p className="mentor-popup-hint">※ 사번은 0100을 제외한 고유사번 6자리로 입력해주세요.</p>
                  </div>
                  <div className="mentor-popup-actions">
                    <button className="mentor-popup-cancel-btn" onClick={() => setShowPopup(false)}>
                      취소
                    </button>
                    <button
                      className="mentor-popup-submit-btn"
                      onClick={handleSubmit}
                      disabled={saving || !nameInput?.trim() || empIdInput?.length !== 6}
                    >
                      {saving ? '저장 중...' : '제출'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
