import React from 'react';
import './Pages.css';

function Survey({ onBack }) {
  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">
        ← 메뉴로 돌아가기
      </button>

      <div className="temp-page">
        <div className="temp-icon">📝</div>
        <h1>설문조사</h1>
        <p>설문조사 페이지는 곧 개발될 예정입니다.</p>
      </div>
    </div>
  );
}

export default Survey;
