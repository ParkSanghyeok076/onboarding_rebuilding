# 관리자 사이드바 + 마감 임박자 팝업 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 관리자 UI에 좌측 사이드바 레이아웃을 도입하고, KPI 마감 임박자 숫자 클릭 시 대상자 목록 팝업을 추가한다.

**Architecture:** AdminLayout 신규 컴포넌트가 사이드바 + 콘텐츠 영역을 관리하며 App.js에서 hr_admin 분기 시 렌더링한다. 마감 임박자 팝업은 AdminOnboarding 내부 상태로 처리한다.

**Tech Stack:** React (useState), CSS

---

## 배경 지식

### 현재 App.js 구조 (관리자 분기)
```jsx
// 로그인 후 currentPage === 'menu'일 때:
currentUser.role === 'hr_admin'
  ? <AdminMenu onSelectMenu={handleSelectMenu} />
  : <MainMenu .../>

// 각 페이지별 조건부 렌더링:
{currentPage === 'admin-onboarding' && <AdminOnboarding onBack={handleBack} />}
{currentPage === 'admin-announcements' && <AdminAnnouncements onBack={handleBack} />}
{currentPage === 'admin-survey' && <AdminSurvey onBack={handleBack} />}
{currentPage === 'admin-users' && <AdminUsers onBack={handleBack} />}
```

### 변경 후 App.js 관리자 분기
```jsx
// hr_admin이면 AdminLayout 하나로 통합
currentUser.role === 'hr_admin'
  ? <AdminLayout user={currentUser} onLogout={handleLogout} />
  : <일반사용자 페이지들.../>
```

### Navbar 높이
현재 Navbar는 `padding: 20px 30px` → 실질 높이 약 72px. AdminLayout 최소 높이는 `calc(100vh - 72px)` 사용.

### 현재 kpi useMemo urgentCount 계산 위치
`src/pages/AdminOnboarding.js` 내 useMemo에서 urgentCount 계산 후 반환. urgentUsers 배열은 아직 없음.

---

## Task 1: AdminOnboarding — urgentUsers 배열 추출 + 팝업 상태 추가

**Files:**
- Modify: `src/pages/AdminOnboarding.js`

### Step 1: kpi useMemo에서 urgentUsers 배열 추가

현재 useMemo 안의 urgentCount 계산 부분:
```js
    const urgentCount = rows.filter(row => {
      if (row.completed) return false;
      const isNewHire = row.employee_type === '신입';
      const endStr = isNewHire ? row.period_3_end : row.period_1_end;
      if (!endStr) return false;
      const endDate = toDate(endStr);
      return endDate >= today && endDate <= deadline3;
    }).length;

    return {
      total, newHireCount, careerCount,
      completedCount, completionRate,
      surveyTotal, surveyDone, surveyRate, earliestDeadline,
      urgentCount,
    };
```

이를 아래로 교체 (urgentUsers 배열 추가):
```js
    const urgentUsers = rows
      .filter(row => {
        if (row.completed) return false;
        const isNewHire = row.employee_type === '신입';
        const endStr = isNewHire ? row.period_3_end : row.period_1_end;
        if (!endStr) return false;
        const endDate = toDate(endStr);
        return endDate >= today && endDate <= deadline3;
      })
      .map(row => {
        const isNewHire = row.employee_type === '신입';
        const endStr = isNewHire ? row.period_3_end : row.period_1_end;
        const endDate = toDate(endStr);
        const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        return {
          name: row.name,
          department: row.department || '—',
          endDate: endStr,
          daysLeft,
        };
      });

    return {
      total, newHireCount, careerCount,
      completedCount, completionRate,
      surveyTotal, surveyDone, surveyRate, earliestDeadline,
      urgentCount: urgentUsers.length,
      urgentUsers,
    };
```

### Step 2: showUrgentPopup state 추가

컴포넌트 상단 useState들 아래에 추가:
```js
  const [showUrgentPopup, setShowUrgentPopup] = useState(false);
```

### Step 3: KPI ④ 카드 urgentCount를 클릭 가능하게 변경

