import { digest, formatDate, formatMonth, daysBetween } from '../lib/record.js';
import { StatusIcon } from '../components/Readiness.jsx';
import { allDeadlines, allMeetings, recentActivity, slidesFor } from '../lib/workspace.js';
import { DEADLINE_TYPES } from '../data/workspace.js';
import { DueDate } from './MyWork.jsx';

export default function Lab({ lab, files, records, state, dispatch }) {
  const weekly = digest(lab, files);
  const recs = lab.inventions.map((i) => records[i.id]);
  const first = lab.lab.pi.split(' ')[0];
  const todo = needsYou({ lab, files, records, state, weekly });

  return (
    <div className="page home">
      <section className="page-head">
        <h1>Welcome back, {first}</h1>
        <p className="lede">
          Rheo keeps your lab's records organized by invention, so you're ready whenever Yale Ventures or a funder asks.
        </p>
      </section>

      <a className="disclose-hero" href="#/disclose">
        <span>
          <strong>Have an idea worth protecting?</strong>
          <span className="stack">Tell Yale Ventures in about ten minutes. Rheo fills in most of it for you.</span>
        </span>
        <span className="btn primary big">Disclose an idea</span>
      </a>

      <DemoGuide lab={lab} records={records} state={state} dispatch={dispatch} />

      <section aria-labelledby="todo-h" className="block tight">
        <h2 id="todo-h">Needs you</h2>
        {todo.length === 0 ? (
          <p className="empty muted">Nothing right now. Rheo will let you know when something comes up.</p>
        ) : (
          <ul className="todo">
            {todo.map((x) => (
              <li key={x.id} className={x.urgent ? 'urgent' : ''}>
                <div>
                  <strong>{x.title}</strong>
                  <span className="muted stack">{x.note}</span>
                </div>
                <a className="btn" href={x.href}>
                  {x.action}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="inv-h" className="block tight">
        <div className="section-head">
          <h2 id="inv-h">Inventions</h2>
          <a className="small" href="#/inventions">
            See all
          </a>
        </div>
        <div className="inv-grid">
          {recs.map((r) => (
            <a key={r.inv.id} className="inv-card simple" href={`#/invention/${r.inv.id}`}>
              <h3>{r.name}</h3>
              <p className={`status-line ${state.sent[r.inv.id] ? 'ok' : ''}`}>
                {state.sent[r.inv.id]
                  ? `Sent to Yale Ventures ${formatDate(state.sent[r.inv.id])}`
                  : r.score >= 75
                    ? 'Ready to disclose'
                    : 'Still collecting records'}
              </p>
              <div className="mini-score">
                <span className="tnum">{r.score}</span>
                <span className="bar" aria-hidden="true">
                  <span style={{ width: `${r.score}%` }} />
                </span>
                <span className="muted small">ready</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <LabPulse lab={lab} files={files} state={state} />
    </div>
  );
}

// The few things only the PI can do this week, in plain words, each with one button.
function needsYou({ lab, files, records, state, weekly }) {
  const today = lab.lab.today;
  const out = [];
  const due = allDeadlines(state).filter((d) => d.action === 'disclosure' && !d.done && !state.sent[d.invention]);
  for (const d of due) {
    const days = daysBetween(today, d.date);
    out.push({
      id: d.id,
      urgent: days <= 21,
      title: `Send the ${records[d.invention]?.inv.short ?? 'invention'} to Yale Ventures`,
      note: `Due ${formatDate(d.date, { month: 'long', day: 'numeric' })}. About ten minutes.`,
      href: `#/disclose/${d.invention}`,
      action: state.disclosures[d.invention]?.step ? 'Continue' : 'Start',
    });
  }
  if (weekly.length && !state.digestDone)
    out.push({
      id: 'digest',
      title: `Check ${weekly.length} files Rheo matched this week`,
      note: 'Say yes or no to each one. About five minutes.',
      href: '#/digest',
      action: 'Check files',
    });
  for (const m of lab.members.filter((m) => m.status === 'leaving' && !state.handoffs[m.id]?.done)) {
    out.push({
      id: `leave-${m.id}`,
      urgent: daysBetween(today, m.end) <= 60,
      title: `${m.name} leaves ${formatDate(m.end, { month: 'long', day: 'numeric' })}`,
      note: 'Make sure their work stays with the lab.',
      href: `#/handoff/${m.id}`,
      action: 'Start handoff',
    });
  }
  const atRisk = files.filter((f) => f.atRisk);
  if (atRisk.length) {
    const owner = lab.members.find((m) => m.id === atRisk[0].owner);
    out.push({
      id: 'atrisk',
      urgent: true,
      title: `${owner.name.split(' ')[0]}'s old files will be deleted ${formatDate(owner.accountDeletion, { month: 'long', day: 'numeric' })}`,
      note: `${atRisk.length} design files for the ${records[atRisk[0].invention]?.inv.short ?? 'invention'}. One click copies them to the lab.`,
      href: `#/invention/${atRisk[0].invention}`,
      action: 'Save them',
    });
  }
  return out.slice(0, 5);
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
            here and in the invention records. Try it: use "See Rheo as" at the top to pick Tom Brandt.
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
      done: !!state.sent[inv.id],
      href: `#/disclose/${inv.id}`,
      label: 'Disclose it to Yale Ventures',
      note: 'Six plain questions. Rheo fills in most answers.',
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
