import { useState } from 'react';
import { formatDate, daysBetween } from '../lib/record.js';
import { MemberStatus } from './Lab.jsx';
import RecordRow from '../components/RecordRow.jsx';
import { StatusIcon } from '../components/Readiness.jsx';

export default function Handoff(props) {
  const { lab, memberId } = props;
  const member = lab.members.find((m) => m.id === memberId);
  return member ? <HandoffFor {...props} member={member} /> : <HandoffList {...props} />;
}

function HandoffList({ lab, state }) {
  const people = lab.members.filter(
    (m) => m.status !== 'active' && lab.inventions.some((i) => i.contributors.some((c) => c.member === m.id))
  );
  return (
    <div className="page narrow">
      <section className="page-head">
        <p className="crumb">
          <a href="#/lab">{lab.lab.name}</a> / Handoffs
        </p>
        <h1>Handoffs</h1>
        <p className="lede">
          When someone leaves, Rheo walks them through moving their records into lab storage, confirming what they
          worked on and leaving a note on what's unfinished. For people who already left, it shows what can still be
          recovered.
        </p>
      </section>
      <ul className="people-list">
        {people.map((m) => (
          <li key={m.id}>
            <div>
              <strong>{m.name}</strong>
              <span className="muted small stack">
                {m.role}. {m.leavingNote || m.leftNote}
              </span>
            </div>
            <MemberStatus m={m} today={lab.lab.today} handoff={state.handoffs[m.id]} />
            <a className="btn small" href={`#/handoff/${m.id}`}>
              Open
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HandoffFor({ lab, files, member, state, dispatch }) {
  const leaving = member.status === 'leaving';
  const h = state.handoffs[member.id] || {};
  const [note, setNote] = useState(h.note || '');
  const [reviewed, setReviewed] = useState(!!h.done);

  const theirs = files.filter((f) => f.owner === member.id && f.invention && f.match !== 'rejected');
  const outside = theirs.filter((f) => !f.reachable || f.atRisk || f.personalStorage);
  const pending = theirs.filter((f) => f.match === 'suggested');
  const invs = lab.inventions
    .map((i) => {
      const c = i.contributors.find((c) => c.member === member.id);
      if (!c) return null;
      const recs = theirs.filter((f) => f.invention === i.id);
      return { inv: i, roles: c.roles, confirmed: recs.filter((f) => f.match === 'confirmed').length, total: recs.length };
    })
    .filter(Boolean);

  const steps = [
    { id: 'move', done: outside.length === 0 },
    { id: 'confirm', done: pending.length === 0 },
    { id: 'note', done: note.trim().length > 10 },
    { id: 'review', done: reviewed },
  ];
  const allDone = steps.every((s) => s.done);
  const first = member.name.split(' ')[0];

  return (
    <div className="page narrow">
      <section className="page-head">
        <p className="crumb">
          <a href="#/lab">{lab.lab.name}</a> / <a href="#/handoff">Handoffs</a> / {member.name}
        </p>
        <h1>{leaving ? `Hand off ${first}'s work` : `Recover ${first}'s records`}</h1>
        <p className="lede">
          {member.role}.{' '}
          {leaving
            ? `${member.leavingNote}. Last day ${formatDate(member.end)}, in ${daysBetween(lab.lab.today, member.end)} days.`
            : `${member.leftNote}. Left ${formatDate(member.end)}, ${daysBetween(member.end, lab.lab.today)} days ago, without a handoff.`}
        </p>
        {h.done && <p className="pill ok">Handoff completed {formatDate(h.date)}</p>}
      </section>

      <ol className="handoff-steps">
        <Step n={1} done={steps[0].done} title={leaving ? 'Move records into lab storage' : 'Get back records stored outside the lab'}>
          {outside.length === 0 ? (
            <p className="muted">All of {first}'s records are in lab storage.</p>
          ) : (
            <>
              <p className="muted">
                {outside.length} records are on {outside[0].location}.{' '}
                {leaving ? 'Copy them now, while the account is active.' : `Rheo can't reach them until ${first} shares them.`}
              </p>
              <button className="btn small" onClick={() => dispatch({ type: 'move', ids: outside.map((f) => f.id) })}>
                {leaving ? `Copy ${outside.length} records to lab storage` : `Mark ${outside.length} records as received`}
              </button>
            </>
          )}
        </Step>

        <Step n={2} done={steps[1].done} title={`Confirm what ${first} worked on`}>
          {pending.length === 0 ? (
            <p className="muted">Nothing left to confirm.</p>
          ) : (
            <>
              <p className="muted">
                Rheo matched {pending.length} more of {first}'s records to an invention. {leaving ? `${first} knows best which belong, so confirm these together.` : 'Confirm the ones that belong.'}
              </p>
              <button className="btn small" onClick={() => dispatch({ type: 'match', ids: pending.map((f) => f.id), value: 'confirmed' })}>
                Confirm all {pending.length}
              </button>
              <ul className="records compact">
                {pending.slice(0, 5).map((f) => (
                  <RecordRow key={f.id} f={f} lab={lab} dispatch={dispatch} showInvention />
                ))}
              </ul>
              {pending.length > 5 && <p className="muted small">and {pending.length - 5} more</p>}
            </>
          )}
        </Step>

        <Step n={3} done={steps[2].done} title="Note what's unfinished">
          <label className="field">
            <span>
              {leaving
                ? `In ${first}'s words: open experiments, where things are, what the next person needs to know.`
                : `What you know about ${first}'s unfinished work, and where anything on paper is kept.`}
            </span>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                member.id === 'm7'
                  ? 'Hana kept a paper notebook. Pages 18 to 26 cover the release assays. It is in the drawer under bench 3.'
                  : 'The in vivo knockdown study has two cohorts left. Raw data is in the lab folder under /invivo. Ask Carlos about the new siRNA lot.'
              }
            />
          </label>
        </Step>

        <Step n={4} done={steps[3].done} title="Review the contribution summary">
          <ul className="contrib">
            {invs.map((x) => (
              <li key={x.inv.id}>
                <a href={`#/invention/${x.inv.id}`}>{x.inv.short}</a>
                <span>{x.roles.join(', ')}</span>
                <span className="tnum muted">
                  {x.confirmed} of {x.total} records confirmed
                </span>
              </li>
            ))}
          </ul>
          <label className="check">
            <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
            <span>
              {leaving ? `Reviewed with ${first}` : 'Reviewed by the PI'}. This records contributions; it doesn't decide inventorship.
            </span>
          </label>
        </Step>
      </ol>

      <div className="panel-foot sticky">
        <span className="muted">
          {steps.filter((s) => s.done).length} of {steps.length} steps done
        </span>
        <button
          className="btn primary"
          disabled={!allDone}
          onClick={() => dispatch({ type: 'handoff', member: member.id, value: { done: true, note, date: lab.lab.today } })}
        >
          {h.done ? 'Update handoff' : 'Complete handoff'}
        </button>
      </div>
    </div>
  );
}

function Step({ n, done, title, children }) {
  return (
    <li className={`hstep ${done ? 'done' : ''}`}>
      <div className="hstep-head">
        <StatusIcon status={done ? 'done' : 'gap'} />
        <h2>
          <span className="sr-only">Step {n}: </span>
          {title}
        </h2>
      </div>
      <div className="hstep-body">{children}</div>
    </li>
  );
}
