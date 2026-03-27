import React from 'react';

export default function OnboardingTimeline({ user }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toDate = (str) => {
    if (!str) return null;
    const d = new Date(str);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // "2026-03-11" → "03/11"
  const fmt = (str) => (str ? str.slice(5).replace('-', '/') : '—');

  const isNewHire = user.employee_type === '신입';

  const nodes = isNewHire
    ? [
        { date: user.period_1_start, label: '입사일'  },
        { date: user.period_1_end,   label: '1차종료' },
        { date: user.period_2_end,   label: '2차종료' },
        { date: user.period_3_end,   label: '3차종료' },
      ]
    : [
        { date: user.period_1_start, label: '입사일' },
        { date: user.period_1_end,   label: '종료일' },
      ];

  const startDate = toDate(nodes[0].date);
  const endDate   = toDate(nodes[nodes.length - 1].date);
  const totalMs   = endDate - startDate;

  const toPct = (dateStr) => {
    if (!dateStr || !totalMs) return 0;
    return Math.min(100, Math.max(0, ((toDate(dateStr) - startDate) / totalMs) * 100));
  };

  const todayPct = totalMs > 0
    ? Math.min(100, Math.max(0, ((today - startDate) / totalMs) * 100))
    : 0;
  const showToday = today > startDate && today < endDate;

  const segClass = (s, e) => {
    const sd = toDate(s), ed = toDate(e);
    if (ed <= today) return 'tl-seg--done';
    if (sd <= today) return 'tl-seg--active';
    return 'tl-seg--pending';
  };

  const dotClass = (d) => (toDate(d) <= today ? 'tl-dot--done' : 'tl-dot--pending');

  return (
    <div className="tl-container">
      <div className="tl-track">
        {/* Base line */}
        <div className="tl-base-line" />

        {/* Colored segments — 원 경계(±8px)에서 시작/종료 */}
        {nodes.slice(0, -1).map((n, i) => {
          const left  = toPct(n.date);
          const width = toPct(nodes[i + 1].date) - left;
          return (
            <div
              key={i}
              className={`tl-segment ${segClass(n.date, nodes[i + 1].date)}`}
              style={{ left: `calc(${left}% + 8px)`, width: `calc(${width}% - 16px)` }}
            />
          );
        })}


        {/* Nodes */}
        {nodes.map((n, i) => (
          <div
            key={i}
            className="tl-node"
            style={{ left: `${toPct(n.date)}%` }}
          >
            <span className="tl-date">{fmt(n.date)}</span>
            <div className={`tl-dot ${dotClass(n.date)}`} />
            <span className="tl-label">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
