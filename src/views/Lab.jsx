import { digest, formatDate, formatMonth, daysBetween } from '../lib/record.js';
import Readiness, { StatusIcon } from '../components/Readiness.jsx';
import { allDeadlines, allMeetings, recentActivity, slidesFor } from '../lib/workspace.js';
import { DEADLINE_TYPES } from '../data/workspace.js';
import { DueDate } from './MyWork.jsx';

export default function Lab({ lab, files, records, state, dispatch }) {
  const weekly = digest(lab, files);
  const recs = lab.inventions.map((i) => records[i.id]);

  return (
    <div className="page">
      <section className="page-head">
        <h1>{lab.lab.name}</h1>
        <p className="lede">
          {lab.lab.pi}, {lab.lab.department}. Rheo is tracking {recs.length} inventions across{' '}
          {lab.files.length.toLocaleString()} records in {lab.sources.length} tools.
        </p>
      </section>

      <DemoGuide lab={lab} records={records} state={state} dispatch={dispatch} />

      {weekly.length > 0 && (
        <a className="callout" href="#/digest">
          <span>
            <strong>{weekly.length} matches to confirm this week.</strong> About 5 minutes.
          </span>
          <span className="callout-go">Open digest</span>
        </a>
      )}

      <section aria-labelledby="inv-h" className="block">
        <h2 id="inv-h">Inventions</h2>
        <div className="inv-grid">
          {recs.map((r) => (
            <a key={r.inv.id} className="inv-card" href={`#/invention/${r.inv.id}`}>
              <Readiness score={r.score} checks={r.checks} compact />
              <div className="inv-card-body">
                <h3>{r.name}</h3>
                <p className="muted">
                  {r.inv.stage}. {r.confirmed.length} confirmed records, {r.inv.contributors.length} contributors, since{' '}
                  {formatMonth(r.inv.started)}.
                </p>
                {r.gaps.slice(0, 2).map((g) => (
                  <p key={g.id} className={`gap-line sev-${g.severity}`}>
                    {g.title}
                  </p>
                ))}
                {r.gaps.length > 2 && <p className="muted small">and {r.gaps.length - 2} more open items</p>}
              </div>
            </a>
          ))}
        </div>
      </section>

      <LabPulse lab={lab} files={files} state={state} />

      <section aria-labelledby="people-h" className="block">
        <h2 id="people-h">People</h2>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Works on</th>
              <th scope="col">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lab.members.map((m) => {
              const on = lab.inventions.filter((i) => i.contributors.some((c) => c.member === m.id));
              const h = state.handoffs[m.id];
              return (
                <tr key={m.id} className={m.status === 'left' ? 'row-left' : ''}>
                  <th scope="row">{m.name}</th>
                  <td>{m.role}</td>
                  <td>
                    <MemberStatus m={m} today={lab.lab.today} handoff={h} />
                  </td>
                  <td>{on.length ? on.map((i) => i.short).join(', ') : <span className="muted">Other projects</span>}</td>
                  <td className="right">
                    {m.status !== 'active' && on.length > 0 && (
                      <a className="btn small" href={`#/handoff/${m.id}`}>
                        {h?.done ? 'View handoff' : m.status === 'leaving' ? 'Start handoff' : 'Recover records'}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

// What's coming in from members and what's due, so the PI sees the lab at a glance.
function LabPulse({ lab, files, state }) {
  const today = lab.lab.today;
  const activity = recentActivity(files, 6);
  const due = allDeadlines(state)
    .filter((d) => !d.done && daysBetween(today, d.date) <= 30)
    .slice(0, 5);
  const next = allMeetings(state).find((m) => m.date >= today);
  const name = (id) => lab.members.find((m) => m.id === id)?.name ?? 'Someone';

  return (
    <div className="two-col even block">
      <section className="card" aria-labelledby="in-h">
        <h2 id="in-h">Coming in from the lab</h2>
        {activity.length === 0 ? (
          <p className="muted">
            Nothing logged in Rheo yet this week. When members log work, add notebook pages or upload slides, it shows up
            here and in the invention records. Try it: switch "Signed in as" to Tom Brandt.
          </p>
        ) : (
          <ul className="feed">
            {activity.map((f) => (
              <li key={f.id}>
                {f.thumb ? <img src={f.thumb} alt="" /> : <span className={`feed-dot k-${f.kind}`} aria-hidden="true" />}
                <div>
                  <span>
                    <a href={`#/people/${f.owner}`}>{name(f.owner)}</a>{' '}
                    {f.kind === 'scan' ? 'added a notebook page' : f.kind === 'slides' ? 'uploaded lab meeting slides' : 'logged'}: {f.name}
                  </span>
                  <span className="muted small stack">
                    {formatDate(f.date)}
                    {f.invention ? `, ${lab.inventions.find((i) => i.id === f.invention)?.short}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card" aria-labelledby="due-h">
        <h2 id="due-h">Due in the next 30 days</h2>
        <ul className="mini-list">
          {due.map((d) => (
            <li key={d.id}>
              <DueDate date={d.date} today={today} />
              <div>
                <span>{d.title}</span>
                <span className="muted small stack">{DEADLINE_TYPES[d.type]}</span>
              </div>
            </li>
          ))}
        </ul>
        {next && (
          <p className="small next-meeting">
            Next lab meeting {formatDate(next.date, { weekday: 'long', month: 'short', day: 'numeric' })}: {name(next.presenter)},{' '}
            {next.topic.toLowerCase()}.{' '}
            <span className={slidesFor(next, state) ? 'muted' : 'warn-text'}>
              {slidesFor(next, state) ? 'Slides are in.' : 'No slides yet.'}
            </span>
          </p>
        )}
        <a className="small" href="#/deadlines">
          All deadlines
        </a>
      </section>
    </div>
  );
}

// A short path through the demo for someone opening it for the first time, such as a grader.
function DemoGuide({ lab, records, state, dispatch }) {
  if (state.guideHidden) return null;
  const inv = lab.inventions[0];
  const leaving = lab.members.find((m) => m.status === 'leaving');
  const steps = [
    {
      done: state.digestDone,
      href: '#/digest',
      label: "Clear this week's digest",
      note: 'Twelve matches. Two are wrong: catch them.',
    },
    {
      done: !!state.handoffs[leaving.id]?.done,
      href: `#/handoff/${leaving.id}`,
      label: `Hand off ${leaving.name.split(' ')[0]}'s work`,
      note: `Four steps before ${formatDate(leaving.end, { month: 'short', day: 'numeric' })}.`,
    },
    {
      done: records[inv.id].score === 100,
      href: `#/invention/${inv.id}`,
      label: `Get the ${inv.short} to 100`,
      note: 'Work through its open items.',
    },
    {
      done: !!state.exported[inv.id],
      href: `#/invention/${inv.id}`,
      label: 'Export the disclosure package',
      note: 'What Yale Ventures receives.',
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="guide" aria-labelledby="guide-h">
      <div className="guide-head">
        <h2 id="guide-h">Try it in about five minutes</h2>
        <button className="link small" onClick={() => dispatch({ type: 'guide', hidden: true })}>
          Hide
        </button>
      </div>
      <p className="muted">
        You are {lab.lab.pi}, the PI. {doneCount === steps.length ? 'All done. ' : ''}
        <span className="tnum">
          {doneCount} of {steps.length}
        </span>{' '}
        done.
      </p>
      <ol className="guide-steps">
        {steps.map((s) => (
          <li key={s.label} className={s.done ? 'done' : ''}>
            <StatusIcon status={s.done ? 'done' : 'gap'} />
            <div>
              <a href={s.href}>{s.label}</a>
              <span className="muted small stack">{s.note}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MemberStatus({ m, today, handoff }) {
  if (m.status === 'active') return <span className="pill">In the lab</span>;
  if (m.status === 'leaving')
    return (
      <span className={`pill ${handoff?.done ? 'ok' : 'warn'}`}>
        {handoff?.done ? 'Handed off' : `Leaves in ${daysBetween(today, m.end)} days`}
      </span>
    );
  return (
    <span className="pill gone">
      Left {formatDate(m.end, { month: 'short', year: 'numeric' })}
      {handoff?.done ? ', recovered' : ', no handoff'}
    </span>
  );
}
