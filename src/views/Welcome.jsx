import { useMemo, useState } from 'react';
import { formatDate, formatMonth } from '../lib/record.js';
import { allMeetings } from '../lib/workspace.js';
import { did, result, outcomeLabel, byNewest, invName, visibilityOf } from '../lib/entries.js';
import { techniquesFrom, problemsSolved } from '../lib/tools.js';
import { WorkTable } from '../components/WorkLog.jsx';

// "New to the lab": how the lab works, what's been tried and where each project stands.
// Built only from entries shared with everyone in the lab, so nothing private shows up here,
// even for the head of the lab.
export default function Welcome({ lab, state, viewer }) {
  const shared = useMemo(() => (state.logs || []).filter((e) => visibilityOf(e) === 'lab').sort(byNewest), [state.logs]);
  const projects = lab.inventions.filter((i) => shared.some((e) => e.invention === i.id));
  const [tab, setTab] = useState(projects[0]?.id || '');
  const inv = projects.find((i) => i.id === tab);
  const people = lab.members.filter((m) => m.status !== 'left');
  const left = lab.members.filter((m) => m.status === 'left');
  const meetings = allMeetings(state).filter((m) => m.date >= lab.lab.today).slice(0, 3);
  const nameOf = (id) => lab.members.find((m) => m.id === id)?.name ?? 'Someone';
  const projectsOf = (m) => lab.inventions.filter((i) => i.contributors.some((c) => c.member === m.id)).map((i) => i.short);

  return (
    <div className="page">
      <section className="page-head">
        <h1>New to the {lab.lab.name}</h1>
        <p className="lede">
          Welcome. Here's how the lab works: the processes people use, what's been tried, and where each project
          stands. It's built from the entries people shared with the whole lab, so it keeps itself up to date.
        </p>
      </section>

      <section className="block tight" aria-labelledby="ppl-h">
        <h2 id="ppl-h">Who's who</h2>
        <ul className="welcome-people">
          {people.map((m) => (
            <li key={m.id}>
              <span className="avatar" aria-hidden="true">
                {m.name.split(' ').map((p) => p[0]).join('')}
              </span>
              <span>
                <strong>{m.name}</strong>
                {m.id === viewer.id ? ' (you)' : ''}
                <span className="muted small stack">
                  {m.role}
                  {projectsOf(m).length ? `, ${projectsOf(m).join(' and ')}` : ''}
                  {m.status === 'leaving' ? `. Leaving ${formatDate(m.end, { month: 'short', day: 'numeric' })}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
        {left.length > 0 && (
          <p className="muted small">
            Past members whose work is still in the lab record: {left.map((m) => m.name).join(', ')}.
          </p>
        )}
      </section>

      {projects.length === 0 ? (
        <p className="empty muted">No one has shared entries with the whole lab yet. As they do, this page fills in.</p>
      ) : (
        <>
          <div className="section-head welcome-tabs">
            <h2>The projects</h2>
            <div className="seg-control" role="group" aria-label="Project">
              {projects.map((i) => (
                <button key={i.id} type="button" aria-pressed={tab === i.id} onClick={() => setTab(i.id)}>
                  {i.short}
                </button>
              ))}
            </div>
          </div>
          {inv && <ProjectGuide key={inv.id} lab={lab} state={state} viewer={viewer} inv={inv} entries={shared.filter((e) => e.invention === inv.id)} nameOf={nameOf} />}
        </>
      )}

      {meetings.length > 0 && (
        <section className="block" aria-labelledby="wm-h">
          <h2 id="wm-h">Coming up at lab meeting</h2>
          <ul className="mini-list">
            {meetings.map((m) => (
              <li key={m.id}>
                <span className="muted small tnum">{formatDate(m.date, { month: 'short', day: 'numeric' })}</span>
                <span>
                  {nameOf(m.presenter)}: {m.topic}
                </span>
              </li>
            ))}
          </ul>
          <a className="small" href="#/meetings">
            Lab meeting schedule
          </a>
        </section>
      )}
    </div>
  );
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function ProjectGuide({ lab, state, viewer, inv, entries, nameOf }) {
  const techniques = techniquesFrom(entries);
  const changes = entries.filter((e) => e.type === 'protocol');
  const solved = problemsSolved(entries);
  const solvedIds = new Set(solved.map((x) => x.problem.id));
  const unsolved = entries.filter((e) => e.outcome === 'failed' && !solvedIds.has(e.id));
  const ideas = entries.filter((e) => e.type === 'idea');
  const people = [...new Set(entries.map((e) => e.owner))];

  return (
    <div className="welcome-project">
      <section className="card">
        <h3 className="wp-title">{invName(state, inv)}</h3>
        <p>{inv.summary}</p>
        <p className="muted small">
          {inv.stage}. Work since {formatMonth(inv.started)}. Shared entries from {people.map(nameOf).join(', ')}.
        </p>
      </section>

      <section className="block" aria-labelledby="latest-h">
        <h3 id="latest-h">Latest updates</h3>
        <WorkTable entries={entries.slice(0, 5)} lab={lab} viewer={viewer} showWho caption="Latest updates" />
        {entries.length > 5 && (
          <p className="see-all">
            <a href={`#/entries/${inv.id}/lab`}>See all {entries.length} shared entries</a>
          </p>
        )}
      </section>

      <section className="block" aria-labelledby="how-h">
        <h3 id="how-h">How we do things</h3>
        <p className="muted">The processes people use on this project, who to ask, and the most recent example.</p>
        {techniques.length === 0 ? (
          <p className="empty muted">No one has noted the processes they use yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Process</th>
                  <th scope="col">Who to ask</th>
                  <th scope="col">Most recent example</th>
                </tr>
              </thead>
              <tbody>
                {techniques.map((t) => (
                  <tr key={t.name}>
                    <td>
                      <strong>{t.name}</strong>
                      {t.n > 1 && <span className="muted small stack">Used {t.n} times</span>}
                    </td>
                    <td>{[...t.people].map((id) => (id === viewer.id ? 'You' : nameOf(id))).join(', ')}</td>
                    <td>
                      <a href={`#/entry/${t.latest.id}`}>{did(t.latest)}</a>
                      <span className="muted small stack">
                        {formatDate(t.latest.date)}. {t.latest.process}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {changes.length > 0 && (
          <>
            <h4 className="welcome-sub">Recent changes to how we work</h4>
            <ul className="welcome-list">
              {changes.map((e) => (
                <li key={e.id}>
                  <a href={`#/entry/${e.id}`}>{did(e)}</a>
                  <span className="muted small stack">
                    {nameOf(e.owner)}, {formatDate(e.date)}
                    {result(e) ? `. ${result(e)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="block" aria-labelledby="tried-h">
        <h3 id="tried-h">Already tried, so you don't have to</h3>
        {solved.length === 0 && unsolved.length === 0 ? (
          <p className="empty muted">Nothing marked as not working yet.</p>
        ) : (
          <ul className="welcome-list">
            {solved.map(({ problem, fix }) => (
              <li key={problem.id}>
                <span className={`oc-badge oc-${problem.outcome}`}>{outcomeLabel(problem.outcome)}</span>{' '}
                <a href={`#/entry/${problem.id}`}>{did(problem)}</a>
                {result(problem) && <span className="muted small stack">{result(problem)}</span>}
                <span className="small stack fix-line">
                  What worked instead: <a href={`#/entry/${fix.id}`}>{did(fix)}</a> ({nameOf(fix.owner)}
                  {result(fix) ? `, ${result(fix)}` : ''})
                </span>
              </li>
            ))}
            {unsolved.map((e) => (
              <li key={e.id}>
                <span className="oc-badge oc-failed">{outcomeLabel('failed')}</span> <a href={`#/entry/${e.id}`}>{did(e)}</a>
                <span className="muted small stack">
                  {nameOf(e.owner)}, {formatDate(e.date)}
                  {result(e) ? `. ${result(e)}` : ''}. No fix logged yet.
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ideas.length > 0 && (
        <section className="block" aria-labelledby="ideas-h">
          <h3 id="ideas-h">Open ideas</h3>
          <ul className="welcome-list">
            {ideas.map((e) => (
              <li key={e.id}>
                <a href={`#/entry/${e.id}`}>{capitalize(did(e).replace(/^idea:\s*/i, ''))}</a>
                <span className="muted small stack">
                  {nameOf(e.owner)}, {formatDate(e.date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
