-- announcements 테이블에 pin_order 컬럼 추가
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS pin_order INT DEFAULT NULL;

-- 기존 고정 공지에 초기 순서 부여 (published_at 기준 최신순)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY published_at DESC) AS rn
  FROM announcements
  WHERE is_pinned = true
)
UPDATE announcements
SET pin_order = ranked.rn
FROM ranked
WHERE announcements.id = ranked.id;
