import {
  fmtLong, fmtShort, fmtDeadline, addDays, getDayKo,
  buildNewHireEmail, buildExpHireEmail,
} from './AdminMentorBuddy';

describe('날짜 유틸', () => {
  test('fmtLong: 2026-02-11 → 2026.02/11', () => {
    expect(fmtLong('2026-02-11')).toBe('2026.02/11');
  });

  test('fmtShort: 2026-02-11 → 26.02/11', () => {
    expect(fmtShort('2026-02-11')).toBe('26.02/11');
  });

  test('addDays: 2026-03-12 + 5 → 2026-03-17', () => {
    const result = addDays(new Date('2026-03-12'), 5);
    expect(result.toISOString().slice(0, 10)).toBe('2026-03-17');
  });

  test('getDayKo: 2026-03-17 → 화', () => {
    expect(getDayKo(new Date('2026-03-17'))).toBe('화');
  });

  test('fmtDeadline: 2026-03-17 → ~03/17(화)', () => {
    expect(fmtDeadline(new Date('2026-03-17'))).toBe('~03/17(화)');
  });
});

const newHire = {
  name: '박하나',
  department: '인사기획팀',
  period_1_start: '2026-02-11',
  period_1_end:   '2026-03-11',
  period_2_start: '2026-03-12',
  period_2_end:   '2026-04-08',
  period_3_start: '2026-04-09',
  period_3_end:   '2026-05-06',
};

const expHire = {
  name: '홍길동',
  department: 'SE팀',
  period_1_start: '2026-04-01',
  period_1_end:   '2026-05-01',
};

const today = new Date('2026-03-12');

describe('buildNewHireEmail', () => {
  let html;
  beforeAll(() => { html = buildNewHireEmail([newHire], today); });

  test('제목에 마감일 포함', () => expect(html).toContain('~03/17'));
  test('대상자 성명 포함', () => expect(html).toContain('박하나'));
  test('시행기간 포함', () => expect(html).toContain('2026.02/11'));
  test('종료일 포함', () => expect(html).toContain('2026.05/06'));
  test('1차 지원금 기간 포함', () => expect(html).toContain('26.02/11'));
  test('2차 지원금 기간 포함', () => expect(html).toContain('26.03/12'));
  test('3차 지원금 기간 포함', () => expect(html).toContain('26.04/09'));
  test('요일 포함', () => expect(html).toContain('(화)'));
});

describe('buildExpHireEmail', () => {
  let html;
  beforeAll(() => { html = buildExpHireEmail([expHire], today); });

  test('제목에 온보딩 프로그램 포함', () => expect(html).toContain('온보딩 프로그램'));
  test('대상자 성명 포함', () => expect(html).toContain('홍길동'));
  test('시행기간 4주 포함', () => expect(html).toContain('4주'));
  test('종료일 포함', () => expect(html).toContain('2026.05/01'));
  test('지원금 기간 포함', () => expect(html).toContain('26.04/01'));
});
