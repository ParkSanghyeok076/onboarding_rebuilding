# 신규입사자 온보딩 시스템 개발 일지

## 📅 작업 날짜: 2026-02-11

---

## 🎯 프로젝트 개요

신규입사자(신입공채, 경력공채)의 온보딩 과정을 관리하는 웹 애플리케이션

### 주요 목표
- 사용자 친화적인 온보딩 프로세스
- 6가지 온보딩 활동 관리
- 설문조사 시스템 (1차, 2차, 3차)
- 나중에 Neo4j + GraphRAG 연동 준비

---

## ✅ 완성된 기능

### 1. React 프로젝트 초기 설정
- **도구**: Create React App
- **구조**: 컴포넌트 기반 아키텍처
- **스타일**: CSS Modules

### 2. 온보딩 프로그램 페이지 ⭐
**경로**: `/onboarding`

**기능**:
- 3×2 그리드 레이아웃 (6가지 활동)
- 이미지 업로드 및 미리보기
- 실시간 진행률 표시 (0/6 → 6/6 완료!!)
- 온보딩 기간 자동 표시
  - 신입공채(A): 1차 시작 ~ 3차 종료
  - 경력공채(B): 1차 시작 ~ 1차 종료

**6가지 온보딩 활동**:
1. 멘토와의 티타임
2. 팀원들과 인사
3. 구내식당 이용
4. 주변 맛집 탐방
5. 협업 부서와 인사
6. 자율활동

### 3. 로그인 시스템 🔐
**경로**: `/` (최초 진입)

**기능**:
- CSV 데이터 기반 인증
- 초기 비밀번호: `y` + 사번 (예: y1001001)
- 변경된 비밀번호 자동 인식
- localStorage 기반 세션 유지

### 4. 메인 메뉴
**경로**: `/menu`

**메뉴 구성**:
- 📢 공지사항 (준비 중)
- 📋 온보딩 프로그램 (완성)
- 📝 설문조사 (준비 중)

### 5. 네비게이션 바
**위치**: 상단 고정

**표시 정보**:
- 팀명, 이름, 멘토링 기간
- 프로필 드롭다운 메뉴
  - 🔑 비밀번호 변경
  - 🚪 로그아웃

### 6. 비밀번호 변경 기능 🔑
**경로**: `/password-change`

**기능**:
- 현재 비밀번호 확인
- 새 비밀번호 설정 (최소 6자)
- 유효성 검사
- localStorage 저장 (API 마이그레이션 준비)

**데이터 구조**:
```json
{
  "userId": "1001001",
  "password": "newPassword",
  "changedAt": "2026-02-11T10:30:00Z",
  "changeHistory": [...]
}
```

---

## 🔧 기술 스택

### Frontend
- **React** 19.2.4
- **React Router** (페이지 라우팅)
- **CSS3** (커스텀 스타일)

### Data Processing
- **Papa Parse** (CSV 파싱)
- **iconv-lite** (한글 인코딩 처리)
- **Buffer** (브라우저 polyfill)

### 데이터 저장
- **localStorage** (프로토타입)
- **JSON** 구조 (API 마이그레이션 준비)

---

## 📂 프로젝트 구조

```
onboarding-app/
├── public/
│   ├── index.html
│   └── onboarding_test.csv          # 신규입사자 데이터
├── src/
│   ├── components/
│   │   ├── Header.js                # 온보딩 헤더 (기간, 진행률)
│   │   ├── ProgramCard.js           # 활동 카드 (이미지 업로드)
│   │   ├── Login.js / Login.css     # 로그인 페이지
│   │   ├── Navbar.js / Navbar.css   # 네비게이션 바
│   │   └── MainMenu.js / MainMenu.css # 메인 메뉴
│   ├── pages/
│   │   ├── OnboardingProgram.js     # 온보딩 프로그램
│   │   ├── PasswordChange.js        # 비밀번호 변경
│   │   ├── Announcements.js         # 공지사항 (준비 중)
│   │   ├── Survey.js                # 설문조사 (준비 중)
│   │   └── Pages.css
│   ├── data/
│   │   └── programs.js              # 6가지 활동 데이터
│   ├── App.js                       # 메인 라우팅
│   ├── App.css
│   └── index.js
├── package.json
└── WORK_LOG.md                      # 이 파일
```

---

## 🔄 주요 해결 과제

### 1. 한글 인코딩 문제 ✅
**문제**: CSV 파일의 한글이 깨져서 표시됨

**해결**:
- `iconv-lite` 라이브러리 설치
- EUC-KR/CP949 → UTF-8 자동 변환
- Buffer polyfill 추가