현재 KPI ④ 카드 JSX:
```jsx
            {/* ④ 마감 임박자 */}
            <div className="kpi-card red">
              <div className="kpi-label">마감 임박자 (3일 이내)</div>
              <div className="kpi-urgent-num">{kpi.urgentCount}<span style={{fontSize:14, fontWeight:500, color:'#888', marginLeft:4}}>명</span></div>
              <div className="kpi-sub">
                {kpi.urgentCount > 0 ? '온보딩 종료 3일 이내 미완료' : '임박한 미완료 없음'}
              </div>
            </div>
```

아래로 교체:
```jsx
            {/* ④ 마감 임박자 */}
            <div className="kpi-card red">
              <div className="kpi-label">마감 임박자 (3일 이내)</div>
              <div
                className="kpi-urgent-num"
                onClick={() => kpi.urgentCount > 0 && setShowUrgentPopup(true)}
                style={{ cursor: kpi.urgentCount > 0 ? 'pointer' : 'default' }}
                title={kpi.urgentCount > 0 ? '클릭하여 목록 보기' : undefined}
              >
                {kpi.urgentCount}
                <span style={{fontSize:14, fontWeight:500, color:'#888', marginLeft:4}}>명</span>
              </div>
              <div className="kpi-sub">
                {kpi.urgentCount > 0 ? '클릭하여 대상자 확인' : '임박한 미완료 없음'}
              </div>
            </div>
```

### Step 4: UrgentPopup 컴포넌트 추가 + 렌더링

`ProgramGridPopup` 함수 위에 아래 컴포넌트를 추가:
```jsx
function UrgentPopup({ users, onClose }) {
  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="program-popup" onClick={e => e.stopPropagation()} style={{maxWidth: 480}}>
        <div className="program-popup-header">
          <h3>마감 임박자 목록 (3일 이내)</h3>
          <button className="program-popup-close" onClick={onClose}>✕</button>
        </div>
        {users.length === 0 ? (
          <p style={{color:'#888', textAlign:'center', padding:'20px 0'}}>대상자가 없습니다.</p>
        ) : (
          <table className="admin-table" style={{width:'100%'}}>
            <thead>
              <tr>
                <th>이름</th>
                <th>팀</th>
                <th>종료일</th>
                <th>남은 기간</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i}>
                  <td>{u.name}</td>
                  <td>{u.department}</td>
                  <td>{formatShortDate(u.endDate)}</td>
                  <td>
                    <span style={{
                      color: u.daysLeft <= 1 ? '#dc3545' : '#f59e0b',
                      fontWeight: 700
                    }}>
                      D-{u.daysLeft}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

return 문 맨 아래 `{selectedUser && <ProgramGridPopup .../>}` 바로 아래에 추가:
```jsx
      {showUrgentPopup && kpi && (
        <UrgentPopup users={kpi.urgentUsers} onClose={() => setShowUrgentPopup(false)} />
      )}
```

### Step 5: 커밋
```bash
git add src/pages/AdminOnboarding.js
git commit -m "feat: 마감 임박자 팝업 추가 (클릭 시 대상자 목록)"
```

---

## Task 2: AdminLayout 컴포넌트 신규 생성 (풀 사이드바 레이아웃)

**핵심 결정**: 관리자는 기존 Navbar를 완전히 숨기고, 사이드바 자체에 로고+메뉴+사용자정보를 모두 담는다.
프로토타입(`prototype-deloitte.html`)의 사이드바 구조를 참고할 것.

**Files:**
- Create: `src/components/AdminLayout.js`
- Create: `src/components/AdminLayout.css`

### Step 1: AdminLayout.css 생성

```css
/* src/components/AdminLayout.css */

