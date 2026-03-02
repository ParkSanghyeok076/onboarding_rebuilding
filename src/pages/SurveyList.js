import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Pages.css';

function SurveyList({ user, onStart, onViewResult, onBack }) {
  const [submittedRounds, setSubmittedRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmitted = async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('round_number')
        .eq('user_id', user.id);

      if (!error) {
        setSubmittedRounds((data || []).map(r => r.round_number));
      }
      setLoading(false);
    };
    fetchSubmitted();
  }, [user.id]);

  const today = new Date().toISOString().slice(0, 10);

  const getRoundInfo = (roundNumber) => {
    const start = user[`period_${roundNumber}_start`];
    const end = user[`period_${roundNumber}_end`];
    if (!start || !end) return null;

    let status;
    if (submittedRounds.includes(roundNumber)) {
      status = 'submitted';
    } else if (today < start) {
      status = 'upcoming';
    } else if (today > end) {
      status = 'closed';
    } else {
      status = 'open';
    }

    return { roundNumber, start, end, status };
  };

  const maxRounds = user.employee_type === '신입' ? [1, 2, 3] : [1];
  const rounds = maxRounds.map(getRoundInfo).filter(Boolean);

  const STATUS_LABEL = {
    submitted: '제출 완료',
    upcoming: '기간 전',
    closed: '기간 종료',
    open: '참여 가능',
  };

  const STATUS_CLASS = {
    submitted: 'round-status-submitted',
    upcoming: 'round-status-upcoming',
    closed: 'round-status-closed',
    open: 'round-status-open',
  };

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <div className="survey-container"><p>로딩 중...</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="survey-container">
        <h1 className="page-title">📝 설문조사</h1>
        <p className="survey-notice">본 설문의 응답은 멘토(버디)와 팀장님께 그대로 공개되지 않으나, 커피챗 및 면담 가이드에 일부 가공되어 포함될 수 있습니다.</p>
        <div className="survey-rounds-list">
          {rounds.map(({ roundNumber, start, end, status }) => (
            <div key={roundNumber} className="survey-round-card">
              <div className="round-info">
                <h2 className="round-title">{roundNumber}차 설문</h2>
                <p className="round-period">{start} ~ {end}</p>
              </div>
              <div className="round-actions">
                <span className={`round-status ${STATUS_CLASS[status]}`}>
                  {STATUS_LABEL[status]}
                </span>
                {status === 'open' && (
                  <button
                    className="round-btn round-btn-primary"
                    onClick={() => onStart(roundNumber)}
                  >
                    응답하기
                  </button>
                )}
                {status === 'submitted' && (
                  <button
                    className="round-btn round-btn-secondary"
                    onClick={() => onViewResult(roundNumber)}
                  >
                    결과보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SurveyList;