### 2. 비밀번호 관리 ✅
**문제**: 비밀번호 변경 후 로그인 불가

**해결**:
- localStorage에 변경된 비밀번호 저장
- 로그인 시 localStorage 우선 확인
- 없으면 초기 비밀번호 사용

---

## 🗄️ 데이터 구조 설계 (마이그레이션 준비)

### 비밀번호 데이터
```json
{
  "passwords": {
    "1001001": {
      "userId": "1001001",
      "password": "encrypted_password",
      "changedAt": "2026-02-11T10:30:00Z",
      "changeHistory": [
        {
          "from": "y1001001",
          "to": "newPassword",
          "timestamp": "2026-02-11T10:30:00Z"
        }
      ]
    }
  }
}
```

### 온보딩 프로그램 데이터
```json
{
  "userId": "1001001",
  "programId": "program_1",
  "imageData": "base64_string",
  "uploadedAt": "2026-02-11T10:30:00Z"
}
```

---

## 🚀 향후 마이그레이션 계획

### 1단계: 백엔드 API 추가
```
React 프론트엔드
    ↓ REST API
Node.js / FastAPI 백엔드
    ↓
PostgreSQL / MongoDB
```

### 2단계: GraphRAG 연동
```
설문조사 응답
    ↓
온톨로지 구축
    ↓
Neo4j 그래프 데이터베이스
    ↓
GraphRAG (LangChain)
```

### 코드 변경 (최소화)
**현재**:
```javascript
localStorage.setItem('data', JSON.stringify(data))
```

**나중**:
```javascript
await fetch('/api/data', {
  method: 'POST',
  body: JSON.stringify(data)
})
```

---

## 📊 개발 진행률

| 기능 | 상태 | 진행률 |
|-----|------|--------|
| 프로젝트 초기 설정 | ✅ 완료 | 100% |
| 로그인 시스템 | ✅ 완료 | 100% |
| 메인 메뉴 | ✅ 완료 | 100% |
| 온보딩 프로그램 | ✅ 완료 | 100% |
| 비밀번호 변경 | ✅ 완료 | 100% |
| 공지사항 | 🔜 준비 중 | 0% |
| 설문조사 | 🔜 준비 중 | 0% |
| 백엔드 API | 🔜 계획 중 | 0% |
| Neo4j + GraphRAG | 🔮 미래 | 0% |

---

## 🧪 테스트 계정

### 신입공채(A)
- 사번: `1001001`
- 초기 비밀번호: `y1001001`
- 온보딩 기간: 3개월 (1차~3차 설문)

### 경력공채(B)
- 사번: `1001013`
- 초기 비밀번호: `y1001013`
- 온보딩 기간: 1개월 (1차 설문만)

---

## 🎓 배운 점

1. **React 컴포넌트 설계**: 재사용 가능한 구조
2. **상태 관리**: useState, useEffect 활용
3. **CSV 처리**: 한글 인코딩 이슈 해결
4. **프로토타입 → 프로덕션**: 확장 가능한 구조 설계
5. **localStorage 활용**: 간단한 데이터 저장

---

## 🔜 다음 단계

1. **설문조사 페이지 개발**
   - 1차, 2차, 3차 설문 구분
   - 응답 데이터 구조화 (GraphRAG 준비)
   - 질문 타입: 객관식, 척도, 주관식

2. **공지사항 페이지 개발**
   - 게시글 목록/상세
   - PDF 파일 보기

3. **관리자 페이지 개발**
   - CSV 업로드
   - 진행 상황 대시보드

4. **백엔드 API 개발**
   - Node.js + Express 또는 Python + FastAPI
   - PostgreSQL 연동

5. **Neo4j + GraphRAG 연동**
   - 설문조사 데이터 → 온톨로지
   - 그래프 기반 인사이트 생성

---

## 📝 메모

- 모든 데이터 구조는 JSON 형식으로 설계하여 API 마이그레이션 용이
- 프론트엔드 코드는 최소한의 수정으로 백엔드 연동 가능
- localStorage는 프로토타입 용도, 실제 배포 시 서버 DB 사용 필수
- 한글 인코딩은 iconv-lite로 해결 (EUC-KR/CP949 지원)

---

## 🙏 참고 자료

- [React 공식 문서](https://react.dev)
- [Papa Parse](https://www.papaparse.com/)
- [iconv-lite](https://github.com/ashtuchkin/iconv-lite)
- [Neo4j 공식 문서](https://neo4j.com/docs/)
- [LangChain GraphRAG](https://python.langchain.com/docs/use_cases/graph/)

---

**작성자**: Claude Sonnet 4.5
**작성일**: 2026-02-11
**프로젝트**: 신규입사자 온보딩 시스템
