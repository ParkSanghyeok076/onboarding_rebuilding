# Session 2: DB연동 (공지사항 + 온보딩 이미지) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 공지사항을 정적 JS 파일에서 Supabase DB로, 온보딩 이미지 업로드를 브라우저 메모리(base64)에서 Supabase Storage로 마이그레이션하여 새로고침 후에도 데이터가 유지되도록 한다.

**Architecture:**
- 공지사항: `announcements` 테이블에서 fetch. DB 필드(snake_case)를 컴포넌트 필드(camelCase)로 매핑.
- 온보딩 이미지: `onboarding-images` Storage 버킷에 업로드 → `onboarding_submissions` 테이블에 경로 저장 → 페이지 로드 시 기존 제출 내역 조회 + signed URL 생성.

**Tech Stack:** React CRA, @supabase/supabase-js v2.97.0, Supabase PostgreSQL, Supabase Storage

---

## Field Mapping 참고

| DB 컬럼 | 컴포넌트 prop |
|---|---|
| `is_pinned` (boolean) | `isPinned` |
| `published_at` (timestamptz) | `date` (slice to YYYY-MM-DD) |
| `pdf_url` (text) | `pdfUrl` |
| `id` (uuid) | `id` |

---

### Task 1: 공지사항 샘플 데이터 Supabase에 INSERT

**Files:**
- Manual: Supabase SQL Editor (코드 변경 없음)

**Step 1: SQL Editor에서 아래 SQL 실행**

```sql
INSERT INTO announcements (title, content, author, is_pinned, published_at, pdf_url) VALUES
(
  '신규입사자 온보딩 프로그램 안내',
  '환영합니다! 신규입사자 여러분의 성공적인 온보딩을 위해 다음 사항을 안내드립니다.<br><br><strong>온보딩 프로그램 개요</strong><br>- 총 6가지 프로그램 진행<br>- 각 프로그램별 증빙 이미지 제출 필수<br>- 멘토와의 정기적인 미팅 권장<br><br><strong>설문조사 안내</strong><br>- 신입공채: 1차, 2차, 3차 (총 3회)<br>- 경력공채: 1차 (1회)<br>- 각 설문조사는 지정된 기간 내 완료 필수<br><br><strong>문의사항</strong><br>- 인사팀: hr@company.com<br>- 내선번호: 1234<br><br>여러분의 성공적인 출발을 응원합니다!',
  '인사팀',
  true,
  '2026-02-13T00:00:00+09:00',
  null
),
(
  '멘토링 프로그램 운영 가이드',
  '멘토링 프로그램에 대한 상세 안내입니다.<br><br><strong>멘토링 목적</strong><br>- 조직 문화 적응 지원<br>- 업무 관련 질문 및 답변<br>- 경력 개발 조언<br><br><strong>멘토링 진행 방법</strong><br>1. 주 1회 이상 정기 미팅<br>2. 수시 질문 및 피드백<br>3. 월 1회 진행 상황 점검<br><br><strong>유의사항</strong><br>- 멘토와의 약속 시간 엄수<br>- 사전에 질문사항 정리<br>- 적극적인 참여 태도',
  '인재개발팀',
  true,
  '2026-02-10T00:00:00+09:00',
  null
),
(
  '사내 시스템 계정 발급 안내',
  '사내 주요 시스템 계정 발급 절차를 안내드립니다.<br><br><strong>발급 대상 시스템</strong><br>- 그룹웨어<br>- 메신저<br>- 업무 포털<br>- 프로젝트 관리 시스템<br><br><strong>계정 발급 절차</strong><br>1. 입사 첫날 IT 지원팀 방문<br>2. 신분증 지참<br>3. 계정 정보 수령<br>4. 초기 비밀번호 변경<br><br><strong>문의</strong><br>- IT 지원팀: it-support@company.com',
  'IT지원팀',
  false,
  '2026-02-08T00:00:00+09:00',
  null
),
(
  '근태 및 휴가 관리 시스템 사용법',
  '근태 및 휴가 관리 시스템 사용 방법을 안내드립니다.<br><br><strong>출퇴근 체크</strong><br>- 출근: 09:00까지 체크인<br>- 퇴근: 18:00 이후 체크아웃<br>- 모바일 앱 또는 사무실 단말기 사용<br><br><strong>휴가 신청</strong><br>1. 그룹웨어 접속<br>2. 전자결재 → 휴가신청서 작성<br>3. 팀장 승인 후 사용<br><br><strong>주의사항</strong><br>- 연차는 입사 후 1년 뒤 발생<br>- 반차/반반차 사용 가능<br>- 긴급 휴가는 전화 후 사후 신청',
  '인사팀',
  false,
  '2026-02-05T00:00:00+09:00',
  null
),
(
  '사내 복지 제도 안내',
  '회사의 주요 복지 제도를 소개합니다.<br><br><strong>식사 지원</strong><br>- 중식: 구내식당 무료 제공<br>- 석식: 야근 시 식대 지원<br><br><strong>교육 지원</strong><br>- 직무 관련 교육비 지원<br>- 외국어 학습비 지원<br>- 자격증 취득 시 축하금<br><br><strong>건강 관리</strong><br>- 연 1회 종합 건강검진<br>- 사내 헬스장 무료 이용<br>- 심리 상담 지원<br><br><strong>기타 복지</strong><br>- 경조사 지원금<br>- 우수 사원 포상<br>- 리프레시 휴가<br><br>자세한 내용은 인사팀으로 문의해주세요.',
  '인사팀',
  false,
  '2026-02-01T00:00:00+09:00',
  null
);
```

