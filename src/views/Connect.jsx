import { useEffect, useMemo, useState } from 'react';
import { RheoMark, go } from '../App.jsx';

export default function Connect({ lab, dispatch }) {
  const [connected, setConnected] = useState({});
  const [step, setStep] = useState(1);
  const [names, setNames] = useState(() => Object.fromEntries(lab.inventions.map((i) => [i.id, i.title])));

  const bySource = useMemo(() => {
    const c = {};
    for (const f of lab.files) c[f.source] = (c[f.source] || 0) + 1;
    return c;
  }, [lab]);
  const allConnected = lab.sources.every((s) => connected[s.id]);

  return (
    <div className="onboard">
      <div className="onboard-head">
        <span className="wordmark">
          <RheoMark size={26} />
          <span>Rheo</span>
        </span>
        <span className="demo-tag">Synthetic lab</span>
      </div>

      <h1 className="onboard-title">Set up {lab.lab.name}</h1>
      <p className="lede">
        Rheo reads the tools your lab already uses and builds the record behind each invention: what was done, when,
        and by whom. It never moves, edits or stores your files. Setup takes about ten minutes.
      </p>

      <ol className="steps" aria-label="Setup steps">
        {['Connect tools', 'Index records', 'Name inventions'].map((label, i) => (
          <li key={label} aria-current={step === i + 1 ? 'step' : undefined} className={step > i + 1 ? 'done' : ''}>
            <span className="step-n">{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="panel" aria-labelledby="connect-h">
          <div className="panel-head">
            <h2 id="connect-h">Connect your lab's tools</h2>
            <button
              className="btn quiet"
              onClick={() => setConnected(Object.fromEntries(lab.sources.map((s) => [s.id, true])))}
              disabled={allConnected}
            >
              Connect all
            </button>
          </div>
          <p className="muted">
            Read-only access. Rheo sees file names, dates, owners and text, and links each record back to where it
            lives.
          </p>
          <ul className="source-list">
            {lab.sources.map((s) => (
              <li key={s.id}>
                <SourceIcon kind={s.kind} />
                <div>
                  <strong>{s.name}</strong>
                  <span className="muted">{s.note}</span>
                </div>
                {connected[s.id] ? (
                  <span className="pill ok">Connected</span>
                ) : (
                  <button className="btn" onClick={() => setConnected({ ...connected, [s.id]: true })}>
                    Connect
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="panel-foot">
            <span className="muted">
              {Object.keys(connected).length} of {lab.sources.length} connected
            </span>
            <button className="btn primary" disabled={!Object.keys(connected).length} onClick={() => setStep(2)}>
              Start indexing
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <Indexing
          lab={lab}
          bySource={bySource}
          sources={lab.sources.filter((s) => connected[s.id])}
          onDone={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <section className="panel" aria-labelledby="name-h">
          <h2 id="name-h">Name the inventions you want to track</h2>
          <p className="muted">
            A working name is enough. Rheo uses it to find related records across every connected tool, and you
            confirm the matches each week.
          </p>
          {lab.inventions.map((inv) => (
            <label key={inv.id} className="field">
              <span>Invention</span>
              <input
                value={names[inv.id]}
                onChange={(e) => setNames({ ...names, [inv.id]: e.target.value })}
                aria-label={`Name for invention ${inv.short}`}
              />
            </label>
          ))}
          <div className="panel-foot">
            <span className="muted">You can add more later.</span>
            <button
              className="btn primary"
              onClick={() => {
                dispatch({ type: 'connect', names });
                go('lab');
              }}
            >
              Build the records
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Indexing({ lab, bySource, sources, onDone }) {
  const total = sources.reduce((n, s) => n + (bySource[s.id] || 0), 0);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [progress, setProgress] = useState(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 2600);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const done = progress >= 1;
  return (
    <section className="panel" aria-labelledby="index-h" aria-live="polite">
      <h2 id="index-h">{done ? 'Indexing finished' : 'Indexing records'}</h2>
      <p className="big-count">
        <span className="tnum">{Math.round(total * progress).toLocaleString()}</span>
        <span className="muted"> records from {lab.members.length} people, including 3 who have left</span>
      </p>
      <ul className="index-bars">
        {sources.map((s, i) => {
          const n = bySource[s.id] || 0;
          const local = Math.max(0, Math.min(1, progress * 1.4 - i * 0.08));
          return (
            <li key={s.id}>
              <span>{s.name}</span>
              <span className="bar" aria-hidden="true">
                <span style={{ width: `${local * 100}%` }} />
              </span>
              <span className="tnum muted">{Math.round(n * local)}</span>
            </li>
          );
        })}
      </ul>
      <div className="panel-foot">
        <span className="muted">Nothing is copied. Rheo keeps an index that points back to each file.</span>
        <button className="btn primary" disabled={!done} onClick={onDone}>
          Continue
        </button>
      </div>
    </section>
  );
}

export function SourceIcon({ kind }) {
  const paths = {
    Files: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2h7A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z',
    Chat: 'M5 6h14v9H10l-4 3v-3H5z',
    Email: 'M4 7h16v10H4z M4 7l8 6 8-6',
    Notebook: 'M7 4h11v16H7z M7 4v16 M10 8h5 M10 11h5',
  };
  return (
    <svg className="src-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[kind]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
