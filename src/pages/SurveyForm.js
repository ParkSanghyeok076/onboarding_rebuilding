import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PARTS, SCALE_LABELS } from '../data/surveyQuestions';
import './Pages.css';

function SurveyForm({ user, roundNumber, onSubmitted, onBack }) {
  const [currentPart, setCurrentPart] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const part = PARTS[currentPart];

  const handleAnswerChange = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const isPartValid = () => {
    return part.questions
      .every(q => q.type === 'scale'
        ? answers[q.key] !== undefined
        : (answers[q.key] || '').trim() !== '');
  };

  const handleNext = () => {
    if (currentPart < PARTS.length - 1) {
      setCurrentPart(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPart > 0) {
      setCurrentPart(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from('survey_responses')
      .insert({
        user_id: user.id,
        round_number: roundNumber,
        ...answers,
      });
    setSubmitting(false);

    if (error) {
      setConfirmOpen(false);
      alert('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
      console.error(error);
    } else {
      setConfirmOpen(false);
      onSubmitted();
    }
  };

  const isLastPart = currentPart === PARTS.length - 1;

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 목록으로</button>
      <div className="survey-container">
        <div className="survey-progress-bar">
          {PARTS.map((p, i) => (
            <div
              key={p.number}
              className={`progress-step ${i <= currentPart ? 'progress-step-active' : ''}`}
            />
          ))}
          <span className="progress-label">{currentPart + 1} / {PARTS.length}</span>
        </div>

        <h2 className="survey-part-title">{part.title}</h2>
        {part.description && (
          <p className="survey-part-description">{part.description}</p>
        )}

        <div className="survey-questions">
          {part.questions.map((q, idx) => (
            <div key={q.key} className="survey-question">
              <p className="question-text">
                <span className="question-number">{idx + 1}.</span> {q.text}
                <span className="required-mark"> *</span>
              </p>
              {q.type === 'scale' ? (
                <div className="scale-options">
                  {[1, 2, 3, 4, 5].map(val => (
                    <label
                      key={val}
                      className={`scale-option ${answers[q.key] === val ? 'scale-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={q.key}
                        value={val}
                        checked={answers[q.key] === val}
                        onChange={() => handleAnswerChange(q.key, val)}
                      />
                      <span className="scale-value">{val}</span>
                      <span className="scale-label">{SCALE_LABELS[val]}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="survey-textarea"
                  placeholder="최대한 구체적으로 작성해주세요."
                  value={answers[q.key] || ''}
                  onChange={e => handleAnswerChange(q.key, e.target.value)}
                  rows={4}
                />
              )}
            </div>
          ))}
        </div>

        <div className="survey-nav">
          {currentPart > 0 && (
            <button className="survey-nav-btn survey-nav-prev" onClick={handlePrev}>
              ← 이전
            </button>
          )}
          {!isLastPart ? (
            <button
              className="survey-nav-btn survey-nav-next"
              onClick={handleNext}
              disabled={!isPartValid()}
            >
              다음 →
            </button>
          ) : (
            <button
              className="survey-nav-btn survey-nav-submit"
              onClick={() => setConfirmOpen(true)}
            >
              제출하기
            </button>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>설문을 제출하시겠습니까?</h3>
            <p>제출 후에는 수정이 불가합니다.</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-cancel"
                onClick={() => setConfirmOpen(false)}
              >
                취소
              </button>
              <button
                className="confirm-btn confirm-ok"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '제출 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyForm;