/* 전체 레이아웃: 사이드바 + 콘텐츠 영역, 100vh 전체 */
.admin-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* ── 사이드바 (240px, 전체 높이) ── */
.admin-sidebar {
  width: 240px;
  background: #1a2332;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* 로고 영역 */
.admin-sidebar-logo {
  padding: 28px 24px 24px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}

.admin-sidebar-logo-icon {
  width: 40px;
  height: 40px;
  background: #667eea;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-bottom: 10px;
}

.admin-sidebar-logo-title {
  font-size: 15px;
  font-weight: 700;
  color: white;
  line-height: 1.3;
}

.admin-sidebar-logo-sub {
  font-size: 11px;
  color: rgba(255,255,255,.4);
  margin-top: 2px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

/* 네비게이션 메뉴 */
.admin-sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.admin-sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  cursor: pointer;
  color: rgba(255,255,255,.55);
  font-size: 14px;
  font-weight: 500;
  transition: all .15s;
  border-radius: 8px;
  margin-bottom: 2px;
  user-select: none;
}

.admin-sidebar-item:hover {
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
}

.admin-sidebar-item.active {
  background: rgba(102,126,234,.22);
  color: white;
}

.admin-sidebar-item.active .admin-sidebar-icon {
  opacity: 1;
}

.admin-sidebar-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
  opacity: 0.7;
}

/* 하단 사용자 정보 */
.admin-sidebar-user {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,.08);
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-sidebar-avatar {
  width: 34px;
  height: 34px;
  background: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  font-weight: 700;
  flex-shrink: 0;
}

.admin-sidebar-user-info {
  flex: 1;
  min-width: 0;
}

.admin-sidebar-user-name {
  font-size: 13px;
  font-weight: 600;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-sidebar-user-role {
  font-size: 11px;
  color: rgba(255,255,255,.4);
}

.admin-sidebar-logout {
  background: none;
  border: none;
  color: rgba(255,255,255,.35);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 4px;
  transition: color .15s;
  flex-shrink: 0;
}

.admin-sidebar-logout:hover {
  color: rgba(255,255,255,.7);
}

/* ── 콘텐츠 영역 ── */
.admin-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

/* 콘텐츠 내 상단 바 (얇은 헤더) */
.admin-topbar {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  padding: 0 28px;
  flex-shrink: 0;
  justify-content: space-between;
}

.admin-topbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a2332;
}

.admin-topbar-date {
  font-size: 13px;
  color: #888;
}

/* 콘텐츠 메인 */
.admin-main {
  flex: 1;
  background: #f5f5f5;
  overflow-y: auto;
}
```

### Step 2: AdminLayout.js 생성

현재 날짜를 topbar에 표시하기 위해 formatDate 헬퍼를 추가한다.
`user` prop으로 로그인 유저 정보를, `onLogout` prop으로 로그아웃 핸들러를 받는다.

```jsx
// src/components/AdminLayout.js
import React, { useState } from 'react';
import AdminOnboarding from '../pages/AdminOnboarding';
import AdminAnnouncements from '../pages/AdminAnnouncements';
import AdminSurvey from '../pages/AdminSurvey';
import AdminUsers from '../pages/AdminUsers';
import './AdminLayout.css';

const MENU_ITEMS = [
  { id: 'admin-onboarding',    icon: '📋', label: '온보딩 현황' },
  { id: 'admin-announcements', icon: '📢', label: '공지사항 관리' },
  { id: 'admin-survey',        icon: '📝', label: '설문조사 관리' },
  { id: 'admin-users',         icon: '👥', label: '직원 관리' },
];

const PAGE_TITLES = {
  'admin-onboarding':    '온보딩 현황',
  'admin-announcements': '공지사항 관리',
  'admin-survey':        '설문조사 관리',
  'admin-users':         '직원 관리',
};

