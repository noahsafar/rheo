import { useState } from 'react';
import { formatDate } from '../lib/record.js';
import { connectionsFor, newId, isPI } from '../lib/workspace.js';
import { MemberStatus } from './Lab.jsx';
import { go } from '../App.jsx';

const ROLES = ['PhD student', 'Postdoctoral fellow', 'Research technician', 'Undergraduate researcher', 'Rotation student', 'Visiting researcher', 'Lab manager'];

export default function People({ lab, files, state, dispatch }) {
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(null);

  const rows = lab.members.map((m) => {
    const mine = files.filter((f) => f.owner === m.id && f.match !== 'rejected');
    const last = mine.reduce((d, f) => (f.date > d ? f.date : d), '');
    return {
      m,
      on: lab.inventions.filter((i) => i.contributors.some((c) => c.member === m.id)),
      count: mine.length,
      logged: mine.filter((f) => f.logged).length,
      pending: mine.filter((f) => f.match === 'suggested' && f.invention).length,
      drive: connectionsFor(state, m.id).gdrive?.length || 0,
      last,
    };
  });
  const active = rows.filter((r) => r.m.status !== 'left');
  const notConnected = active.filter((r) => !isPI(r.m.id) && r.drive === 0);

  return (
    <div className="page">
      <section className="page-head with-action">
        <div>
          <h1>People</h1>
          <p className="lede">
            Everyone in {lab.lab.name}, past and present, with everything they've added. Each person sees only their
            own page; you see all of them.
          </p>
        </div>
        <button className="btn primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>
          Add a lab member
        </button>
      </section>

      {justAdded && (
        <div className="callout static" role="status">
          <span>
            <strong>Invite sent to {justAdded.email}.</strong> When {justAdded.name.split(' ')[0]} signs in, they
            connect their Google Drive and start logging. (Demo: no email is sent.)
          </span>
          <button
            className="btn small"
            onClick={() => {
              dispatch({ type: 'viewer', id: justAdded.id });
              go('me');
            }}
          >
            Sign in as {justAdded.name.split(' ')[0]}
          </button>
        </div>
      )}

      {adding && (
        <AddMember
          lab={lab}
          onAdd={(member) => {
            dispatch({ type: 'addMember', member });
            setJustAdded(member);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {notConnected.length > 0 && (
        <p className="nudge">
          <strong>
            {notConnected.map((r) => r.m.name).join(', ')} {notConnected.length === 1 ? "hasn't" : "haven't"} connected
            Google Drive yet.
          </strong>{' '}
          Anything they keep there is invisible to the lab record until they do.
        </p>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Status</th>
              <th scope="col">Works on</th>
              <th scope="col">Google Drive</th>
              <th scope="col" className="num">Records</th>
              <th scope="col" className="num">To confirm</th>
              <th scope="col">Latest record</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.m.id} className={r.m.status === 'left' ? 'row-left' : ''}>
                <th scope="row">
                  <a href={`#/people/${r.m.id}`}>{r.m.name}</a>
                  <span className="muted small stack">{r.m.role}</span>
                </th>
                <td>
                  {r.m.invited ? <span className="pill warn">Invited</span> : <MemberStatus m={r.m} today={lab.lab.today} handoff={state.handoffs[r.m.id]} />}
                </td>
                <td>{r.on.length ? r.on.map((i) => i.short).join(', ') : <span className="muted">Other projects</span>}</td>
                <td>
                  {isPI(r.m.id) ? (
                    <span className="muted">Lab admin</span>
                  ) : r.m.status === 'left' ? (
                    <span className="muted">Account closed</span>
                  ) : r.drive ? (
                    `${r.drive} folders`
                  ) : (
                    <span className="warn-text">Not connected</span>
                  )}
                </td>
                <td className="num">{r.count}</td>
                <td className={`num ${r.pending ? '' : 'muted'}`}>{r.pending}</td>
                <td className="small">{r.last ? formatDate(r.last) : <span className="muted">Nothing yet</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddMember({ lab, onAdd, onCancel }) {
  const [f, setF] = useState({ name: '', email: '', role: ROLES[0], start: lab.lab.today, inventions: [] });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.name.trim().split(' ').length >= 2 && /\S+@\S+\.\S+/.test(f.email);

  return (
    <section className="card add-card" aria-labelledby="add-h">
      <h2 id="add-h">Add a lab member</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onAdd({
            id: newId('m'),
            name: f.name.trim(),
            email: f.email.trim(),
            role: f.role,
            start: f.start,
            end: null,
            status: 'active',
            invited: true,
            inventions: f.inventions,
          });
        }}
      >
        <div className="field-row">
          <label className="field">
            <span>Full name</span>
            <input value={f.name} onChange={set('name')} placeholder="Alex Rivera" required />
          </label>
          <label className="field">
            <span>Yale email</span>
            <input type="email" value={f.email} onChange={set('email')} placeholder="alex.rivera@yale.edu" required />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Role</span>
            <select value={f.role} onChange={set('role')}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Start date</span>
            <input type="date" value={f.start} onChange={set('start')} />
          </label>
        </div>
        <fieldset className="field">
          <legend className="field-legend">Working on</legend>
          {lab.inventions.map((i) => (
            <label key={i.id} className="check">
              <input
                type="checkbox"
                checked={f.inventions.includes(i.id)}
                onChange={(e) =>
                  setF({ ...f, inventions: e.target.checked ? [...f.inventions, i.id] : f.inventions.filter((x) => x !== i.id) })
                }
              />
              <span>{i.title}</span>
            </label>
          ))}
        </fieldset>
        <p className="muted small">
          They'll get an email to sign in with their NetID. They see only their own records, deadlines and lab meeting
          slots.
        </p>
        <div className="form-foot">
          <button type="button" className="btn quiet" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            Send invite
          </button>
        </div>
      </form>
    </section>
  );
}
