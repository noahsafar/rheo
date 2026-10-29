import { useState } from 'react';
import { daysBetween } from '../lib/record.js';
import { DEADLINE_TYPES } from '../data/workspace.js';
import { allDeadlines, isPI, newId } from '../lib/workspace.js';
import { DueDate } from './MyWork.jsx';

export default function Deadlines({ lab, state, dispatch, viewer }) {
  const pi = isPI(viewer.id);
  const [type, setType] = useState('all');
  const [adding, setAdding] = useState(false);
  const today = lab.lab.today;
  const mine = allDeadlines(state).filter((d) => pi || d.owners.includes(viewer.id));
  const shown = mine.filter((d) => type === 'all' || d.type === type);
  const open = shown.filter((d) => !d.done);
  const groups = [
    ['Overdue', open.filter((d) => d.date < today)],
    ['Next two weeks', open.filter((d) => d.date >= today && daysBetween(today, d.date) <= 14)],
    ['Later', open.filter((d) => daysBetween(today, d.date) > 14)],
    ['Done', shown.filter((d) => d.done)],
  ];
  const types = [...new Set(mine.map((d) => d.type))];

  return (
    <div className="page narrow">
      <section className="page-head with-action">
        <div>
          <h1>{pi ? 'Deadlines' : 'My deadlines'}</h1>
          <p className="lede">
            {pi
              ? 'Grant reports, Yale Ventures disclosures, compliance renewals and lab milestones in one list. Members see the ones assigned to them.'
              : 'Everything assigned to you. The PI sees the whole lab list.'}
          </p>
        </div>
        {pi && (
          <button className="btn primary" onClick={() => setAdding(!adding)} aria-expanded={adding}>
            Add a deadline
          </button>
        )}
      </section>

      {pi && adding && <AddDeadline lab={lab} today={today} dispatch={dispatch} onDone={() => setAdding(false)} />}

      {types.length > 1 && (
        <div role="tablist" aria-label="Filter by type" className="seg-control">
          <button role="tab" aria-selected={type === 'all'} onClick={() => setType('all')}>
            All
          </button>
          {types.map((t) => (
            <button key={t} role="tab" aria-selected={type === t} onClick={() => setType(t)}>
              {DEADLINE_TYPES[t]}
            </button>
          ))}
        </div>
      )}

      {mine.length === 0 && <p className="empty muted">Nothing assigned to you right now.</p>}

      {groups.map(([label, list]) =>
        list.length ? (
          <section key={label} className="block tight" aria-label={label}>
            <h2>
              {label} <span className="muted tnum">{list.length}</span>
            </h2>
            <ul className="deadline-list">
              {list.map((d) => (
                <Deadline key={d.id} d={d} lab={lab} dispatch={dispatch} viewer={viewer} />
              ))}
            </ul>
          </section>
        ) : null
      )}
    </div>
  );
}

function Deadline({ d, lab, dispatch, viewer }) {
  const pi = isPI(viewer.id);
  const inv = lab.inventions.find((i) => i.id === d.invention);
  const owners = d.owners.map((id) => lab.members.find((m) => m.id === id)?.name.split(' ')[0]).filter(Boolean);
  const canTick = pi || d.owners.includes(viewer.id);

  let shortcut = null;
  if (pi && d.action === 'disclosure') shortcut = <a className="btn small" href="#/funding">Review package</a>;
  if (pi && d.action === 'report') shortcut = <a className="btn small" href="#/funding">Build report</a>;
  if (pi && d.action === 'handoff') shortcut = <a className="btn small" href={`#/handoff/${d.member}`}>Open handoff</a>;
  if (d.meeting && d.owners.includes(viewer.id)) shortcut = <a className="btn small" href="#/meetings">Upload slides</a>;

  return (
    <li className={`deadline ${d.done ? 'done' : ''} type-${d.type}`}>
      <DueDate date={d.date} today={lab.lab.today} />
      <div className="deadline-main">
        <p>
          <strong>{d.title}</strong>
        </p>
        <p className="muted small">
          {DEADLINE_TYPES[d.type]}
          {inv ? `, ${inv.short}` : ''}
          {pi && owners.length ? `. ${owners.join(' and ')}` : ''}
        </p>
        {d.type === 'public' && !d.done && (
          <p className="hint small">
            Tell Yale Ventures before submitting. Making the work public before a patent filing can cost patent rights
            outside the US.
          </p>
        )}
      </div>
      <div className="deadline-act">
        {!d.done && shortcut}
        {canTick && (
          <label className="check compact-check">
            <input type="checkbox" checked={d.done} onChange={(e) => dispatch({ type: 'deadlineDone', id: d.id, value: e.target.checked })} />
            <span className="small">Done</span>
          </label>
        )}
      </div>
    </li>
  );
}

function AddDeadline({ lab, today, dispatch, onDone }) {
  const people = lab.members.filter((m) => m.status !== 'left');
  const [f, setF] = useState({ title: '', date: today, type: 'funding', owners: [people[0].id], invention: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="card add-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.title.trim() || !f.owners.length) return;
          dispatch({ type: 'addDeadline', deadline: { ...f, id: newId('d'), title: f.title.trim(), invention: f.invention || null } });
          onDone();
        }}
      >
        <label className="field">
          <span>What's due</span>
          <input value={f.title} onChange={set('title')} placeholder="Blavatnik Fund application" required />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Due</span>
            <input type="date" value={f.date} onChange={set('date')} />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={f.type} onChange={set('type')}>
              {Object.entries(DEADLINE_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Project</span>
            <select value={f.invention} onChange={set('invention')}>
              <option value="">None</option>
              {lab.inventions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.short}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="field">
          <legend className="field-legend">Assigned to</legend>
          <div className="owner-pick">
            {people.map((m) => (
              <label key={m.id} className="check">
                <input
                  type="checkbox"
                  checked={f.owners.includes(m.id)}
                  onChange={(e) => setF({ ...f, owners: e.target.checked ? [...f.owners, m.id] : f.owners.filter((x) => x !== m.id) })}
                />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="form-foot">
          <button type="button" className="btn quiet" onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!f.title.trim() || !f.owners.length}>
            Add deadline
          </button>
        </div>
      </form>
    </section>
  );
}
