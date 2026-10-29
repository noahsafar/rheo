import { useMemo, useState } from 'react';
import { formatDate } from '../lib/record.js';
import {
  did,
  result,
  outcomeLabel,
  visibilityOf,
  visibleEntries,
  similarityIndex,
  closestMine,
} from '../lib/entries.js';

// Rows of work: date, what was done, what came of it. The date opens the full entry.
export function WorkTable({ entries, lab, viewer, showWho = false, showProject = false, similar, caption }) {
  const who = (id) => lab.members.find((m) => m.id === id);
  return (
    <div className="table-wrap">
      <table className="table work-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            <th scope="col" className="wt-date">
              Date
            </th>
            <th scope="col">What I did</th>
            <th scope="col">Result</th>
            {showWho && <th scope="col">Who</th>}
            {showProject && <th scope="col">Project</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const person = who(e.owner);
            const mine = e.owner === viewer.id;
            const v = visibilityOf(e);
            const sim = similar?.get(e.id);
            const inv = lab.inventions.find((i) => i.id === e.invention);
            return (
              <tr key={e.id}>
                <td className="wt-date">
                  <a href={`#/entry/${e.id}`} aria-label={`Open entry from ${formatDate(e.date)}: ${did(e)}`}>
                    {formatDate(e.date)}
                  </a>
                </td>
                <td>
                  <span className="wt-did">{did(e)}</span>
                  {mine && v !== 'lab' && (
                    <span className="vis-tag" title={v === 'private' ? 'Only you can see this' : 'Only you and the head of the lab'}>
                      {v === 'private' ? 'Only me' : 'Me + head of lab'}
                    </span>
                  )}
                  {sim && (
                    <span className="sim-note small">
                      Like your{' '}
                      <a href={`#/entry/${sim.entry.id}`}>
                        {formatDate(sim.entry.date)} entry: {truncate(did(sim.entry), 48)}
                      </a>
                    </span>
                  )}
                </td>
                <td>
                  {e.outcome && <span className={`oc-badge oc-${e.outcome}`}>{outcomeLabel(e.outcome)}</span>}
                  {result(e) ? <span className="wt-result">{result(e)}</span> : !e.outcome && <span className="muted">Not added</span>}
                </td>
                {showWho && <td className="wt-who">{mine ? 'Me' : person?.name ?? 'Someone'}</td>}
                {showProject && <td className="wt-proj">{inv?.short ?? 'Other lab work'}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

// For every entry by someone else, which of my entries it most resembles.
export function useSimilar(all, viewer) {
  return useMemo(() => {
    const mine = all.filter((e) => e.owner === viewer.id);
    const index = similarityIndex(all);
    const map = new Map();
    for (const e of all) {
      if (e.owner === viewer.id) continue;
      const best = closestMine(e, mine, index);
      if (best) map.set(e.id, best);
    }
    return map;
  }, [all, viewer.id]);
}

// The work log on a project page: mine by default, the whole lab one click away,
// and "similar to my work" to find people doing the same thing.
export function ProjectWorkLog({ lab, state, viewer, pi, inv, limit = 10 }) {
  const [scope, setScope] = useState('mine');
  const [onlySimilar, setOnlySimilar] = useState(false);
  const all = useMemo(() => visibleEntries(state, viewer, pi).filter((e) => e.invention === inv.id), [state.logs, viewer.id, pi, inv.id]);
  const similar = useSimilar(all, viewer);
  const mine = all.filter((e) => e.owner === viewer.id);
  let rows = scope === 'mine' ? mine : all;
  if (scope === 'lab' && onlySimilar)
    rows = rows.filter((e) => similar.has(e.id)).sort((a, b) => similar.get(b.id).score - similar.get(a.id).score);
  const shown = rows.slice(0, limit);

  return (
    <section aria-labelledby="worklog-h" className="block worklog">
      <div className="section-head">
        <h2 id="worklog-h">{scope === 'mine' ? 'What I worked on' : 'What the lab worked on'}</h2>
        <div className="seg-control" role="group" aria-label="Whose work">
          <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>
            Mine <span className="count">{mine.length}</span>
          </button>
          <button type="button" aria-pressed={scope === 'lab'} onClick={() => setScope('lab')}>
            Whole lab <span className="count">{all.length}</span>
          </button>
        </div>
      </div>
      {scope === 'lab' && (
        <label className="check inline-check">
          <input type="checkbox" checked={onlySimilar} onChange={(e) => setOnlySimilar(e.target.checked)} />
          <span>Only show work similar to mine</span>
        </label>
      )}
      {shown.length === 0 ? (
        <p className="empty muted">
          {scope === 'mine'
            ? 'Nothing logged on this project yet. Use the + button to add what you did.'
            : onlySimilar
              ? "Nobody else's entries look like yours yet."
              : 'Nothing logged on this project yet.'}
        </p>
      ) : (
        <WorkTable
          entries={shown}
          lab={lab}
          viewer={viewer}
          showWho={scope === 'lab'}
          similar={scope === 'lab' ? similar : null}
          caption={`Work on ${inv.short}`}
        />
      )}
      {rows.length > shown.length && (
        <p className="see-all">
          <a href={`#/entries/${inv.id}${scope === 'lab' ? (onlySimilar ? '/similar' : '/lab') : ''}`}>
            See all {rows.length} entries
          </a>
        </p>
      )}
    </section>
  );
}

// Home page: my last ten entries, with the rest one click away.
export function RecentEntries({ lab, state, viewer, pi, limit = 10 }) {
  const all = useMemo(() => visibleEntries(state, viewer, pi), [state.logs, viewer.id, pi]);
  const mine = all.filter((e) => e.owner === viewer.id);
  const others = all.length - mine.length;
  return (
    <section aria-labelledby="recent-h" className="block tight worklog">
      <div className="section-head">
        <h2 id="recent-h">
          My recent work <span className="count">{mine.length}</span>
        </h2>
        {others > 0 && (
          <a className="small" href="#/entries/all/lab">
            See what the lab is working on
          </a>
        )}
      </div>
      {mine.length === 0 ? (
        <p className="empty muted">Nothing logged yet. Tap the + button at the bottom right to add what you did.</p>
      ) : (
        <WorkTable entries={mine.slice(0, limit)} lab={lab} viewer={viewer} showProject caption="My recent work" />
      )}
      {mine.length > limit && (
        <p className="see-all">
          <a href="#/entries">See all {mine.length} of my entries</a>
        </p>
      )}
    </section>
  );
}
