import { useMemo, useState } from 'react';
import { LOG_TYPES } from '../data/workspace.js';
import { OUTCOMES, DATE_RANGES, visibleEntries, applyFilters } from '../lib/entries.js';
import { WorkTable, useSimilar } from '../components/WorkLog.jsx';

// Every entry the viewer can see, with filters. Reached from "See all" on the home and project pages.
// #/entries, #/entries/inv1, #/entries/inv1/lab, #/entries/inv1/similar
export default function Entries({ lab, state, viewer, pi, project = 'all', scope = 'mine' }) {
  const all = useMemo(() => visibleEntries(state, viewer, pi), [state.logs, viewer.id, pi]);
  const similar = useSimilar(all, viewer);
  const [f, setF] = useState({
    who: scope === 'mine' ? viewer.id : 'all',
    similar: scope === 'similar',
    range: 'any',
    from: '',
    to: '',
    type: 'all',
    outcome: 'all',
    project: lab.inventions.some((i) => i.id === project) ? project : 'all',
  });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  let rows = applyFilters(all, { ...f, who: f.who === 'everyone' ? 'all' : f.who }, lab.lab.today);
  if (f.similar) rows = rows.filter((e) => similar.has(e.id)).sort((a, b) => similar.get(b.id).score - similar.get(a.id).score);

  const people = lab.members.filter((m) => all.some((e) => e.owner === m.id) && m.id !== viewer.id);
  const onlyMine = f.who === viewer.id;
  const filtered = f.range !== 'any' || f.type !== 'all' || f.outcome !== 'all' || f.project !== 'all' || f.similar || f.who !== viewer.id;
  const clear = () =>
    setF({ who: viewer.id, similar: false, range: 'any', from: '', to: '', type: 'all', outcome: 'all', project: 'all' });

  return (
    <div className="page">
      <section className="page-head">
        <p className="crumb">
          <a href={pi ? '#/lab' : '#/me'}>Home</a> / All entries
        </p>
        <h1>{onlyMine ? 'All my entries' : 'Lab work'}</h1>
        <p className="lede">
          {onlyMine
            ? 'Everything you have logged, newest first. Click a date to see the full entry.'
            : 'Entries people chose to share with the lab, plus your own. Click a date to see the full entry.'}
        </p>
      </section>

      <form className="filters card" onSubmit={(e) => e.preventDefault()} aria-label="Filter entries">
        <label className="field">
          <span>Whose</span>
          <select value={f.who} onChange={set('who')}>
            <option value={viewer.id}>Mine</option>
            <option value="all">Everyone in the lab</option>
            {people.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <select value={f.range} onChange={set('range')}>
            {DATE_RANGES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        {f.range === 'custom' && (
          <>
            <label className="field">
              <span>From</span>
              <input type="date" value={f.from} max={lab.lab.today} onChange={set('from')} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={f.to} max={lab.lab.today} onChange={set('to')} />
            </label>
          </>
        )}
        <label className="field">
          <span>Type of work</span>
          <select value={f.type} onChange={set('type')}>
            <option value="all">All types</option>
            {LOG_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Did it work?</span>
          <select value={f.outcome} onChange={set('outcome')}>
            <option value="all">Any</option>
            {OUTCOMES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
            <option value="none">Not said</option>
          </select>
        </label>
        <label className="field">
          <span>Project</span>
          <select value={f.project} onChange={set('project')}>
            <option value="all">All projects</option>
            {lab.inventions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.short}
              </option>
            ))}
            <option value="">Other lab work</option>
          </select>
        </label>
        {!onlyMine && (
          <label className="check filter-check">
            <input type="checkbox" checked={f.similar} onChange={set('similar')} />
            <span>Only work similar to mine</span>
          </label>
        )}
      </form>

      <div className="results-head">
        <p className="muted" aria-live="polite">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
          {f.similar ? ', most similar first' : ''}
        </p>
        {filtered && (
          <button className="link small" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="empty muted">
          {f.similar ? "No one else's entries look like yours with these filters." : 'No entries match these filters.'}
        </p>
      ) : (
        <WorkTable
          entries={rows}
          lab={lab}
          viewer={viewer}
          showWho={!onlyMine}
          showProject={f.project === 'all'}
          similar={!onlyMine ? similar : null}
          caption="Entries"
        />
      )}
    </div>
  );
}
