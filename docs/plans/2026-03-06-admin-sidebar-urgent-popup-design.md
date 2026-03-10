# 관리자 사이드바 + 마감 임박자 팝업 설계

## 요구사항

1. **마감 임박자 팝업**: KPI ④ 카드 숫자 클릭 → 대상자 목록 모달 (이름/팀/종료일/D-N)
2. **관리자 사이드바 레이아웃**: 로그인 직후 온보딩 현황 바로 표시, 좌측 사이드바로 메뉴 전환

## 아키텍처

- 기존 Navbar 유지 (모든 사용자 공통)
- 관리자용 `AdminLayout` 컴포넌트 신규 생성
- App.js에서 관리자 분기: AdminMenu+개별페이지 → AdminLayout 하나로 통합
- AdminLayout 내부에서 activePage 상태 관리

## 레이아웃 구조

```
<Navbar />
<div display:flex>
  <aside 사이드바 200px>
    - 온보딩 현황 (기본 active)
    - 공지사항 관리
    - 설문조사 관리
    - 직원 관리
  </aside>
  <main flex:1>
    선택된 페이지 렌더링
  </main>
</div>
```

## 마감 임박자 팝업 구조

```
AdminOnboarding.js 내부:
- urgentUsers 배열을 kpi 계산 시 함께 추출
- [urgentCount 숫자] 클릭 → showUrgentPopup state = true
- UrgentPopup 컴포넌트: 오버레이 + 카드
  - 헤더: "마감 임박자 목록 (3일 이내)"
  - 테이블: 이름 / 팀 / 종료일 / D-N
  - 닫기: X 버튼 or 바깥 클릭
```