**Step 2: 데이터 확인**

```sql
SELECT id, title, is_pinned, published_at FROM announcements ORDER BY published_at DESC;
```

Expected: 5행 반환, 상단 고정 2개 (is_pinned = true)

---

### Task 2: Announcements.js — 정적 import → Supabase DB 연동

**Files:**
- Modify: `src/pages/Announcements.js`
- No change: `src/components/AnnouncementCard.js` (필드 매핑은 fetch에서 처리)

**Step 1: Announcements.js 전체 교체**

```javascript
import React, { useState, useEffect } from 'react';
import './Pages.css';
import AnnouncementCard from '../components/AnnouncementCard';
import { supabase } from '../lib/supabase';

function Announcements({ onBack }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) {
        console.error('공지사항 로드 실패:', error);
      } else {
        const mapped = data.map(a => ({
          ...a,
          isPinned: a.is_pinned,
          date: a.published_at ? a.published_at.slice(0, 10) : '',
          pdfUrl: a.pdf_url,
        }));
        setAnnouncements(mapped);
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <div className="announcements-container">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 목록 뷰
  if (!selectedAnnouncement) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">
          ← 메뉴로 돌아가기
        </button>

        <div className="announcements-container">
          <h1 className="page-title">📢 공지사항</h1>

          <div className="announcements-grid">
            {announcements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onClick={() => setSelectedAnnouncement(announcement)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 상세 뷰
  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">
        ← 메뉴로 돌아가기
      </button>

      <div className="announcements-container">
        <button
          onClick={() => setSelectedAnnouncement(null)}
          className="detail-back-button"
        >
          ← 목록으로 돌아가기
        </button>

        <div className="announcement-detail">
          <div className="announcement-detail-header">
            {selectedAnnouncement.isPinned && (
              <span className="detail-pin-badge">📌 고정 공지</span>
            )}
            <h1 className="announcement-detail-title">
              {selectedAnnouncement.title}
            </h1>
            <div className="announcement-detail-meta">
              <span className="detail-author">{selectedAnnouncement.author}</span>
              <span className="detail-date">{selectedAnnouncement.date}</span>
            </div>
          </div>

          <div
            className="announcement-detail-content"
            dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
          />

          {selectedAnnouncement.pdfUrl && (
            <a
              href={selectedAnnouncement.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-link"
            >
              📎 첨부 파일 열기
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default Announcements;
```

**Step 2: 브라우저에서 공지사항 페이지 열어 5개 공지 표시 확인**

- 고정 공지 2개가 상단에 표시되는지 확인
- 공지 클릭 시 상세 뷰 진입 확인

**Step 3: Commit**

```bash
git add src/pages/Announcements.js
git commit -m "feat: 공지사항 Supabase DB 연동"
```

---

### Task 3: Supabase Storage 정책 설정 (onboarding-images)

**Files:**
- Manual: Supabase SQL Editor (코드 변경 없음)

> 버킷은 Session 1에서 이미 생성됨 (onboarding-images, Public: false)

**Step 1: Storage RLS 정책 SQL 실행**

```sql
-- 사용자: 자신의 폴더에 업로드
CREATE POLICY "users upload own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'onboarding-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자: 자신의 이미지 조회
CREATE POLICY "users read own images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'onboarding-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 사용자: 자신의 이미지 덮어쓰기 (재업로드)
CREATE POLICY "users update own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'onboarding-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- HR Admin: 모든 이미지 전체 접근
CREATE POLICY "admin all images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'onboarding-images'
  AND is_hr_admin()
);
```

**Step 2: 정책 적용 확인**

Supabase Dashboard → Storage → onboarding-images → Policies 탭에서 4개 정책 확인

---

### Task 4: ProgramCard.js — Supabase Storage 업로드로 교체

**Files:**
- Modify: `src/components/ProgramCard.js`

> `userId` prop이 추가됨 (Task 5에서 OnboardingProgram.js가 전달)

이미지 업로드 흐름:
1. 파일 선택 → Storage에 `{userId}/{programId}` 경로로 업로드 (upsert)
2. `onboarding_submissions` 테이블에 upsert (image_url = Storage 경로)
3. signed URL 생성 → 화면에 표시

**Step 1: ProgramCard.js 전체 교체**

