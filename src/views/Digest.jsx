import { useEffect, useState } from 'react';
import { digest, formatDate, daysBetween } from '../lib/record.js';
import RecordRow from '../components/RecordRow.jsx';

export default function Digest({ lab, files, records, state, dispatch }) {
  const [view, setView] = useState('app');
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
  const confirmStrong = () => dispatch({ type: 'match', ids: highConfidence.map((f) => f.id), value: 'confirmed' });

  useEffect(() => {
    if (open.length === 0 && !state.digestDone) dispatch({ type: 'digestDone' });
  }, [open.length, state.digestDone, dispatch]);

  return (
    <div className="page narrow">
      <section className="page-head">
        <p className="crumb">
          <a href="#/lab">{lab.lab.name}</a> / Weekly digest
        </p>
        <h1>Week of {formatDate(weekOf.toISOString().slice(0, 10), { month: 'long', day: 'numeric' })}</h1>
        <p className="lede">
          Rheo matched these records to your inventions this week. Confirm the ones that belong and they join the
          record. Most weeks take about five minutes. The same list arrives as an email every Monday, so you can
          confirm without opening Rheo.
        </p>
        <div role="tablist" aria-label="Where you see the digest" className="seg-control">
          <button role="tab" aria-selected={view === 'app'} onClick={() => setView('app')}>
            In Rheo
          </button>
          <button role="tab" aria-selected={view === 'email'} onClick={() => setView('email')}>
            As Monday's email
          </button>
        </div>
      </section>

      <div className="digest-bar" aria-live="polite">
        <span className="bar" aria-hidden="true">
          <span style={{ width: `${(reviewed / items.length) * 100}%` }} />
        </span>
        <span className="tnum">
          {reviewed} of {items.length} reviewed
        </span>
        {highConfidence.length > 1 && (
          <button className="btn small" onClick={confirmStrong}>
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

      {view === 'email' && (
        <DigestEmail
          lab={lab}
          state={state}
          items={items}
          open={open}
          highConfidence={highConfidence}
          onConfirmStrong={confirmStrong}
          onOpenFull={() => setView('app')}
          dispatch={dispatch}
        />
      )}

      {view === 'app' && (
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
      )}
    </div>
  );
}

// The digest as it lands in the PI's inbox: the work happens in a tool they already open.
function DigestEmail({ lab, state, items, open, highConfidence, onConfirmStrong, onOpenFull, dispatch }) {
  const first = lab.lab.pi.split(' ')[0];
  const shown = items.slice(0, 5);
  const leaving = lab.members.filter((m) => m.status === 'leaving' && !state.handoffs[m.id]?.done);
  const invShort = (id) => lab.inventions.find((i) => i.id === id)?.short;
  const ownerName = (id) => lab.members.find((m) => m.id === id)?.name;

  return (
    <article className="email" aria-label="The weekly digest as an email">
      <header className="email-head">
        <p>
          <span className="muted">From</span> Rheo
        </p>
        <p>
          <span className="muted">To</span> {lab.lab.pi}
        </p>
        <p className="email-subject">
          {open.length > 0 ? `${open.length} records to confirm this week, about 5 minutes` : 'This week is done'}
        </p>
      </header>
      <div className="email-body">
        <p>Hi {first},</p>
        <p>
          Rheo matched these records to your inventions this week. Confirm the ones that belong right here; they join
          the record without opening Rheo.
        </p>
        <ul className="email-items">
          {shown.map((f) => (
            <li key={f.id}>
              <div>
                <p className="record-name">{f.name}</p>
                <p className="muted small">
                  {invShort(f.invention)} · {ownerName(f.owner)}
                  {f.match === 'suggested' ? ` · ${Math.round(f.confidence * 100)}% match` : ''}
                </p>
              </div>
              {f.match === 'suggested' ? (
                <div className="record-actions">
                  <button className="btn small" onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'confirmed' })}>
                    Confirm
                  </button>
                  <button
                    className="btn small quiet"
                    onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'rejected' })}
                    aria-label={`Not related: ${f.name}`}
                  >
                    Not related
                  </button>
                </div>
              ) : (
                <span className="muted small">{f.match === 'confirmed' ? 'Added' : 'Removed'}</span>
              )}
            </li>
          ))}
        </ul>
        {items.length > shown.length && (
          <p className="muted small">and {items.length - shown.length} more in the full digest</p>
        )}
        <div className="email-actions">
          {highConfidence.length > 1 && (
            <button className="btn small primary" onClick={onConfirmStrong}>
              Confirm the {highConfidence.length} strong matches
            </button>
          )}
          <button className="btn small" onClick={onOpenFull}>
            Open the full digest
          </button>
        </div>
        {leaving.map((m) => (
          <p key={m.id} className="email-note">
            Also this week: {m.name} leaves in {daysBetween(lab.lab.today, m.end)} days.{' '}
            <a href={`#/handoff/${m.id}`}>Start the handoff</a>
          </p>
        ))}
      </div>
    </article>
  );
}
