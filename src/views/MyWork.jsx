import { useMemo, useState } from 'react';
import RecordRow from '../components/RecordRow.jsx';
import { formatDate, daysBetween } from '../lib/record.js';
import { LOG_TYPES, DEADLINE_TYPES } from '../data/workspace.js';
import { allDeadlines, allMeetings, slidesFor, connectionsFor, newId } from '../lib/workspace.js';
import { MemberStatus } from './Lab.jsx';

// A member's workspace. Members only ever see their own; the PI can open anyone's from People.
export default function MyWork({ lab, files, state, dispatch, viewer, subject }) {
  const own = viewer.id === subject.id;
  const first = subject.name.split(' ')[0];
  const mine = useMemo(() => files.filter((f) => f.owner === subject.id), [files, subject.id]);
  const onInventions = lab.inventions.filter((i) => i.contributors.some((c) => c.member === subject.id));
  const toConfirm = mine
    .filter((f) => f.match === 'suggested' && f.invention)
    .sort((a, b) => b.confidence - a.confidence);
  const deadlines = allDeadlines(state).filter((d) => d.owners.includes(subject.id) && !d.done);
  const meetings = allMeetings(state).filter((m) => m.presenter === subject.id && m.date >= lab.lab.today);
  const conn = connectionsFor(state, subject.id);
  const pages = mine.filter((f) => f.kind === 'scan');

  return (
    <div className="page">
      <section className="page-head">
        {!own && (
          <p className="crumb">
            <a href="#/people">People</a> / {subject.name}
          </p>
        )}
        <h1>{own ? `${first}'s work` : subject.name}</h1>
        <p className="lede">
          {subject.role}
          {onInventions.length ? `, working on ${onInventions.map((i) => i.short).join(' and ')}` : ''}.{' '}
          {own
            ? 'Log what you do here and it goes straight into the lab record. Only you and the PI can see this page.'
            : `Everything ${first} has added or Rheo has matched to them. ${first} sees this same page, minus anything from other people.`}
        </p>
        {!own && <MemberStatus m={subject} today={lab.lab.today} handoff={state.handoffs[subject.id]} />}
      </section>

      <div className="work-grid">
        <div className="work-main">
          {own ? (
            <LogForm lab={lab} subject={subject} onInventions={onInventions} dispatch={dispatch} />
          ) : (
            <Contribution lab={lab} subject={subject} mine={mine} onInventions={onInventions} />
          )}

          {toConfirm.length > 0 && (
            <section className="card" aria-labelledby="confirm-h">
              <div className="card-head">
                <h2 id="confirm-h">
                  {own ? 'Is this yours?' : `Waiting for ${first} to confirm`}{' '}
                  <span className="count">{toConfirm.length}</span>
                </h2>
                {own && toConfirm.length > 1 && (
                  <button
                    className="btn small"
                    onClick={() =>
                      dispatch({ type: 'match', ids: toConfirm.filter((f) => f.confidence >= 0.85).map((f) => f.id), value: 'confirmed' })
                    }
                  >
                    Confirm strong matches
                  </button>
                )}
              </div>
              <p className="muted">
                {own
                  ? "Rheo matched these files of yours to an invention. You know best whether they belong."
                  : `Rheo matched these to ${first}'s work. ${first} confirms them from their own page.`}
              </p>
              <ul className="records compact">
                {toConfirm.slice(0, own ? 6 : 4).map((f) =>
                  own ? (
                    <RecordRow key={f.id} f={f} lab={lab} dispatch={dispatch} showInvention />
                  ) : (
                    <RecordRow key={f.id} f={{ ...f, match: 'pending-view' }} lab={lab} dispatch={() => {}} showInvention />
                  )
                )}
              </ul>
              {toConfirm.length > 6 && own && <p className="muted small">{toConfirm.length - 6} more after these.</p>}
            </section>
          )}

          <MyRecords lab={lab} mine={mine} dispatch={dispatch} own={own} />
        </div>

        <aside className="work-side" aria-label={`${first}'s schedule and sources`}>
          <section className="card">
            <h2>{own ? 'My deadlines' : 'Deadlines'}</h2>
            {deadlines.length === 0 ? (
              <p className="muted">Nothing due.</p>
            ) : (
              <ul className="mini-list">
                {deadlines.slice(0, 4).map((d) => (
                  <li key={d.id}>
                    <DueDate date={d.date} today={lab.lab.today} />
                    <div>
                      <span>{d.title}</span>
                      <span className="muted small stack">{DEADLINE_TYPES[d.type]}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <a className="small" href="#/deadlines">
              {own ? 'All my deadlines' : 'All deadlines'}
            </a>
          </section>

          <section className="card">
            <h2>Lab meetings</h2>
            {meetings.length === 0 ? (
              <p className="muted">No upcoming presentations.</p>
            ) : (
              <ul className="mini-list">
                {meetings.slice(0, 3).map((m) => (
                  <li key={m.id}>
                    <DueDate date={m.date} today={lab.lab.today} />
                    <div>
                      <span>{m.topic}</span>
                      <span className={`small stack ${slidesFor(m, state) ? 'muted' : 'warn-text'}`}>
                        {slidesFor(m, state) ? 'Slides uploaded' : 'Slides not uploaded'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <a className="small" href="#/meetings">
              Lab meeting schedule
            </a>
          </section>

          <section className="card">
            <h2>{own ? 'My sources' : 'Sources'}</h2>
            <ul className="mini-list plain">
              <li>
                <span>Google Drive</span>
                <span className={`small ${conn.gdrive?.length ? 'muted' : 'warn-text'}`}>
                  {conn.gdrive?.length ? `${conn.gdrive.length} folders shared` : 'Not connected'}
                </span>
              </li>
              <li>
                <span>Notebook pages</span>
                <span className="small muted">{pages.length} photographed</span>
              </li>
              <li>
                <span>Lab OneDrive, Teams, Outlook, LabArchives</span>
                <span className="small muted">Connected by the lab</span>
              </li>
            </ul>
            {own ? (
              <a className="btn small" href="#/sources">
                Manage my sources
              </a>
            ) : (
              !conn.gdrive?.length &&
              subject.status !== 'left' && (
                <p className="muted small">
                  {first}'s own Drive isn't connected, so files there stay invisible to the lab record.
                </p>
              )
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function DueDate({ date, today }) {
  const d = daysBetween(today, date);
  const cls = d < 0 ? 'past' : d <= 7 ? 'soon' : '';
  return (
    <span className={`due ${cls}`}>
      <span className="due-m">{formatDate(date, { month: 'short' })}</span>
      <span className="due-d tnum">{formatDate(date, { day: 'numeric' })}</span>
    </span>
  );
}

function LogForm({ lab, subject, onInventions, dispatch }) {
  const blank = { title: '', body: '', date: lab.lab.today, invention: onInventions[0]?.id || '', type: 'experiment', attachment: '' };
  const [f, setF] = useState(blank);
  const [saved, setSaved] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return;
    const entry = { ...f, id: newId('log'), owner: subject.id, created: new Date().toISOString(), title: f.title.trim() };
    dispatch({ type: 'addLog', entry });
    const inv = lab.inventions.find((i) => i.id === f.invention);
    setSaved(inv ? `Added to the ${inv.short} record.` : 'Added to your lab record.');
    setF({ ...blank, invention: f.invention });
  };

  return (
    <section className="card log-card" aria-labelledby="log-h">
      <h2 id="log-h">Log work</h2>
      <form onSubmit={submit} className="log-form">
        <label className="field">
          <span>What did you do?</span>
          <input value={f.title} onChange={set('title')} placeholder="Ran release assay on batch 14, day 21" required />
        </label>
        <fieldset className="type-pick">
          <legend className="sr-only">Type of entry</legend>
          {LOG_TYPES.map((t) => (
            <label key={t.id} className={f.type === t.id ? 'on' : ''}>
              <input type="radio" name="type" value={t.id} checked={f.type === t.id} onChange={set('type')} />
              {t.label}
            </label>
          ))}
        </fieldset>
        {f.type === 'idea' && (
          <p className="hint small">A dated idea with your name on it can become the record of conception for a patent.</p>
        )}
        <label className="field">
          <span>Details (optional)</span>
          <textarea rows={3} value={f.body} onChange={set('body')} placeholder="Results, what changed, what's next" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={f.date} max={lab.lab.today} onChange={set('date')} />
          </label>
          <label className="field">
            <span>Project</span>
            <select value={f.invention} onChange={set('invention')}>
              {onInventions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.short}
                </option>
              ))}
              <option value="">Other lab work</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Attach a file (optional)</span>
          <input
            type="file"
            onChange={(e) => setF({ ...f, attachment: e.target.files?.[0]?.name || '' })}
          />
          <span className="muted small">Saved to the lab OneDrive, not your own account, so it stays when you leave.</span>
        </label>
        <div className="form-foot">
          <span className="muted small" aria-live="polite">
            {saved}
          </span>
          <button className="btn primary" type="submit" disabled={!f.title.trim()}>
            Add to record
          </button>
        </div>
      </form>
    </section>
  );
}

function Contribution({ lab, subject, mine, onInventions }) {
  return (
    <section className="card" aria-labelledby="contrib-h">
      <h2 id="contrib-h">Contribution</h2>
      {onInventions.length === 0 ? (
        <p className="muted">Not on an invention yet. Work they log under "Other lab work" still goes into the lab record.</p>
      ) : (
        <ul className="contrib-list">
          {onInventions.map((i) => {
            const recs = mine.filter((f) => f.invention === i.id);
            const c = i.contributors.find((c) => c.member === subject.id);
            const conf = recs.filter((f) => f.match === 'confirmed').length;
            return (
              <li key={i.id}>
                <a href={`#/invention/${i.id}`}>{i.short}</a>
                <span>{c.roles.join(', ')}</span>
                <span className="tnum muted">
                  {conf} confirmed, {recs.length - conf} to review
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="muted small">
        {mine.filter((f) => f.logged).length} entries added in Rheo, {mine.filter((f) => !f.logged).length} found in
        connected tools.
      </p>
    </section>
  );
}

const FILTERS = [
  { id: 'all', label: 'All', test: (f) => f.match !== 'rejected' },
  { id: 'logged', label: 'Added in Rheo', test: (f) => f.logged },
  { id: 'scan', label: 'Notebook pages', test: (f) => f.kind === 'scan' },
  { id: 'found', label: 'Found in lab tools', test: (f) => !f.logged && f.match !== 'rejected' },
];

function MyRecords({ lab, mine, dispatch, own }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(15);
  const list = useMemo(() => {
    const t = FILTERS.find((x) => x.id === filter).test;
    const needle = q.trim().toLowerCase();
    return mine
      .filter(t)
      .filter((f) => !needle || f.name.toLowerCase().includes(needle))
      .sort((a, b) => ((b.created || b.date) > (a.created || a.date) ? 1 : -1));
  }, [mine, filter, q]);

  const remove = (f) => dispatch({ type: f.kind === 'scan' ? 'removePage' : 'removeLog', id: f.id });

  return (
    <section aria-labelledby="mine-h" className="block tight">
      <h2 id="mine-h">{own ? 'My records' : 'Records'}</h2>
      <div className="filters">
        <div role="tablist" aria-label="Filter records" className="seg-control">
          {FILTERS.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={filter === x.id}
              onClick={() => {
                setFilter(x.id);
                setLimit(15);
              }}
            >
              {x.label} <span className="tnum muted">{mine.filter(x.test).length}</span>
            </button>
          ))}
        </div>
        <label className="search">
          <span className="sr-only">Search records</span>
          <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {list.length === 0 ? (
        <p className="empty muted">
          {filter === 'scan'
            ? own
              ? 'No notebook pages yet. Photograph one from My sources.'
              : 'No notebook pages yet.'
            : filter === 'logged'
              ? own
                ? 'Nothing logged yet. Use Log work above.'
                : 'Nothing logged in Rheo yet.'
              : 'No records match.'}
        </p>
      ) : (
        <ul className="records">
          {list.slice(0, limit).map((f) =>
            f.match === 'suggested' && !own ? (
              <RecordRow key={f.id} f={{ ...f, match: 'pending-view' }} lab={lab} dispatch={() => {}} showInvention />
            ) : (
              <RecordRow key={f.id} f={f} lab={lab} dispatch={dispatch} showInvention onRemove={own ? remove : undefined} />
            )
          )}
        </ul>
      )}
      {list.length > limit && (
        <button className="btn quiet" onClick={() => setLimit(limit + 30)}>
          Show more ({list.length - limit} left)
        </button>
      )}
    </section>
  );
}
