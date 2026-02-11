# Git 워크플로우 가이드

## 💡 다른 PC에서 개발 연속하기

이 문서는 여러 컴퓨터에서 GitHub를 중심으로 개발을 연속해서 진행하는 방법을 설명합니다.

---

## ✅ 네! 완전히 가능합니다!

이제 **어떤 컴퓨터에서든** GitHub를 통해 연속 개발할 수 있습니다.

---

## 🔄 다른 PC에서 작업 시작하는 방법

### **1단계: 처음 시작 (새 PC)**
```bash
# 1. 프로젝트 복제
git clone https://github.com/ParkSanghyeok076/onboarding_rebuilding.git

# 2. 폴더 이동
cd onboarding_rebuilding

# 3. 의존성 설치 (중요!)
npm install

# 4. 개발 서버 실행
npm start
```

### **2단계: 작업 후 저장**
```bash
# 변경사항 추가
git add .

# 커밋
git commit -m "작업 내용 설명"

# GitHub에 업로드
git push
```

---

## 🔁 PC 간 작업 전환 흐름

### **시나리오: 회사 PC → 집 PC → 회사 PC**

#### 📍 **회사 PC에서 작업**
```bash
# 1. 코드 수정
# 2. 저장
git add .
git commit -m "회사에서 로그인 기능 개선"
git push
```

#### 🏠 **집 PC에서 계속 작업**
```bash
# 1. 최신 코드 받기
git pull

# 2. 코드 수정
# 3. 저장
git add .
git commit -m "집에서 설문조사 페이지 추가"
git push
```

#### 📍 **다시 회사 PC**
```bash
# 1. 최신 코드 받기 (집에서 한 작업 포함)
git pull

# 2. 계속 개발...
```

---

## ⚠️ 중요한 주의사항

### **1. 항상 작업 시작 전에 `git pull` 실행**
```bash
git pull  # 최신 코드 받기
```

❌ **안하면**: 충돌 발생 가능!

### **2. 작업 완료 후 `git push` 잊지 말기**
```bash
git push  # GitHub에 업로드
```

❌ **안하면**: 다른 PC에서 최신 코드 못 받음!

### **3. `node_modules` 폴더는 복사 안됨**
- GitHub에는 코드만 올라감
- 새 PC에서 반드시 `npm install` 실행 필요

---

## 📋 체크리스트

### ✅ **PC A에서 작업 종료 시**
- [ ] 변경사항 저장 (`git add .`)
- [ ] 커밋 (`git commit -m "..."`)
- [ ] 푸시 (`git push`)

### ✅ **PC B에서 작업 시작 시**
- [ ] 최신 코드 받기 (`git pull`)
- [ ] 의존성 확인 (`npm install` - 처음이면)
- [ ] 개발 서버 실행 (`npm start`)

---

## 🗂️ GitHub에 저장되는 것 vs 안되는 것

### ✅ **GitHub에 저장됨**
- 모든 소스 코드 (.js, .css 등)
- 설정 파일 (package.json)
- 문서 (WORK_LOG.md, README.md)
- CSV 데이터 (onboarding_test.csv)

### ❌ **GitHub에 저장 안됨** (.gitignore)
- `node_modules/` (의존성 폴더 - 너무 큼)
- `build/` (빌드 결과물)
- 환경 변수 파일 (.env)

→ 따라서 새 PC에서 `npm install` 필수!

---

## 🚀 실전 예시

### **월요일 - 회사 PC**
```bash
cd onboarding_rebuilding
git pull                    # 최신 코드 받기
npm start                   # 개발 시작
# ... 작업 ...
git add .
git commit -m "설문조사 1차 페이지 완성"
git push                    # 저장!
```

### **월요일 저녁 - 집 PC**
```bash
git clone https://github.com/ParkSanghyeok076/onboarding_rebuilding.git  # 처음이면
cd onboarding_rebuilding
git pull                    # 회사에서 한 작업 받기
npm install                 # 처음이면
npm start
# ... 추가 작업 ...
git add .
git commit -m "설문조사 2차 페이지 추가"
git push
```

### **화요일 - 회사 PC**
```bash
cd onboarding_rebuilding
git pull                    # 집에서 한 작업 받기
npm start
# ... 계속 작업 ...
```

---

## 🔮 추가 팁

