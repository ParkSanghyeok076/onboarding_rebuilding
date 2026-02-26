import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProgramCard from '../components/ProgramCard';
import { programs } from '../data/programs';
import { supabase } from '../lib/supabase';
import '../App.css';

function OnboardingProgram({ user, onBack }) {
  const [submissions, setSubmissions] = useState({}); // { programId: signedUrl }
  const [loading, setLoading] = useState(true);

  // 기간 계산 (버그 수정: user.type → user.employee_type)
  const getPeriod = () => {
    if (user.employee_type === '신입') {
      return `${user.period_1_start} ~ ${user.period_3_end}`;
    } else {
      return `${user.period_1_start} ~ ${user.period_1_end}`;
    }
  };

  // 마운트 시 기존 제출 내역 로드
  useEffect(() => {
    const loadSubmissions = async () => {
      const { data, error } = await supabase
        .from('onboarding_submissions')
        .select('program_id, image_url')
        .eq('user_id', user.id);

      if (error) {
        console.error('제출 내역 로드 실패:', error);
        setLoading(false);
        return;
      }

      const urlMap = {};
      for (const sub of data) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('onboarding-images')
          .createSignedUrl(sub.image_url, 3600);

        if (!urlError && urlData) {
          urlMap[sub.program_id] = urlData.signedUrl;
        }
      }
      setSubmissions(urlMap);
      setLoading(false);
    };

    loadSubmissions();
  }, [user.id]);

  const handleImageUpload = (programId, storagePath) => {
    setSubmissions(prev => ({ ...prev, [programId]: storagePath }));
  };

  const progress = Object.keys(submissions).length;

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <div className="App">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

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
              userId={user.id}
              existingImageUrl={submissions[program.id] || null}
              onImageUpload={handleImageUpload}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default OnboardingProgram;
