import React from 'react';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function getDayKo(date) {
  return DAYS_KO[date.getDay()];
}

export function fmtLong(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}/${d}`;
}

export function fmtShort(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y.slice(2)}.${m}/${d}`;
}

export function fmtDeadline(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `~${m}/${d}(${getDayKo(date)})`;
}

export function buildNewHireEmail(employees, today) {
  const deadline = addDays(today, 5);
  const deadlineStr = fmtDeadline(deadline);
  const deadlineMD = `${String(deadline.getMonth()+1).padStart(2,'0')}/${String(deadline.getDate()).padStart(2,'0')}`;
  const subjectDeadline = `~${deadlineMD}`;

  const rows = employees.map((e, i) => `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${i+1}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${e.department}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${e.name}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${fmtLong(e.period_3_end)}</td>
    </tr>`).join('');

  const periodStart = fmtLong(employees[0].period_1_start);
  const periodEnd   = fmtLong(employees[0].period_3_end);

  const fundRows = employees[0] ? `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">1차</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${fmtShort(employees[0].period_1_start)} ~ ${fmtShort(employees[0].period_1_end)}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">50천원</td>
    </tr>
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">2차</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${fmtShort(employees[0].period_2_start)} ~ ${fmtShort(employees[0].period_2_end)}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">50천원</td>
    </tr>
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">3차</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${fmtShort(employees[0].period_3_start)} ~ ${fmtShort(employees[0].period_3_end)}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">50천원</td>
    </tr>` : '';

  return `<div style="font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:14px;line-height:1.8;color:#000;max-width:720px;padding:32px;">
  <div style="font-weight:bold;font-size:15px;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:24px;">
    제목: [인사기획팀] 신입사원 OJT/멘토링 진행 및 계획서 상신 요청 (${subjectDeadline})
  </div>
  <p>안녕하십니까, 인사기획팀 박상혁 선임입니다.<br>
  신입사원 OJT/멘토링 진행 및 계획서 상신을 아래와 같이 요청드리오니 확인 부탁드립니다.</p>
  <div style="text-align:center;font-weight:bold;margin:20px 0;letter-spacing:4px;">-&nbsp;&nbsp;&nbsp;&nbsp;아&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;래&nbsp;&nbsp;&nbsp;&nbsp;-</div>
  <div style="font-weight:bold;margin:16px 0 6px;">1. 교육개요</div>
  <div style="margin-left:16px;">
    <div>1) 대상자</div>
    <div style="margin-left:16px;">
      <table style="border-collapse:collapse;margin:6px 0 10px;">
        <thead><tr>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">순번</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">소속</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">성명</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">종료일</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div>2) 시행기간 : <span style="color:#1155CC;font-weight:bold;">${periodStart} ~ ${periodEnd} (12주)</span></div>
    <div>3) 시행방법 : 쳊부2 참조</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">2. 요청사항 : <span style="color:#CC0000;font-weight:bold;">${deadlineStr}, 17:00</span></div>
  <div style="margin-left:16px;">
    <div>1) 멘토선정 (주체 : 팀장)</div>
    <div>2) OJT/멘토링 계획서 상신(작성자 : 멘토)</div>
    <div style="margin-left:16px;font-weight:bold;">- 전자결재 → 결재양식함 → 교육 → OJT/멘토링 계획서(3개월 모두 작성)</div>
    <div style="margin-left:16px;font-weight:bold;">- 결재선 : 팀장 전결</div>
    <div style="margin-left:16px;font-weight:bold;">- 적요 : [유라코퍼레이션 00본부] OJT/멘토링 계획서 - (${employees.map(e=>e.name).join(', ')})</div>
    <div>3) OJT노트 작성(작성자 : 신입사원)</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">3. OJT계획 수립 시 필수 포함내용</div>
  <div style="margin-left:16px;">
    <div>1) 직무 관련 기능/기술/지식</div>
    <div>2) 직무 관련 프로세스 및 세부요령</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">4. 기타사항</div>
  <div style="margin-left:16px;">
    <div>1) 멘토링 지원금</div>
    <div style="margin-left:16px;">
      <table style="border-collapse:collapse;margin:6px 0 10px;">
        <thead><tr>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">차수</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">사용일자</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">금액</th>
        </tr></thead>
        <tbody>${fundRows}</tbody>
      </table>
      <div style="font-weight:bold;">※ 지원목적 : 멘토-신입사원 간 유대관계 형성을 통한 신입사원 조직적응 지원</div>
      <div style="color:#CC0000;font-weight:bold;">※ 기한 내 미사용 금액 이월 불가</div>
    </div>
    <div>2) 휴일,연차사용일은 교육 및 OJT노트 작성 불필요</div>
    <div>3) OJT노트 수령 : 신규입사자 회사소개 교육 진행 후 배포</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">5. 문의 : 인사기획팀 박상혁 선임(1456)</div>
  <div style="font-weight:bold;margin:16px 0 6px;">6. 쳊부파일</div>
</div>`;
}

