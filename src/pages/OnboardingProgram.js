import React, { useState, useEffect } from 'react';
import ProgramCard from '../components/ProgramCard';
import { programs } from '../data/programs';
import { supabase } from '../lib/supabase';
import '../App.css';
import './Pages.css';

function OnboardingProgram({ user, onBack }) {
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubmissions = async () => {
      const { data, error } = await supabase
        .from('onboarding_submissions')
        .select('program_id, image_url')
        .eq('user_id', user.id);

      if (error) { setLoading(false); return; }

      const urlMap = {};
      for (const sub of data) {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('onboarding-images')
          .createSignedUrl(sub.image_url, 3600);
        if (!urlError && urlData) urlMap[sub.program_id] = urlData.signedUrl;
      }
      setSubmissions(urlMap);
      setLoading(false);
    };
    loadSubmissions();
  }, [user.id]);

  const handleImageUpload = (programId, storagePath) => {
    setSubmissions(prev => ({ ...prev, [programId]: storagePath }));
  };

  if (loading) {
    return <div className="page-container"><p style={{ padding: 24 }}>로딩 중...</p></div>;
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
      <div className="App">
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
