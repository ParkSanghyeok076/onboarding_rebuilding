import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';
import './App.css';
import Login from './components/Login';
import Navbar from './components/Navbar';
import MainMenu from './components/MainMenu';
import OnboardingProgram from './pages/OnboardingProgram';
import Announcements from './pages/Announcements';
import Survey from './pages/Survey';
import PasswordChange from './pages/PasswordChange';

function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('menu');
  const [loading, setLoading] = useState(true);

  // CSV 파일 읽기
  useEffect(() => {
    fetch('/onboarding_test.csv')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        // EUC-KR 또는 CP949 인코딩을 UTF-8로 변환
        const uint8Array = new Uint8Array(buffer);

        // 여러 인코딩 시도 (EUC-KR, CP949, UTF-8)
        let csvText;
        try {
          csvText = iconv.decode(Buffer.from(uint8Array), 'EUC-KR');
        } catch (e) {
          try {
            csvText = iconv.decode(Buffer.from(uint8Array), 'CP949');
          } catch (e2) {
            csvText = iconv.decode(Buffer.from(uint8Array), 'UTF-8');
          }
        }

        Papa.parse(csvText, {
          header: true,
          complete: (results) => {
            setUsers(results.data.filter(user => user.id)); // 빈 행 제거
            setLoading(false);
          }
        });
      })
      .catch(error => {
        console.error('CSV 로드 실패:', error);
        setLoading(false);
      });

    // 저장된 세션 확인
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // 로그인 핸들러
  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentPage('menu');
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setCurrentPage('menu');
  };

  // 메뉴 선택 핸들러
  const handleSelectMenu = (menuId) => {
    setCurrentPage(menuId);
  };

  // 메뉴로 돌아가기
  const handleBack = () => {
    setCurrentPage('menu');
  };

  // 비밀번호 변경 페이지로 이동
  const handlePasswordChange = () => {
    setCurrentPage('password-change');
  };

  // 비밀번호 변경 완료 핸들러
  const handlePasswordChanged = (newPassword) => {
    // 비밀번호가 변경되었음을 처리 (나중에 API 호출로 교체)
    console.log('비밀번호가 변경되었습니다:', newPassword);
  };

  if (loading) {
    return <div className="App loading">데이터 로딩 중...</div>;
  }

  // 로그인하지 않은 경우
  if (!currentUser) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  // 로그인한 경우
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
