import { useMemo, useState } from 'react';
import Readiness from '../components/Readiness.jsx';
import River from '../components/River.jsx';
import ExportPanel from '../components/ExportPanel.jsx';
import RecordRow from '../components/RecordRow.jsx';
import { ProjectWorkLog } from '../components/WorkLog.jsx';
import { formatDate, formatMonth } from '../lib/record.js';

export default function Invention({ lab, rec, state, dispatch, viewer, pi }) {
  const [exporting, setExporting] = useState(false);
  return (
    <div className="page">
      <section className="page-head with-action">
        <div>
          <p className="crumb">
            <a href="#/inventions">Inventions</a> / {rec.inv.short}
          </p>
          <h1>{rec.name}</h1>
          <p className="lede">{rec.inv.summary}</p>
          <p className="muted">
            {rec.inv.stage}. Work since {formatMonth(rec.inv.started)}, {rec.inv.contributors.length} contributors,{' '}
            {rec.confirmed.length} confirmed records and {rec.suggested.length} waiting for review.
          </p>
        </div>
        <div className="head-actions">
          {state.sent[rec.inv.id] ? (
            <span className="pill ok">Sent to Yale Ventures</span>
          ) : (
            <a className="btn primary" href={`#/disclose/${rec.inv.id}`}>
              Disclose to Yale Ventures
            </a>
          )}
          <button className="btn" onClick={() => setExporting(true)}>
            Download package
          </button>
        </div>
      </section>

      <ProjectWorkLog lab={lab} state={state} viewer={viewer} pi={pi} inv={rec.inv} />

      <div className="two-col">
        <section aria-labelledby="ready-h" className="card">
          <h2 id="ready-h">Readiness</h2>
          <Readiness score={rec.score} checks={rec.checks} />
          <p className="metric muted small">
            <strong className="tnum">{rec.retrievable.pct}%</strong> of confirmed records can be opened without
            contacting someone who left ({rec.retrievable.n} of {rec.retrievable.total}). Pilot target: 90%.
          </p>
        </section>
        <section aria-labelledby="gaps-h" className="card">
          <h2 id="gaps-h">
            Open items <span className="count">{rec.gaps.length}</span>
          </h2>
          {rec.gaps.length === 0 ? (
            <p className="muted">Nothing open. This record is ready to hand to Yale Ventures.</p>
          ) : (
            <ul className="gaps">
              {rec.gaps.map((g) => (
                <Gap key={g.id} gap={g} lab={lab} rec={rec} state={state} dispatch={dispatch} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="river-h" className="block">
        <h2 id="river-h">How the work happened</h2>
        <p className="muted">
          Every record Rheo has tied to this invention, by person and date. The record survives when the lane ends.
        </p>
        <River lab={lab} rec={rec} />
      </section>

      <section aria-labelledby="ledger-h" className="block">
        <h2 id="ledger-h">Contributor ledger</h2>
        <p className="muted">
          Who worked on what, with the evidence. Rheo records contributions; patent counsel decides inventorship.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Person</th>
                <th scope="col">Contribution</th>
                <th scope="col" className="num">Confirmed</th>
                <th scope="col" className="num">To review</th>
                <th scope="col">Active on this work</th>
                <th scope="col">Strongest record</th>
              </tr>
            </thead>
            <tbody>
              {rec.ledger.map((c) => (
                <tr key={c.member.id} className={c.member.status === 'left' ? 'row-left' : ''}>
                  <th scope="row">
                    {c.member.name}
                    <span className="muted small stack">
                      {c.member.role}
                      {c.member.status === 'left' ? `, left ${formatMonth(c.member.end)}` : ''}
                    </span>
                  </th>
                  <td>{c.roles.join(', ')}</td>
                  <td className={`num ${c.confirmed === 0 ? 'warn-text' : ''}`}>{c.confirmed}</td>
                  <td className="num">{c.suggested}</td>
                  <td>{c.first ? `${formatMonth(c.first)} to ${formatMonth(c.last)}` : '—'}</td>
                  <td className="small">
                    {c.keyRecord ? (
                      <>
                        {c.keyRecord.name}
                        <span className="muted stack">{formatDate(c.keyRecord.date)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Records lab={lab} rec={rec} dispatch={dispatch} />

      {exporting && (
        <ExportPanel
          lab={lab}
          rec={rec}
          onClose={() => setExporting(false)}
          onDownload={() => dispatch({ type: 'exported', inv: rec.inv.id })}
        />
      )}
    </div>
  );
}

function Gap({ gap, lab, rec, state, dispatch }) {
  const [drafting, setDrafting] = useState(false);
  const requested = state.requested[gap.id];
  const member = lab.members.find((m) => m.id === gap.member);
  const draftText = member
    ? `Hi ${member.name.split(' ')[0]},\n\nWe're preparing the invention disclosure for the ${rec.inv.short} with Yale Ventures. Rheo shows ${gap.files?.length} raw data files you mentioned in Teams are still on ${gap.files ? lab.files.find((f) => f.id === gap.files[0])?.location : 'your drive'}.\n\nCould you share that folder with the lab OneDrive this week? It's the raw data behind the patent claims.\n\nThank you,\n${lab.lab.pi}`
    : '';
  // The PI may edit the draft before copying it, so copy what's in the box.
  const [draft, setDraft] = useState(draftText);

  let action = null;
  if (gap.action === 'move') {
    action = (
      <button className="btn small" onClick={() => dispatch({ type: 'move', ids: gap.files })}>
        Copy to lab storage
      </button>
    );
  } else if (gap.action === 'handoff') {
    action = (
      <a className="btn small" href={`#/handoff/${gap.member}`}>
        Start handoff
      </a>
    );
  } else if (gap.action === 'review') {
    action = (
      <button className="btn small" onClick={() => dispatch({ type: 'match', ids: gap.files, value: 'confirmed' })}>
        Confirm {gap.files.length}
      </button>
    );
  } else if (gap.action === 'none-needed') {
    action = (
      <button className="btn small quiet" onClick={() => dispatch({ type: 'noneNeeded', key: `${rec.inv.id}:${gap.req}` })}>
        No outside materials used
      </button>
    );
  } else if (gap.action === 'request') {
    action = requested ? (
      <>
        <span className="pill">Requested {formatDate(requested)}</span>
        <button className="btn small" onClick={() => dispatch({ type: 'move', ids: gap.files })}>
          Mark files received
        </button>
      </>
    ) : (
      <button className="btn small" onClick={() => setDrafting(!drafting)} aria-expanded={drafting}>
        Ask {member?.name.split(' ')[0]} for the files
      </button>
    );
  }

  return (
    <li className={`gap sev-${gap.severity}`}>
      <p className="gap-title">{gap.title}</p>
      <p className="muted small">{gap.body}</p>
      {action && <div className="gap-actions">{action}</div>}
      {drafting && (
        <div className="draft">
          <label className="field">
            <span>Draft message (Rheo doesn't send anything)</span>
            <textarea rows={9} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </label>
          <div className="gap-actions">
            <button
              className="btn small primary"
              onClick={() => {
                // Clipboard can be blocked (permissions, insecure origin): the text is still in the box.
                navigator.clipboard?.writeText(draft).catch(() => {});
                dispatch({ type: 'requested', id: gap.id, date: lab.lab.today });
                setDrafting(false);
              }}
            >
              Copy and mark as requested
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'confirmed', label: 'Confirmed', test: (f) => f.match === 'confirmed' },
  { id: 'suggested', label: 'To review', test: (f) => f.match === 'suggested' },
  { id: 'outside', label: 'Outside lab storage', test: (f) => !f.reachable || f.atRisk || f.personalStorage },
];

function Records({ lab, rec, dispatch }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(25);
  const list = useMemo(() => {
    const t = FILTERS.find((f) => f.id === filter).test;
    const needle = q.trim().toLowerCase();
    return rec.files
      .filter(t)
      .filter((f) => !needle || f.name.toLowerCase().includes(needle))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [rec.files, filter, q]);

  return (
    <section aria-labelledby="records-h" className="block">
      <h2 id="records-h">Records</h2>
      <div className="filters">
        <div role="tablist" aria-label="Filter records" className="seg-control">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => {
                setFilter(f.id);
                setLimit(25);
              }}
            >
              {f.label} <span className="tnum muted">{rec.files.filter(f.test).length}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search records</span>
          <input type="search" placeholder="Search file names" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <ul className="records">
        {list.slice(0, limit).map((f) => (
          <RecordRow key={f.id} f={f} lab={lab} dispatch={dispatch} />
        ))}
      </ul>
      {list.length === 0 && <p className="muted">No records match. Try another filter or search.</p>}
      {list.length > limit && (
        <button className="btn quiet" onClick={() => setLimit(limit + 50)}>
          Show more ({list.length - limit} left)
        </button>
      )}
    </section>
  );
}
