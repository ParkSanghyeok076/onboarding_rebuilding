import React from 'react';

function Header({ period, progress, total }) {
  const isComplete = progress === total;

  return (
    <div className="header">
      <div className="period">
        <strong>온보딩 기간:</strong> {period}
      </div>
      <div className={`progress ${isComplete ? 'complete' : ''}`}>
        <strong>진행 상황:</strong> {progress}/{total} {isComplete && '완료!!'}
      </div>
    </div>
  );
}

export default Header;
