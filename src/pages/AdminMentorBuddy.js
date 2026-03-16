import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import './AdminMentorBuddy.css';
import './Pages.css';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function getDayKo(date) {
  return DAYS_KO[date.getDay()];
}

export function fmtLong(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}/${d}`;
}

export function fmtShort(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y.slice(2)}.${m}/${d}`;
}

export function fmtDeadline(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `~${m}/${d}(${getDayKo(date)})`;
}

export function buildNewHireEmail(employees, today) {
  if (!employees || employees.length === 0) return '';
  const deadline = addDays(today, 5);
  const deadlineStr = fmtDeadline(deadline);

  const rows = employees.map((e, i) => `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${i+1}</span></p>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${escapeHtml(e.department)}</span></p>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${escapeHtml(e.name)}</span></p>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${fmtLong(e.period_3_end)}</span></p>
      </td>
    </tr>`).join('');

  const periodStart = fmtLong(employees[0].period_1_start);
  const periodEnd   = fmtLong(employees[0].period_3_end);

  const fundRows = employees[0] ? `
    <tr>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">1차</span></p>
      </td>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${fmtShort(employees[0].period_1_start)} ~ ${fmtShort(employees[0].period_1_end)}</span></p>
      </td>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">50천원</span></p>
      </td>
    </tr>
    <tr>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">2차</span></p>
      </td>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${fmtShort(employees[0].period_2_start)} ~ ${fmtShort(employees[0].period_2_end)}</span></p>
      </td>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">50천원</span></p>
      </td>
    </tr>
    <tr>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">3차</span></p>
      </td>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">${fmtShort(employees[0].period_3_start)} ~ ${fmtShort(employees[0].period_3_end)}</span></p>
      </td>
      <td style="border: 1px solid rgb(51, 51, 51); padding: 5px 14px; text-align: center;">
        <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">50천원</span></p>
      </td>
    </tr>` : '';

  return `<div style="font-size: 10pt; color: rgb(0, 0, 0); max-width: 720px; padding: 32px; font-family: 굴림체; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt;">안녕하십니까, 인사기획팀 박상혁 선임입니다.</span><br><span style="font-size: 10pt;">  신입사원 OJT/멘토링 진행 및 계획서 상신을 아래와 같이 요청드리오니 확인 부탁드립니다.</span></p>
<p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><br></p>
<p style="line-height: 1.5; text-align: center; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">-&nbsp; &nbsp; 아&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 래&nbsp; &nbsp; -</span></p>
<div style="margin: 16px 0px 6px; font-family: 굴림체; font-size: 10pt; line-height: 1.5;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">1. 교육개요</span></p></div>
<div style="margin-left: 16px; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">1) 대상자</span></p></div>
<div style="margin-left: 16px; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<table style="border-collapse:collapse;margin:6px 0 10px;">
  <thead><tr>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">순번</span></p>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">소속</span></p>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">성명</span></p>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">종료일</span></p>
    </th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">2) 시행기간 : <span style="color: rgb(17, 85, 204); font-weight: bold; font-size: 10pt; font-family: 굴림체;">${periodStart} ~ ${periodEnd} (12주)</span></span></p></div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">3) 시행방법 : 첨부2 참조</span></p></div>
</div>
<div style="font-weight: bold; margin: 16px 0px 6px; font-family: 굴림체; font-size: 10pt; line-height: 1.5;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">2. 요청사항 : <span style="color: rgb(204, 0, 0); font-weight: bold; font-size: 10pt; font-family: 굴림체;">${deadlineStr}, 17:00</span></span></p></div>
<div style="margin-left: 16px; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">1) 멘토선정 (주체 : 팀장)</span></p></div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">2) OJT/멘토링 계획서 상신(작성자 : 멘토)</span></p></div>
<div style="margin-left: 16px; font-weight: bold; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">- 전자결재 → 결재양식함 → 교육 → OJT/멘토링 계획서(3개월 모두 작성)</span></p></div>
<div style="margin-left: 16px; font-weight: bold; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">- 결재선 : 팀장 전결</span></p></div>
<div style="margin-left: 16px; font-weight: bold; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">- 적요 : [유라코퍼레이션 00본부] OJT/멘토링 계획서 - (${employees.map(e => escapeHtml(e.name)).join(', ')})</span></p></div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">3) OJT노트 작성(작성자 : 신입사원)</span></p></div>
</div>
<div style="margin: 16px 0px 6px; font-family: 굴림체; font-size: 10pt; line-height: 1.5;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">3. OJT계획 수립 시 필수 포함내용</span></p></div>
<div style="margin-left: 16px; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">1) 직무 관련 기능/기술/지식</span></p></div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">2) 직무 관련 프로세스 및 세부요령</span></p></div>
</div>
<div style="margin: 16px 0px 6px; font-family: 굴림체; font-size: 10pt; line-height: 1.5;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">4. 기타사항</span></p></div>
<div style="margin-left: 16px; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">1) 멘토링 지원금</span></p></div>
<div style="margin-left: 16px; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;">
<table style="border-collapse:collapse;margin:6px 0 10px;">
  <thead><tr>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">차수</span></p>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">사용일자</span></p>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <p style="line-height: 1.5; font-family: 굴림체; font-size: 12pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">금액</span></p>
    </th>
  </tr></thead>
  <tbody>${fundRows}</tbody>
</table>
<div style="font-weight: bold; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">※ 지원목적 : 멘토-신입사원 간 유대관계 형성을 통한 신입사원 조직적응 지원</span></p></div>
<div style="color: rgb(204, 0, 0); font-weight: bold; font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">※ 기한 내 미사용 금액 이월 불가</span></p></div>
</div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">2) 휴일,연차사용일은 교육 및 OJT노트 작성 불필요</span></p></div>
<div style="font-family: 굴림체; font-size: 10pt; line-height: 1.5; margin-top: 0px; margin-bottom: 0px;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">3) OJT노트 수령 : 신규입사자 회사소개 교육 진행 후 배포</span></p></div>
</div>
<p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;"> </span></p>
<div style="margin: 16px 0px 6px; font-family: 굴림체; font-size: 10pt; line-height: 1.5;"><p style="line-height: 1.5; font-family: 굴림체; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt; font-family: 굴림체;">5. 문의 : 인사기획팀 박상혁 선임(1456)</span></p></div>
<div style="margin: 16px 0px 6px; font-size: 10pt; line-height: 1.5;"><p style="line-height: 1.5; font-size: 10pt; margin-top: 0px; margin-bottom: 0px;"><span style="font-size: 10pt;">6. 첨부파일</span></p></div>
</div>`;
}

