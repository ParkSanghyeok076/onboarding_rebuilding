import React, { useState } from 'react';
import SurveyList from './SurveyList';
import SurveyForm from './SurveyForm';
import SurveyResult from './SurveyResult';

function Survey({ user, onBack }) {
  const [view, setView] = useState('list'); // 'list' | 'form' | 'result'
  const [selectedRound, setSelectedRound] = useState(null);

  const handleStart = (roundNumber) => {
    setSelectedRound(roundNumber);
    setView('form');
  };

  const handleViewResult = (roundNumber) => {
    setSelectedRound(roundNumber);
    setView('result');
  };

  const handleSubmitted = () => {
    setView('list');
  };

  const handleBackToList = () => {
    setView('list');
  };

  if (view === 'form') {
    return (
      <SurveyForm
        user={user}
        roundNumber={selectedRound}
        onSubmitted={handleSubmitted}
        onBack={handleBackToList}
      />
    );
  }

  if (view === 'result') {
    return (
      <SurveyResult
        user={user}
        roundNumber={selectedRound}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <SurveyList
      user={user}
      onStart={handleStart}
      onViewResult={handleViewResult}
      onBack={onBack}
    />
  );
}

export default Survey;
