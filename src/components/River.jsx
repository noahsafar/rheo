import { useMemo } from 'react';
import { DAY, formatDate } from '../lib/record.js';

// The invention record as a river: one lane per contributor, each record a mark on that lane.
// A lane stops where the person left the lab, which is exactly where records tend to go missing.

const W = 980;
const GUTTER = 168;
const RIGHT = 24;
const LANE = 46;
const TOP = 34;

export default function River({ lab, rec }) {
  const today = lab.lab.today;
  const members = rec.ledger.map((l) => l.member);
  const t0 = useMemo(() => {
    const d = new Date(rec.inv.started + 'T12:00:00Z');
    d.setUTCDate(1);
    return d.getTime();
  }, [rec.inv.started]);
  const tToday = new Date(today + 'T12:00:00Z').getTime();
  const t1 = tToday + 62 * DAY;
  const x = (iso) => GUTTER + ((new Date(iso + 'T12:00:00Z').getTime() - t0) / (t1 - t0)) * (W - GUTTER - RIGHT);
  const H = TOP + members.length * LANE + 34;

  // quarter ticks
  const ticks = [];
  const d = new Date(t0);
  d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3 + 3);
  while (d.getTime() < t1) {
    ticks.push(d.toISOString().slice(0, 10));
    d.setUTCMonth(d.getUTCMonth() + 3);
  }

  // stable vertical jitter so marks on a busy lane don't sit on top of each other
  const jitter = (id) => {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
    return ((h % 17) - 8) * 1.1;
  };

  const events = [
    ...rec.keyDates.map((k) => ({ date: k.date, label: k.flag ? 'Public disclosure' : 'First record of the idea', tone: k.flag ? 'warn' : 'stain' })),
  ];
  const deletion = members.find((m) => m.accountDeletion && rec.files.some((f) => f.atRisk && f.owner === m.id));
  if (deletion) events.push({ date: deletion.accountDeletion, label: 'Account deleted', tone: 'warn' });
  // keep only the first public-disclosure marker label to avoid stacking text
  let seenPublic = false;
  const shownEvents = events.filter((e) => {
    if (e.label !== 'Public disclosure') return true;
    if (seenPublic) return false;
    seenPublic = true;
    return true;
  });

  return (
    <figure className="river">
      <div className="river-scroll">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`river-t-${rec.inv.id}`}>
          <title id={`river-t-${rec.inv.id}`}>
            Timeline of {rec.files.length} records for {rec.name}, one lane per contributor, from{' '}
            {formatDate(rec.inv.started)} to today.
          </title>

          {ticks.map((t) => (
            <g key={t} className="tick">
              <line x1={x(t)} x2={x(t)} y1={TOP - 8} y2={H - 26} />
              <text x={x(t)} y={H - 10} textAnchor="middle">
                {formatDate(t, { month: 'short', year: '2-digit' })}
              </text>
            </g>
          ))}

          {shownEvents.map((e, i) => (
            <g key={e.label + e.date} className={`event ${e.tone}`}>
              <line x1={x(e.date)} x2={x(e.date)} y1={TOP - 14} y2={H - 26} />
              <text x={x(e.date) + 5} y={TOP - 18 + (i % 2) * 0} textAnchor={x(e.date) > W - 160 ? 'end' : 'start'} dx={x(e.date) > W - 160 ? -10 : 0}>
                {e.label}
              </text>
            </g>
          ))}

          <g className="event today">
            <line x1={x(today)} x2={x(today)} y1={TOP - 14} y2={H - 26} />
            <text x={x(today) - 5} y={H - 32} textAnchor="end">
              Today
            </text>
          </g>

          {members.map((m, i) => {
            const y = TOP + i * LANE + LANE / 2;
            const start = m.start > rec.inv.started ? m.start : rec.inv.started;
            const endIso = m.status === 'left' ? m.end : m.status === 'leaving' ? m.end : null;
            const xEnd = endIso ? x(endIso) : W - RIGHT;
            const recs = rec.files.filter((f) => f.owner === m.id);
            return (
              <g key={m.id} className={`lane ${m.status}`}>
                <text className="lane-name" x={0} y={y - 2}>
                  {m.name}
                </text>
                <text className="lane-role" x={0} y={y + 13}>
                  {m.status === 'left' ? `Left ${formatDate(m.end, { month: 'short', year: 'numeric' })}` : m.status === 'leaving' ? `Leaves ${formatDate(m.end, { month: 'short', day: 'numeric' })}` : m.role}
                </text>
                <line className="lane-band" x1={x(start)} x2={Math.min(xEnd, m.status === 'leaving' ? x(today) : xEnd)} y1={y} y2={y} />
                {m.status === 'leaving' && <line className="lane-band ahead" x1={x(today)} x2={xEnd} y1={y} y2={y} />}
                {m.status === 'left' && (
                  <g className="lane-end">
                    <line x1={xEnd} x2={xEnd} y1={y - 12} y2={y + 12} />
                    <line className="lane-after" x1={xEnd + 4} x2={W - RIGHT} y1={y} y2={y} />
                  </g>
                )}
                {recs.map((f) => {
                  const cx = x(f.date);
                  const cy = y + jitter(f.id);
                  const cls = !f.reachable ? 'unreachable' : f.atRisk || f.personalStorage ? 'risk' : f.match;
                  return (
                    <g key={f.id} className={`mark ${cls}`}>
                      {cls === 'unreachable' || cls === 'risk' ? (
                        <rect x={cx - 3.4} y={cy - 3.4} width={6.8} height={6.8} transform={`rotate(45 ${cx} ${cy})`} />
                      ) : (
                        <circle cx={cx} cy={cy} r={f.reqs.length ? 4.6 : 3.1} />
                      )}
                      <title>
                        {f.name} ({formatDate(f.date)}){f.match === 'suggested' ? ', not yet confirmed' : ''}
                        {!f.reachable ? `, stored on ${f.location}` : ''}
                        {f.atRisk || f.personalStorage ? `, stored on ${f.location}` : ''}
                      </title>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="legend">
        <span>
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" className="lg confirmed" /></svg>
          Confirmed record
        </span>
        <span>
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" className="lg suggested" /></svg>
          Rheo's match, not yet confirmed
        </span>
        <span>
          <svg width="12" height="12" aria-hidden="true"><rect x="2.5" y="2.5" width="7" height="7" transform="rotate(45 6 6)" className="lg risk" /></svg>
          Outside lab storage or at risk
        </span>
        <span className="muted">Larger marks support a checklist item. Hover a mark for the file.</span>
      </figcaption>
    </figure>
  );
}
