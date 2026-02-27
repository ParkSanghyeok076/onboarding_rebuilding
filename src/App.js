import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import './App.css';
import Login from './components/Login';
import Navbar from './components/Navbar';
import MainMenu from './components/MainMenu';
import OnboardingProgram from './pages/OnboardingProgram';
import Announcements from './pages/Announcements';
import Survey from './pages/Survey';
import PasswordChange from './pages/PasswordChange';
import AdminMenu from './components/AdminMenu';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminOnboarding from './pages/AdminOnboarding';
import AdminSurvey from './pages/AdminSurvey';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(undefined); // undefined=초기화 전, null=비로그인, string=로그인

  // 1단계: 인증 상태만 감지 (REST 호출 금지)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // 2단계: userId 변화에 따라 프로필 로드 (onAuthStateChange 밖에서 REST 호출)
  useEffect(() => {
    if (userId === undefined) return; // 아직 초기화 전

    if (userId === null) {
      setCurrentUser(null);
      setCurrentPage('menu');
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('프로필 로드 실패:', error);
        } else {
          setCurrentUser(data);
        }
      } catch (e) {
        console.error('fetchUserProfile 예외:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSelectMenu = (menuId) => {
    setCurrentPage(menuId);
  };

  const handleBack = () => {
    setCurrentPage('menu');
  };

  const handlePasswordChange = () => {
    setCurrentPage('password-change');
  };

  const handlePasswordChanged = () => {
    setCurrentPage('menu');
  };

  if (loading) {
    return <div className="App loading">로딩 중...</div>;
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div>
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onPasswordChange={handlePasswordChange}
      />

      {currentPage === 'menu' && (
        currentUser.role === 'hr_admin'
          ? <AdminMenu onSelectMenu={handleSelectMenu} />
          : <MainMenu onSelectMenu={handleSelectMenu} />
      )}
      {currentPage === 'admin-announcements' && (
        <AdminAnnouncements onBack={handleBack} />
      )}
      {currentPage === 'admin-onboarding' && (
        <AdminOnboarding onBack={handleBack} />
      )}
      {currentPage === 'admin-survey' && (
        <AdminSurvey onBack={handleBack} />
      )}
      {currentPage === 'announcements' && (
        <Announcements onBack={handleBack} />
      )}
      {currentPage === 'onboarding' && (
        <OnboardingProgram user={currentUser} onBack={handleBack} />
      )}
      {currentPage === 'survey' && (
        <Survey user={currentUser} onBack={handleBack} />
      )}
      {currentPage === 'password-change' && (
        <PasswordChange
          user={currentUser}
          onBack={handleBack}
          onPasswordChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
}

export default App;
