import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

function SurveyResult({ user, roundNumber, onBack }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponse = async () => {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('round_number', roundNumber)
        .single();

      if (!error) setResponse(data);
      setLoading(false);
    };
    fetchResponse();
  }, [user.id, roundNumber]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="survey-container"><p>로딩 중...</p></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <div className="survey-container">
        <h1 className="page-title">📋 {roundNumber}차 설문 결과</h1>
        <p className="result-submitted-at">
          제출일: {response?.submitted_at?.slice(0, 10)}
        </p>

        {PARTS.map(part => (
          <div key={part.number} className="result-part">
            <h2 className="result-part-title">{part.title}</h2>
            {part.questions.map((q, idx) => (
              <div key={q.key} className="result-question">
                <p className="question-text">
                  <span className="question-number">{idx + 1}.</span> {q.text}
                </p>
                <p className="result-answer">
                  {q.type === 'scale'
                    ? `${response?.[q.key]}점 — ${SCALE_LABELS[response?.[q.key]] || ''}`
                    : response?.[q.key] || '(미작성)'}
                </p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SurveyResult;