export function buildExpHireEmail(employees, today) {
  if (!employees || employees.length === 0) return '';
  const deadline = addDays(today, 5);
  const deadlineStr = fmtDeadline(deadline);

  const rows = employees.map((e, i) => `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <span style="font-size: 10pt;">${i+1}</span>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <span style="font-size: 10pt;">${escapeHtml(e.department)}</span>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <span style="font-size: 10pt;">${escapeHtml(e.name)}</span>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <span style="font-size: 10pt;">${fmtLong(e.period_1_end)}</span>
      </td>
    </tr>`).join('');

  const periodStart = fmtLong(employees[0].period_1_start);
  const periodEnd   = fmtLong(employees[0].period_1_end);

  const emp = employees[0];
  const fundRow = emp ? `
    <tr>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <span style="font-size: 10pt;">${fmtShort(emp.period_1_start)} ~ ${fmtShort(emp.period_1_end)}</span>
      </td>
      <td style="border:1px solid #333;padding:5px 14px;text-align:center;">
        <span style="font-size: 10pt;">50천원</span>
      </td>
    </tr>` : '';

  const nameList = employees.map(e => escapeHtml(e.name)).join(', ');

  return `<div style="font-size: 10pt; color: rgb(0, 0, 0); max-width: 720px; padding: 32px;"><span style="font-family: 굴림체, Gulim, sans-serif;">
  </span><p><span style="font-family: 굴림체; font-size: 10pt;">안녕하십니까, 인사기획팀 박상혁 선임입니다.</span></p><p><span style="font-size: 10pt;">  경력직 신규입사자 온보딩 프로그램/OJT 진행을 아래와 같이 요청드리오니 확인 부탁드립니다.</span></p><p><br></p><p style="text-align: center;"><span style="font-size: 10pt;">-&nbsp; &nbsp; 아&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; 래&nbsp; &nbsp; -</span></p>
<div style="margin: 16px 0px 6px;"><span style="font-size: 10pt;">1. 교육개요</span></div>
<div style="margin-left:16px;">
<div><span style="font-size: 10pt;">1) 대상자</span></div>
<div style="margin-left:16px;">
<table style="border-collapse:collapse;margin:6px 0 10px;">
  <thead><tr>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <span style="font-size: 10pt;">순번</span>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <span style="font-size: 10pt;">소속</span>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <span style="font-size: 10pt;">성명</span>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <span style="font-size: 10pt;">종료일</span>
    </th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<div><span style="font-size: 10pt;">2) 시행기간 : <span style="color: rgb(17, 85, 204); font-weight: bold; font-size: 10pt;">${periodStart} ~ ${periodEnd} (4주)</span></span></div>
<div><span style="font-size: 10pt;">3) 시행방법 : 첨부4 참조</span></div>
</div>
<div style="font-weight:bold;margin:16px 0 6px;"><span style="font-size: 10pt;">2. 요청사항 : <span style="color: rgb(204, 0, 0); font-weight: bold; font-size: 10pt;">${deadlineStr}, 17:00</span></span></div>
<div style="margin-left:16px;">
<div><span style="color: rgb(204, 0, 0); font-weight: bold; font-size: 10pt;">1) 경력직 OJT계획서 작성 및 상신 [첨부3 참고]</span></div>
<div style="margin-left:16px;font-weight:bold;"><span style="font-size: 10pt;">- 전자결재 → 결재양식함 → 교육 → OJT/멘토링 계획서(1개월만 작성)</span></div>
<div style="margin-left:16px;font-weight:bold;"><span style="font-size: 10pt;">- 결재선 : 팀장 전결 / 상신인 : OJT 담당인원(기존 재직자)</span></div>
<div style="margin-left:16px;font-weight:bold;"><span style="font-size: 10pt;">- 적요 : [유라코퍼레이션 00본부] OJT/멘토링 계획서 - (${nameList})</span></div>
<div><span style="font-size: 10pt;">2) 온보딩 프로그램 : 신규입사자에게 개별 안내 예정</span></div>
</div>
<div style="margin: 16px 0px 6px;"><span style="font-size: 10pt;">3. OJT계획 수립 시 필수 포함내용</span></div>
<div style="margin-left:16px;">
<div><span style="font-size: 10pt;">1) 직무 관련 기능/기술/지식</span></div>
<div><span style="font-size: 10pt;">2) 직무 관련 프로세스 및 세부요령</span></div>
</div>
<div style="margin: 16px 0px 6px;"><span style="font-size: 10pt;">4. 온보딩 프로그램 지원금</span></div>
<div style="margin-left:16px;">
<table style="border-collapse:collapse;margin:6px 0 10px;">
  <thead><tr>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <span style="font-size: 10pt;">사용일자</span>
    </th>
    <th style="border:1px solid #333;padding:5px 14px;background:#f5f5f5;">
      <span style="font-size: 10pt;">금액</span>
    </th>
  </tr></thead>
  <tbody>${fundRow}</tbody>
</table>
<div style="font-weight:bold;"><span style="font-size: 10pt;">※ 지원목적 : 버디-신규입사자 간 유대관계 형성을 통한 신입사원 조직적응 지원</span></div>
<div style="color:#CC0000;font-weight:bold;"><span style="font-size: 10pt;">※ 기한 내 미사용 금액 이월 불가</span></div>
</div>
<div style="margin: 16px 0px 6px;"><span style="font-size: 10pt;">5. 문의 : 인사기획팀 박상혁 선임(1456)</span></div>
<div style="margin: 16px 0px 6px;"><span style="font-size: 10pt;">6. 첨부파일</span></div>
</div>`;
}

