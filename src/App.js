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

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('menu');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인 (새로고침 시 로그인 유지)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 로그인/로그아웃 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setCurrentPage('menu');
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
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
    setLoading(false);
  };

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
        <MainMenu onSelectMenu={handleSelectMenu} />
      )}
      {currentPage === 'announcements' && (
        <Announcements onBack={handleBack} />
      )}
      {currentPage === 'onboarding' && (
        <OnboardingProgram user={currentUser} onBack={handleBack} />
      )}
      {currentPage === 'survey' && (
        <Survey onBack={handleBack} />
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
