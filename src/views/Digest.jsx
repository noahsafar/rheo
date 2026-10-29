import { useState } from 'react';
import { digest, formatDate } from '../lib/record.js';
import RecordRow from '../components/RecordRow.jsx';

export default function Digest({ lab, files, records, dispatch }) {
  // Freeze this week's list when the page opens, so items don't shuffle while the PI works through it.
  const [ids] = useState(() => {
    const top = digest(lab, files, 10);
    const noise = files.filter((f) => f.falsePositive && f.match === 'suggested' && !top.includes(f)).slice(0, 2);
    return [...top.slice(0, 6), noise[0], ...top.slice(6), noise[1]].filter(Boolean).map((f) => f.id);
  });
  const [startScores] = useState(() => Object.fromEntries(Object.values(records).map((r) => [r.inv.id, r.score])));

  const items = ids.map((id) => files.find((f) => f.id === id));
  const open = items.filter((f) => f.match === 'suggested');
  const reviewed = items.length - open.length;
  const highConfidence = open.filter((f) => f.confidence >= 0.85);
  const weekOf = new Date(lab.lab.today + 'T12:00:00Z');
  weekOf.setUTCDate(weekOf.getUTCDate() - weekOf.getUTCDay());

  return (
    <div className="page narrow">
      <section className="page-head">
        <p className="crumb">
          <a href="#/lab">{lab.lab.name}</a> / Weekly digest
        </p>
        <h1>Week of {formatDate(weekOf.toISOString().slice(0, 10), { month: 'long', day: 'numeric' })}</h1>
        <p className="lede">
          Rheo matched these records to your inventions this week. Confirm the ones that belong and they join the
          record. Most weeks take about five minutes.
        </p>
      </section>

      <div className="digest-bar" aria-live="polite">
        <span className="bar" aria-hidden="true">
          <span style={{ width: `${(reviewed / items.length) * 100}%` }} />
        </span>
        <span className="tnum">
          {reviewed} of {items.length} reviewed
        </span>
        {highConfidence.length > 1 && (
          <button
            className="btn small"
            onClick={() => dispatch({ type: 'match', ids: highConfidence.map((f) => f.id), value: 'confirmed' })}
          >
            Confirm the {highConfidence.length} strong matches
          </button>
        )}
      </div>

      {open.length === 0 ? (
        <section className="card done-card">
          <h2>This week is done</h2>
          <ul className="score-changes">
            {Object.values(records).map((r) => (
              <li key={r.inv.id}>
                <a href={`#/invention/${r.inv.id}`}>{r.name}</a>
                <span className="tnum">
                  {startScores[r.inv.id]} to <strong>{r.score}</strong>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">The next digest arrives Monday. Rheo keeps matching in the background.</p>
        </section>
      ) : null}

      <ul className="records">
        {items.map((f) =>
          f.match === 'suggested' ? (
            <RecordRow key={f.id} f={f} lab={lab} dispatch={dispatch} showInvention />
          ) : (
            <li key={f.id} className={`record settled ${f.match}`}>
              <div className="record-main">
                <p className="record-name">{f.name}</p>
                <p className="muted small">
                  {f.match === 'confirmed' ? 'Added to' : 'Removed from'}{' '}
                  {lab.inventions.find((i) => i.id === f.invention)?.short}
                </p>
              </div>
              <div className="record-side">
                <button className="link small" onClick={() => dispatch({ type: 'unmatch', ids: [f.id] })}>
                  Undo
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