```javascript
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

function ProgramCard({ program, userId, existingImageUrl, onImageUpload }) {
  const [image, setImage] = useState(existingImageUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const storagePath = `${userId}/${program.id}`;

      // 1. Storage 업로드 (upsert: true = 덮어쓰기)
      const { error: uploadError } = await supabase.storage
        .from('onboarding-images')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. DB에 제출 내역 기록
      const { error: dbError } = await supabase
        .from('onboarding_submissions')
        .upsert(
          { user_id: userId, program_id: program.id, image_url: storagePath, status: 'pending' },
          { onConflict: 'user_id,program_id' }
        );

      if (dbError) throw dbError;

      // 3. Signed URL 생성 (1시간 유효)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('onboarding-images')
        .createSignedUrl(storagePath, 3600);

      if (urlError) throw urlError;

      setImage(urlData.signedUrl);
      onImageUpload(program.id, storagePath);
    } catch (err) {
      console.error('이미지 업로드 실패:', err);
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="program-card"
      onClick={() => !uploading && document.getElementById(`file-${program.id}`).click()}
    >
      <input
        type="file"
        id={`file-${program.id}`}
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {uploading ? (
        <div className="upload-placeholder">
          <p>업로드 중...</p>
        </div>
      ) : image ? (
        <div className="image-preview">
          <img src={image} alt={program.title} />
        </div>
      ) : (
        <div className="upload-placeholder">
          <div className="upload-icon">📷</div>
          <h3>{program.title}</h3>
          <p>{program.description}</p>
        </div>
      )}
    </div>
  );
}

export default ProgramCard;
```

**Step 2: Commit (Task 5와 함께 최종 커밋)**

---

### Task 5: OnboardingProgram.js — 기존 제출 내역 로드 + 버그 수정

**Files:**
- Modify: `src/pages/OnboardingProgram.js`

수정 내용:
1. `user.type === 'A'` → `user.employee_type === '신입'` 버그 수정
2. 마운트 시 `onboarding_submissions` 테이블에서 기존 제출 내역 로드
3. 각 제출에 대해 signed URL 생성
4. `ProgramCard`에 `userId`와 `existingImageUrl` prop 전달

**Step 1: OnboardingProgram.js 전체 교체**

```javascript
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProgramCard from '../components/ProgramCard';
import { programs } from '../data/programs';
import { supabase } from '../lib/supabase';
import '../App.css';

function OnboardingProgram({ user, onBack }) {
  const [submissions, setSubmissions] = useState({}); // { programId: signedUrl }
  const [loading, setLoading] = useState(true);

  // 기간 계산 (버그 수정: user.type → user.employee_type)
  const getPeriod = () => {
    if (user.employee_type === '신입') {
      return `${user.period_1_start} ~ ${user.period_3_end}`;
    } else {
      return `${user.period_1_start} ~ ${user.period_1_end}`;
    }
  };

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
    // ProgramCard가 이미 signed URL을 state로 관리하므로
    // 여기서는 진행률 계산용으로만 submissions 업데이트
    setSubmissions(prev => ({ ...prev, [programId]: storagePath }));
  };

  const progress = Object.keys(submissions).length;

  if (loading) {
    return (
      <div className="page-container">
        <button onClick={onBack} className="back-button">← 메뉴로 돌아가기</button>
        <div className="App">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-button">
        ← 메뉴로 돌아가기
      </button>

      <div className="App">
        <Header
          period={getPeriod()}
          progress={progress}
          total={programs.length}
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
```

**Step 2: 브라우저에서 온보딩 페이지 열어 동작 확인**

1. 이미지 업로드 클릭 → 파일 선택 → "업로드 중..." 표시 → 이미지 렌더링 확인
2. 페이지 새로고침 → 업로드한 이미지가 그대로 표시되는지 확인
3. 다른 이미지로 재업로드 → 덮어쓰기 동작 확인

**Step 3: Commit**

```bash
git add src/components/ProgramCard.js src/pages/OnboardingProgram.js
git commit -m "feat: 온보딩 이미지 Supabase Storage 연동 + 제출 내역 영속성 확보"
```

---

### Task 6: 최종 검증 + Push

**Step 1: 전체 흐름 테스트**

| 테스트 항목 | 기대 결과 |
|---|---|
| 공지사항 페이지 진입 | 5개 공지 로드, 고정 2개 상단 |
| 공지 클릭 | 상세 뷰 진입 |
| 온보딩 프로그램 진입 | 기존 제출 이미지 표시 (없으면 placeholder) |
| 이미지 업로드 | "업로드 중..." → 이미지 렌더링 |
| 페이지 새로고침 | 업로드 이미지 유지 |
| 신입 사원 로그인 | 기간이 period_1_start ~ period_3_end |
| 경력 사원 로그인 | 기간이 period_1_start ~ period_1_end |

**Step 2: Git push**

```bash
git push origin main
```

---

## 세션 2 완료 후 다음 단계

- **세션 3**: 설문조사 페이지 구현 (PDF 문항 공유 필요)
- **세션 4**: Edge Functions (ABSA + 이메일 초안 생성)
- **세션 5**: HR Admin 화면 + Vercel 배포