export function buildExpHireEmail(employees, today) {
  const deadline = addDays(today, 5);
  const deadlineStr = fmtDeadline(deadline);
  const deadlineMD = `${String(deadline.getMonth()+1).padStart(2,'0')}/${String(deadline.getDate()).padStart(2,'0')}`;
  const subjectDeadline = `~${deadlineMD}`;

  const rows = employees.map((e, i) => `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${i+1}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${e.department}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${e.name}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${fmtLong(e.period_1_end)}</td>
    </tr>`).join('');

  const periodStart = fmtLong(employees[0].period_1_start);
  const periodEnd   = fmtLong(employees[0].period_1_end);

  const emp = employees[0];
  const fundRow = emp ? `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">${fmtShort(emp.period_1_start)} ~ ${fmtShort(emp.period_1_end)}</td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">50천원</td>
    </tr>` : '';

  const nameList = employees.map(e => e.name).join(', ');

  return `<div style="font-family:'맑은 고딕','Malgun Gothic',sans-serif;font-size:14px;line-height:1.8;color:#000;max-width:720px;padding:32px;">
  <div style="font-weight:bold;font-size:15px;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:24px;">
    제목: [인사기획팀] 경력직 신규입사자 온보딩 프로그램 안내 및 OJT계획서 상신 요청 (${subjectDeadline})
  </div>
  <p>안녕하십니까, 인사기획팀 박상혁 선임입니다.<br>
  경력직 신규입사자 온보딩 프로그램/OJT 진행을 아래와 같이 요청드리오니 확인 부탁드립니다.</p>
  <div style="text-align:center;font-weight:bold;margin:20px 0;letter-spacing:4px;">-&nbsp;&nbsp;&nbsp;&nbsp;아&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;래&nbsp;&nbsp;&nbsp;&nbsp;-</div>
  <div style="font-weight:bold;margin:16px 0 6px;">1. 교육개요</div>
  <div style="margin-left:16px;">
    <div>1) 대상자</div>
    <div style="margin-left:16px;">
      <table style="border-collapse:collapse;margin:6px 0 10px;">
        <thead><tr>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">순번</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">소속</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">성명</th>
          <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">종료일</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div>2) 시행기간 : <span style="color:#1155CC;font-weight:bold;">${periodStart} ~ ${periodEnd} (4주)</span></div>
    <div>3) 시행방법 : 쳊부4 참조</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">2. 요청사항 : <span style="color:#CC0000;font-weight:bold;">${deadlineStr}, 17:00</span></div>
  <div style="margin-left:16px;">
    <div><span style="color:#CC0000;font-weight:bold;">1) 경력직 OJT계획서 작성 및 상신 [쳊부3 참고]</span></div>
    <div style="margin-left:16px;font-weight:bold;">- 전자결재 → 결재양식함 → 교육 → OJT/멘토링 계획서(1개월만 작성)</div>
    <div style="margin-left:16px;font-weight:bold;">- 결재선 : 팀장 전결 / 상신인 : OJT 담당인원(기존 재직자)</div>
    <div style="margin-left:16px;font-weight:bold;">- 적요 : [유라코퍼레이션 00본부] OJT/멘토링 계획서 - (${nameList})</div>
    <div>2) 온보딩 프로그램 : 신규입사자에게 개별 안내 예정</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">3. OJT계획 수립 시 필수 포함내용</div>
  <div style="margin-left:16px;">
    <div>1) 직무 관련 기능/기술/지식</div>
    <div>2) 직무 관련 프로세스 및 세부요령</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">4. 온보딩 프로그램 지원금</div>
  <div style="margin-left:16px;">
    <table style="border-collapse:collapse;margin:6px 0 10px;">
      <thead><tr>
        <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">사용일자</th>
        <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">금액</th>
      </tr></thead>
      <tbody>${fundRow}</tbody>
    </table>
    <div style="font-weight:bold;">※ 지원목적 : 멘토-신입사원 간 유대관계 형성을 통한 신입사원 조직적응 지원</div>
    <div style="color:#CC0000;font-weight:bold;">※ 기한 내 미사용 금액 이월 불가</div>
  </div>
  <div style="font-weight:bold;margin:16px 0 6px;">5. 문의 : 인사기획팀 박상혁 선임(1456)</div>
  <div style="font-weight:bold;margin:16px 0 6px;">6. 쳊부파일</div>
</div>`;
}

export default function AdminMentorBuddy() {
  return <div>멘토/버디 관리 (구현 예정)</div>;
}