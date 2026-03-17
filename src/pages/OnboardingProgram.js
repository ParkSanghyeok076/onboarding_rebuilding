import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProgramCard from '../components/ProgramCard';
import { programs } from '../data/programs';
import { supabase } from '../lib/supabase';
import '../App.css';
import './Pages.css';

function OnboardingProgram({ user, onBack }) {
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  // 멘토 state
  const [mentorSaved, setMentorSaved] = useState(!!user.mentor_name);
  const [mentorName, setMentorName] = useState(user.mentor_name || '');
  const [mentorNameInput, setMentorNameInput] = useState('');
  const [mentorEmpIdInput, setMentorEmpIdInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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

  const handleMentorSubmit = async () => {
    if (!mentorNameInput.trim() || !mentorEmpIdInput.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({
        mentor_name: mentorNameInput.trim(),
        mentor_id: mentorEmpIdInput.trim(),
      })
      .eq('id', user.id);
    if (!error) {
      setMentorName(mentorNameInput.trim());
      setMentorSaved(true);
    }
    setSaving(false);
  };

  const handleMentorReset = async () => {
    setResetLoading(true);
    const { error } = await supabase
      .from('users')
      .update({ mentor_name: null, mentor_id: null })
      .eq('id', user.id);
    if (!error) {
      setMentorName('');
      setMentorNameInput('');
      setMentorEmpIdInput('');
      setMentorSaved(false);
    }
    setResetLoading(false);
  };

  const progress = Object.keys(submissions).length;

  if (loading) {
    return (
      <div className="page-container">
        <div className="App">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>

      <div className="App">
        <Header
          user={user}
          progress={progress}
          total={programs.length}
          mentorProps={{
            saved: mentorSaved,
            name: mentorName,
            nameInput: mentorNameInput,
            empIdInput: mentorEmpIdInput,
            setNameInput: setMentorNameInput,
            setEmpIdInput: setMentorEmpIdInput,
            onSubmit: handleMentorSubmit,
            onReset: handleMentorReset,
            saving,
            resetLoading,
          }}
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
