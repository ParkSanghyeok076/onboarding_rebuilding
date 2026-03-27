-- 멘토 등록 요청 테이블
CREATE TABLE IF NOT EXISTS mentor_requests (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  mentee_id           uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  mentee_name         text,
  mentee_department   text,
  mentor_name         text NOT NULL,
  mentor_employee_id  text NOT NULL,
  status              text DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- RLS 활성화
ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;

-- 멘티 본인이 요청 삽입
CREATE POLICY "mentor_req_self_insert"
  ON mentor_requests FOR INSERT
  WITH CHECK (auth.uid() = mentee_id);

-- 멘티 본인이 자기 요청 조회
CREATE POLICY "mentor_req_self_select"
  ON mentor_requests FOR SELECT
  USING (auth.uid() = mentee_id);

-- 멘티 본인이 pending 상태일 때 수정 (수정/취소용)
CREATE POLICY "mentor_req_self_update"
  ON mentor_requests FOR UPDATE
  USING (auth.uid() = mentee_id AND status = 'pending');

-- 멘티 본인이 pending 상태일 때 삭제 (취소용)
CREATE POLICY "mentor_req_self_delete"
  ON mentor_requests FOR DELETE
  USING (auth.uid() = mentee_id AND status = 'pending');

-- HR Admin 전체 조회
CREATE POLICY "mentor_req_admin_select"
  ON mentor_requests FOR SELECT
  USING (is_hr_admin());

-- HR Admin 상태 변경 (승인/거절)
CREATE POLICY "mentor_req_admin_update"
  ON mentor_requests FOR UPDATE
  USING (is_hr_admin());
