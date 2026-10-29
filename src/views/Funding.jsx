import { useState } from 'react';
import ExportPanel from '../components/ExportPanel.jsx';
import Readiness from '../components/Readiness.jsx';
import { formatDate, daysBetween } from '../lib/record.js';
import { progressReportMarkdown, download, slug } from '../lib/export.js';
import { grants } from '../data/workspace.js';
import { allDeadlines, allMeetings, slidesFor } from '../lib/workspace.js';

export default function Funding({ lab, files, records, state, dispatch }) {
  const [exporting, setExporting] = useState(null);
  const today = lab.lab.today;
  const meetings = allMeetings(state);

  const send = (invId) => {
    dispatch({ type: 'sent', inv: invId, date: today });
    for (const d of allDeadlines(state))
      if (d.action === 'disclosure' && d.invention === invId) dispatch({ type: 'deadlineDone', id: d.id, value: true });
  };

  return (
    <div className="page">
      <section className="page-head">
        <h1>Funding & Yale Ventures</h1>
        <p className="lede">
          What leaves the lab: invention disclosures for Yale Ventures and progress reports for funders, built from
          the same record your lab keeps every week.
        </p>
      </section>

      <section aria-labelledby="yv-h" className="block tight">
        <h2 id="yv-h">Invention disclosures</h2>
        <p className="muted">
          Send when the record is ready. Anything still open is listed at the top of the package, so Yale Ventures
          knows what's coming instead of asking.
        </p>
        <div className="inv-grid">
          {lab.inventions.map((inv) => {
            const rec = records[inv.id];
            const sent = state.sent[inv.id];
            const due = allDeadlines(state).find((d) => d.action === 'disclosure' && d.invention === inv.id);
            return (
              <article key={inv.id} className="card disclosure">
                <Readiness score={rec.score} checks={rec.checks} compact />
                <h3>
                  <a href={`#/invention/${inv.id}`}>{rec.name}</a>
                </h3>
                <p className="muted small">
                  {rec.confirmed.length} confirmed records, {rec.gaps.length} open{' '}
                  {rec.gaps.length === 1 ? 'item' : 'items'}
                  {rec.retrievable ? `, ${rec.retrievable.pct}% retrievable today` : ''}.
                  {due && !sent ? ` Due to Yale Ventures ${formatDate(due.date, { month: 'short', day: 'numeric' })}.` : ''}
                </p>
                {sent ? (
                  <p className="sent" role="status">
                    Sent to Yale Ventures {formatDate(sent)}. They see the same record, so follow-up questions point to
                    specific files.
                  </p>
                ) : null}
                <div className="gap-actions">
                  <button className="btn small" onClick={() => setExporting(inv.id)}>
                    Review package
                  </button>
                  {!sent && (
                    <button
                      className={`btn small ${rec.score >= 90 ? 'primary' : ''}`}
                      onClick={() => {
                        if (rec.gaps.length === 0 || confirm(`${rec.gaps.length} open items will be listed in the package. Send anyway?`)) send(inv.id);
                      }}
                    >
                      Send to Yale Ventures
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="grants-h" className="block">
        <h2 id="grants-h">Grants and reports</h2>
        <p className="muted">
          Each report draft pulls in what was done since the last one: results, protocols, who did the work, what was
          presented at lab meeting, and any abstracts or theses.
        </p>
        <ul className="grant-list">
          {grants.map((g) => {
            const inventionRecs = g.inventions.map((id) => records[id]);
            const recent = inventionRecs.flatMap((r) => r.confirmed.filter((f) => f.date >= g.lastReport));
            const people = new Set(recent.map((f) => f.owner));
            const shown = meetings.filter((m) => g.inventions.includes(m.invention) && m.date >= g.lastReport && m.date <= today);
            const days = daysBetween(today, g.nextReport);
            const built = state.reports[g.id];
            return (
              <li key={g.id} className="card grant">
                <div className="grant-head">
                  <div>
                    <h3>{g.title}</h3>
                    <p className="muted small">
                      {g.sponsor}, {g.number}. {formatDate(g.start, { month: 'short', year: 'numeric' })} to{' '}
                      {formatDate(g.end, { month: 'short', year: 'numeric' })}. Supports{' '}
                      {inventionRecs.map((r) => r.inv.short).join(', ')}.
                    </p>
                  </div>
                  <span className={`pill ${days <= 60 ? 'warn' : ''}`}>
                    {g.report} due {formatDate(g.nextReport, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <dl className="grant-stats">
                  <div>
                    <dt>New records since last report</dt>
                    <dd className="tnum">{recent.length}</dd>
                  </div>
                  <div>
                    <dt>People</dt>
                    <dd className="tnum">{people.size}</dd>
                  </div>
                  <div>
                    <dt>Lab meeting updates</dt>
                    <dd className="tnum">{shown.length}</dd>
                  </div>
                </dl>
                {g.federal && (
                  <p className="muted small">
                    Federally funded. Inventions made under this award must be reported to the agency; Yale Ventures
                    does this once the disclosure is in.
                  </p>
                )}
                <div className="gap-actions">
                  <button
                    className="btn small primary"
                    onClick={() => {
                      const md = progressReportMarkdown(lab, g, {
                        records,
                        files,
                        meetings,
                        sent: state.sent,
                        slidesFor: (m) => slidesFor(m, state),
                      });
                      download(`${slug(g.title)}-progress-report.md`, md, 'text/markdown');
                      dispatch({ type: 'report', grant: g.id, date: today });
                    }}
                  >
                    Build report draft
                  </button>
                  {built && <span className="muted small">Draft downloaded {formatDate(built)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {exporting && (
        <ExportPanel
          lab={lab}
          rec={records[exporting]}
          onClose={() => setExporting(null)}
          onDownload={() => dispatch({ type: 'exported', inv: exporting })}
        />
      )}
    </div>
  );
}
