import React, { useState } from 'react';
import Header from '../components/Header';
import ProgramCard from '../components/ProgramCard';
import { programs } from '../data/programs';
import '../App.css';

function OnboardingProgram({ user, onBack }) {
  const [uploadedImages, setUploadedImages] = useState({});

  // 기간 계산
  const getPeriod = () => {
    if (user.type === 'A') {
      return `${user.period_1_start} ~ ${user.period_3_end}`;
    } else {
      return `${user.period_1_start} ~ ${user.period_1_end}`;
    }
  };

  // 이미지 업로드 핸들러
  const handleImageUpload = (programId, imageData) => {
    setUploadedImages(prev => ({
      ...prev,
      [programId]: imageData
    }));
  };

  // 진행률 계산
  const progress = Object.keys(uploadedImages).length;

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">
        ← 메뉴로 돌아가기
      </button>

      <div className="App">
        <Header
          period={getPeriod()}
          progress={progress}
          total={programs.length}
        />
        <div className="programs-grid">
          {programs.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              onImageUpload={handleImageUpload}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default OnboardingProgram;
