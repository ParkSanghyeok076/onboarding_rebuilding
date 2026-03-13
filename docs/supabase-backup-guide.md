# Supabase DB 백업 가이드

> 프로젝트: 신규입사자 온보딩 시스템
> Supabase Project Ref: `zpilphcmnvylekzbzuam`
> 권장 주기: 월 1회 또는 분기 1회

---

## 사전 준비: DB 연결 정보 확인

1. [Supabase 대시보드](https://supabase.com/dashboard) → Project Settings → Database
2. **Connection string** (URI 형식) 복사
3. 형식: `postgresql://postgres.zpilphcmnvylekzbzuam:[DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`

> DB 비밀번호는 프로젝트 생성 시 설정한 값 (잊어버렸으면 대시보드에서 Reset 가능)

---

## 방법 1: Supabase CLI (추천)

### 설치 확인
```bash
npx supabase --version
```

### 전체 백업 (스키마 + 데이터)
```bash
npx supabase db dump \
  --db-url "postgresql://postgres.zpilphcmnvylekzbzuam:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  -f backup_2026-03-13.sql
```

### 스키마만 (구조)
```bash
npx supabase db dump \
  --db-url "postgresql://postgres.zpilphcmnvylekzbzuam:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  --schema-only \
  -f schema_2026-03-13.sql
```

### 데이터만
```bash
npx supabase db dump \
  --db-url "postgresql://postgres.zpilphcmnvylekzbzuam:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  --data-only \
  -f data_2026-03-13.sql
```

---

## 방법 2: pg_dump 직접 사용

PostgreSQL 클라이언트가 설치되어 있는 경우 사용 가능.

```bash
pg_dump "postgresql://postgres.zpilphcmnvylekzbzuam:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  --no-owner \
  --no-acl \
  -f backup_$(date +%Y%m%d).sql
```

---

## Windows 자동화 배치 파일

`backup_supabase.bat` 파일을 원하는 위치에 생성:

```bat
@echo off
set YEAR=%date:~0,4%
set MONTH=%date:~5,2%
set DAY=%date:~8,2%
set DATE_STR=%YEAR%%MONTH%%DAY%

set BACKUP_DIR=C:\supabase-backups
set OUT=%BACKUP_DIR%\backup_%DATE_STR%.sql
set DB_URL=postgresql://postgres.zpilphcmnvylekzbzuam:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo 백업 시작: %DATE_STR%
npx supabase db dump --db-url "%DB_URL%" -f "%OUT%"
echo 백업 완료: %OUT%
pause
```

### Windows 작업 스케줄러 등록 방법
1. `작업 스케줄러` 실행 (시작 메뉴 검색)
2. `작업 만들기` → 이름: "Supabase 월간 백업"
3. 트리거: 매월 1일 오전 9시
4. 동작: 프로그램 시작 → `backup_supabase.bat` 파일 경로 지정
5. 완료

---

## 복원 방법 (데이터 유실 시)

```bash
# 복원 전 기존 테이블 초기화 필요할 수 있음
psql "postgresql://postgres.zpilphcmnvylekzbzuam:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  < backup_20260313.sql
```

> 주의: 복원은 기존 데이터를 덮어쓸 수 있으므로 신중하게 실행

---

## 백업 파일 보관 권장 구조

```
C:\supabase-backups\
├── backup_20260101.sql   # 1월 백업
├── backup_20260201.sql   # 2월 백업
├── backup_20260301.sql   # 3월 백업
└── ...
```

---

## 참고: Supabase 대시보드 수동 백업

- 대시보드 → Settings → Database → **"Download backup"** 버튼
- 무료(Free) 플랜은 자동 일간 백업 미지원, 유료(Pro) 플랜부터 자동 백업 지원
- 대시보드 버튼은 최신 스냅샷만 제공 (버전 관리 불가)
- **CLI 방식이 버전 관리 측면에서 훨씬 유리**

---

## 현재 DB 테이블 목록 (2026-03-13 기준)

| 테이블 | 설명 |
|--------|------|
| `users` | 신규입사자 + HR Admin 계정 |
| `announcements` | 공지사항 |
| `onboarding_submissions` | 온보딩 프로그램 제출 증빙 |
| `survey_responses` | 설문조사 응답 (1~3차) |
| `mentor_assignments` | 멘토/버디 배정 정보 |
| `absa_analyses` | ABSA 감성분석 결과 캐시 |
| `objective_analyses` | 객관식 시계열 분석 결과 캐시 |
