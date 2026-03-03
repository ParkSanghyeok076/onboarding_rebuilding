import React from 'react';
import OnboardingTimeline from './OnboardingTimeline';

function Header({ user, progress, total }) {
  const isComplete = progress === total;

  return (
    <div className="header">
      <OnboardingTimeline user={user} />
      <div className={`progress ${isComplete ? 'complete' : ''}`}>
        <strong>진행 상황:</strong> {progress}/{total} {isComplete && '완료!!'}
      </div>
    </div>
  );
}

export default Header;