function formatDate(d) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function AdminLayout({ user, onLogout }) {
  const [activePage, setActivePage] = useState('admin-onboarding');

  const userName = user?.name || user?.employee_id || 'Admin';
  const avatarChar = userName.charAt(0);

  return (
    <div className="admin-layout">
      {/* 사이드바 */}
      <aside className="admin-sidebar">
        {/* 로고 */}
        <div className="admin-sidebar-logo">
          <div className="admin-sidebar-logo-icon">🏢</div>
          <div className="admin-sidebar-logo-title">온보딩 시스템</div>
          <div className="admin-sidebar-logo-sub">HR Admin</div>
        </div>

        {/* 네비게이션 */}
        <nav className="admin-sidebar-nav">
          {MENU_ITEMS.map(item => (
            <div
              key={item.id}
              className={`admin-sidebar-item${activePage === item.id ? ' active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="admin-sidebar-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        {/* 하단 사용자 정보 */}
        <div className="admin-sidebar-user">
          <div className="admin-sidebar-avatar">{avatarChar}</div>
          <div className="admin-sidebar-user-info">
            <div className="admin-sidebar-user-name">{userName}</div>
            <div className="admin-sidebar-user-role">HR 관리자</div>
          </div>
          <button className="admin-sidebar-logout" onClick={onLogout} title="로그아웃">⏻</button>
        </div>
      </aside>

      {/* 콘텐츠 영역 */}
      <div className="admin-content">
        {/* 상단 바 */}
        <div className="admin-topbar">
          <span className="admin-topbar-title">{PAGE_TITLES[activePage]}</span>
          <span className="admin-topbar-date">{formatDate(new Date())}</span>
        </div>

        {/* 페이지 */}
        <main className="admin-main">
          {activePage === 'admin-onboarding' && (
            <AdminOnboarding onBack={() => setActivePage('admin-onboarding')} />
          )}
          {activePage === 'admin-announcements' && (
            <AdminAnnouncements onBack={() => setActivePage('admin-onboarding')} />
          )}
          {activePage === 'admin-survey' && (
            <AdminSurvey onBack={() => setActivePage('admin-onboarding')} />
          )}
          {activePage === 'admin-users' && (
            <AdminUsers onBack={() => setActivePage('admin-onboarding')} />
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
```

### Step 3: 커밋
```bash
git add src/components/AdminLayout.js src/components/AdminLayout.css
git commit -m "feat: AdminLayout 풀 사이드바 컴포넌트 생성"
```

---

## Task 3: App.js 수정 — 관리자는 Navbar 없이 AdminLayout만 렌더링

**핵심 변경**: hr_admin 로그인 시 `<Navbar>`를 렌더링하지 않고 `<AdminLayout>`만 반환.
일반 사용자는 기존과 동일하게 Navbar + 페이지 구조 유지.

**Files:**
- Modify: `src/App.js`

### Step 1: AdminLayout import 추가, 불필요 import 삭제

기존 import 목록에서 아래를 **삭제**:
```js
import AdminMenu from './components/AdminMenu';
import AdminAnnouncements from './pages/AdminAnnouncements';
import AdminOnboarding from './pages/AdminOnboarding';
import AdminSurvey from './pages/AdminSurvey';
import AdminUsers from './pages/AdminUsers';
```

대신 아래를 **추가**:
```js
import AdminLayout from './components/AdminLayout';
```

### Step 2: return 문 전체를 교체

현재 App.js의 `return (` 이후 전체를 아래로 교체:

```jsx
  // hr_admin은 전용 레이아웃 (Navbar 없음)
  if (currentUser.role === 'hr_admin') {
    return <AdminLayout user={currentUser} onLogout={handleLogout} />;
  }

  // 일반 사용자
  return (
    <div>
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onPasswordChange={handlePasswordChange}
      />

      {currentPage === 'menu' && (
        <MainMenu user={currentUser} onSelectMenu={handleSelectMenu} />
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

      <footer style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: '13px', borderTop: '1px solid #eee', marginTop: '32px' }}>
        📞 문의 : 인사기획팀 박상혁 선임(1456)
      </footer>
    </div>
  );
```

### Step 3: 커밋
```bash
git add src/App.js
git commit -m "feat: 관리자 hr_admin은 Navbar 없이 AdminLayout만 렌더링"
```

---

## 검증 체크리스트

- [ ] 관리자 로그인 → 카드 메뉴 없이 바로 온보딩 현황 표시
- [ ] 사이드바 메뉴 클릭 → 해당 페이지로 전환, active 스타일 적용
- [ ] 마감 임박자 숫자 클릭 → 팝업 오버레이 표시
- [ ] 팝업: 이름/팀/종료일/D-N 표시, D-1은 빨간색/나머지 주황색
- [ ] 팝업 바깥 클릭 or X 버튼 → 닫힘
- [ ] urgentCount === 0 → 숫자 클릭 안 됨, 팝업 미표시
- [ ] 일반 사용자 로그인 → 기존 동작 그대로 (사이드바 없음)
- [ ] 기존 AdminOnboarding 기능 (정렬, 필터, 계획서 체크박스, 프로그램 팝업) 정상 동작