export default function AdminMentorBuddy() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState({});

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignInput, setAssignInput] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [emailHtml, setEmailHtml] = useState(null);
  const [copied, setCopied] = useState(false);

  const [toast, setToast] = useState('');

  const toastTimerRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id,name,department,employee_type,mentor_name,period_1_start,period_1_end,period_2_start,period_2_end,period_3_start,period_3_end')
        .eq('role', 'employee');
      if (!error) setUsers(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  const showToast = (msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(''), 2600);
  };

  const allChecked = users.length > 0 && users.every(u => checked[u.id]);
  const toggleAll = () => {
    if (allChecked) setChecked({});
    else setChecked(Object.fromEntries(users.map(u => [u.id, true])));
  };

  const toggleOne = (id) =>
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const checkedUsers = users.filter(u => checked[u.id]);

  const handleBulkEmail = () => {
    if (checkedUsers.length === 0) return;
    const types = [...new Set(checkedUsers.map(u => u.employee_type))];
    if (types.length > 1) {
      showToast('신입/경력이 혼재되어 있습니다. 같은 유형만 선택해 주세요.');
      return;
    }
    const html = types[0] === '신입'
      ? buildNewHireEmail(checkedUsers, new Date())
      : buildExpHireEmail(checkedUsers, new Date());
    setEmailHtml(html);
    setCopied(false);
  };

  const handleRowEmail = (user) => {
    const html = user.employee_type === '신입'
      ? buildNewHireEmail([user], new Date())
      : buildExpHireEmail([user], new Date());
    setEmailHtml(html);
    setCopied(false);
  };

  const handleAssignSave = async () => {
    if (!assignInput.trim()) return;
    setAssignLoading(true);
    const { error } = await supabase
      .from('users')
      .update({ mentor_name: assignInput.trim() })
      .eq('id', assignTarget.id);
    if (!error) {
      setUsers(prev => prev.map(u =>
        u.id === assignTarget.id ? { ...u, mentor_name: assignInput.trim() } : u
      ));
      setAssignTarget(null);
      setAssignInput('');
    } else {
      showToast('저장 실패. 다시 시도해 주세요.');
    }
    setAssignLoading(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailHtml);
      setCopied(true);
    } catch {
      showToast('복사 실패. 직접 선택해 주세요.');
    }
  };

  return (
    <div className="mentor-page">
      <div className="mentor-page-header">
        <div className="mentor-page-title">🤝 멘토 관리</div>
        <button
          className="mentor-bulk-btn"
          disabled={checkedUsers.length === 0}
          onClick={handleBulkEmail}
        >
          일괄 메일생성{checkedUsers.length > 0 ? ` (${checkedUsers.length}명)` : ''}
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>불러오는 중...</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th>이름</th>
                <th>팀</th>
                <th>유형</th>
                <th>멘토/버디</th>
                <th>안내메일</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!checked[u.id]}
                      onChange={() => toggleOne(u.id)}
                    />
                  </td>
                  <td>{u.name}</td>
                  <td>{u.department || '—'}</td>
                  <td>
                    <span className={`type-badge ${u.employee_type === '신입' ? 'new' : 'exp'}`}>
                      {u.employee_type}
                    </span>
                  </td>
                  <td>
                    {u.mentor_name ? (
                      <span
                        className="mentor-assigned"
                        onClick={() => { setAssignTarget(u); setAssignInput(u.mentor_name); }}
                      >
                        {u.mentor_name}
                      </span>
                    ) : (
                      <button
                        className="mentor-assign-btn"
                        onClick={() => { setAssignTarget(u); setAssignInput(''); }}
                      >
                        지정 필요
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      className="mentor-assign-btn"
                      style={{ background: '#e8f0fe', color: '#1a56db', borderColor: '#93c5fd' }}
                      onClick={() => handleRowEmail(u)}
                    >
                      메일 생성
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: '24px' }}>
                    등록된 직원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {assignTarget && (
        <div className="confirm-overlay" onClick={() => setAssignTarget(null)}>
          <div className="program-popup" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="program-popup-header">
              <h3>{assignTarget.name} — 멘토/버디 지정</h3>
              <button className="program-popup-close" onClick={() => setAssignTarget(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <input
                type="text"
                value={assignInput}
                onChange={e => setAssignInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !assignLoading && assignInput.trim() && handleAssignSave()}
                placeholder="멘토/버디 이름 입력"
                style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  onClick={() => setAssignTarget(null)}
                  style={{ padding: '7px 18px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  onClick={handleAssignSave}
                  disabled={!assignInput.trim() || assignLoading}
                  style={{ padding: '7px 18px', background: '#1a2332', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: (!assignInput.trim() || assignLoading) ? 0.5 : 1 }}
                >
                  {assignLoading ? '저장 중...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailHtml && (
        <div className="email-popup-overlay" onClick={() => setEmailHtml(null)}>
          <div className="email-popup" onClick={e => e.stopPropagation()}>
            <div className="email-popup-header">
              <h3>안내메일 미리보기</h3>
              <div className="email-popup-actions">
                {copied && <span className="email-copy-feedback">✓ 복사됨!</span>}
                <button className="email-copy-btn" onClick={handleCopy}>HTML 복사</button>
                <button className="email-popup-close" onClick={() => setEmailHtml(null)}>✕</button>
              </div>
            </div>
            <div
              className="email-popup-body"
              dangerouslySetInnerHTML={{ __html: emailHtml }}
            />
          </div>
        </div>
      )}

      {toast && <div className="mentor-toast">{toast}</div>}
    </div>
  );
}