### **1. 여러 사람과 협업 시**
```bash
# 브랜치 생성
git checkout -b feature/survey

# 작업 후
git push -u origin feature/survey

# Pull Request 생성 (GitHub 웹에서)
```

### **2. 작업 내용 확인**
```bash
git status          # 변경된 파일 확인
git log             # 커밋 히스토리 확인
git diff            # 변경 내용 상세 확인
```

### **3. 실수로 잘못 수정했을 때**
```bash
git restore .       # 모든 변경사항 취소 (주의!)
git restore 파일명   # 특정 파일만 취소
```

---

## 🎯 자주 사용하는 Git 명령어

### **기본 워크플로우**
```bash
git pull            # 최신 코드 받기
git status          # 변경사항 확인
git add .           # 모든 변경사항 스테이징
git commit -m "메시지"  # 커밋
git push            # GitHub에 업로드
```

### **브랜치 관리**
```bash
git branch                      # 브랜치 목록
git branch feature/new-feature  # 새 브랜치 생성
git checkout feature/new-feature  # 브랜치 전환
git checkout -b feature/quick   # 생성 + 전환 (단축)
git merge feature/new-feature   # 브랜치 병합
git branch -d feature/old       # 브랜치 삭제
```

### **히스토리 확인**
```bash
git log                 # 커밋 히스토리
git log --oneline       # 한 줄로 보기
git log --graph         # 그래프로 보기
git show 커밋ID         # 특정 커밋 상세 보기
```

### **변경사항 되돌리기**
```bash
git restore 파일명              # 파일 변경사항 취소
git restore .                  # 모든 변경사항 취소
git reset --hard HEAD          # 마지막 커밋으로 되돌리기 (주의!)
git reset --hard 커밋ID        # 특정 커밋으로 되돌리기 (주의!)
```

---

## 🚨 문제 해결

### **1. Push가 거부될 때**
```bash
# 에러: Updates were rejected because the remote contains work...
# 해결: 최신 코드를 먼저 받기
git pull
git push
```

### **2. Pull 시 충돌(Conflict) 발생**
```bash
# 1. 충돌 파일 확인
git status

# 2. 충돌 파일 수동 수정 (<<<<<<, ======, >>>>>> 표시 확인)
# 3. 수정 후
git add .
git commit -m "충돌 해결"
git push
```

### **3. 커밋 메시지 수정하고 싶을 때**
```bash
# 마지막 커밋 메시지 수정 (아직 push 안했을 때만)
git commit --amend -m "새로운 메시지"

# 이미 push했다면 새 커밋 만들기
git commit -m "이전 커밋 내용 수정"
```

### **4. 실수로 push한 파일 제거**
```bash
# 파일 삭제 + Git에서 추적 중지
git rm --cached 파일명
git commit -m "불필요한 파일 제거"
git push
```

---

## 📚 .gitignore 파일

### **현재 프로젝트 .gitignore**
```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# production
/build

# misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### **추가로 제외할 파일이 있다면**
```bash
# .gitignore 파일에 추가
echo "제외할파일.txt" >> .gitignore
git add .gitignore
git commit -m "gitignore 업데이트"
git push
```

---

## 🔐 Git 인증 관리

### **Windows에서 자격 증명 저장**
```bash
# 한 번만 설정하면 계속 사용됨
git config --global credential.helper wincred
```

### **Personal Access Token 사용**
GitHub에서 비밀번호 대신 토큰 사용:
1. https://github.com/settings/tokens
2. "Generate new token (classic)"
3. 권한 선택: `repo` 전체
4. 생성된 토큰 복사
5. push 시 비밀번호 대신 토큰 입력

---

## ✅ 핵심 요약

### **매일 작업 루틴**

**시작할 때:**
```bash
git pull
npm start
```

**끝날 때:**
```bash
git add .
git commit -m "오늘 작업 내용"
git push
```

**이것만 기억하세요!**
1. 시작 전: `git pull` ✨
2. 작업 후: `git add . → commit → push` ✨
3. 새 PC: `git clone → npm install` ✨

---

## 📞 도움이 필요할 때

- **Git 공식 문서**: https://git-scm.com/doc
- **GitHub 가이드**: https://guides.github.com/
- **Interactive Git**: https://learngitbranching.js.org/

---

**작성일**: 2026-02-11
**프로젝트**: 신규입사자 온보딩 시스템
**레포지토리**: https://github.com/ParkSanghyeok076/onboarding_rebuilding
