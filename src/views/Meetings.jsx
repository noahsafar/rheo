import { useState } from 'react';
import { formatDate, daysBetween } from '../lib/record.js';
import { allMeetings, slidesFor, isPI, newId } from '../lib/workspace.js';
import { DueDate } from './MyWork.jsx';

export default function Meetings({ lab, state, dispatch, viewer }) {
  const pi = isPI(viewer.id);
  const [adding, setAdding] = useState(false);
  const all = allMeetings(state);
  const today = lab.lab.today;
  const upcoming = all.filter((m) => m.date >= today);
  const past = all.filter((m) => m.date < today).reverse();
  const visiblePast = pi ? past : past.filter((m) => m.presenter === viewer.id);
  const missing = upcoming.filter((m) => !slidesFor(m, state) && daysBetween(today, m.date) <= 14);
  const name = (id) => lab.members.find((m) => m.id === id)?.name ?? 'Someone';
  const latest = past.find((m) => slidesFor(m, state));

  return (
    <div className="page narrow">
      <section className="page-head with-action">
        <div>
          <h1>Lab meetings</h1>
          <p className="lede">
            Thursdays at 10. Slides go to the lab OneDrive and become a dated record of what was shown, which helps
            when Yale Ventures asks when a result first came up.
            {!pi && ' You see the schedule and your own slides.'}
          </p>
        </div>
        {pi && (
          <button className="btn" onClick={() => setAdding(!adding)} aria-expanded={adding}>
            Schedule a meeting
          </button>
        )}
      </section>

      {pi && adding && <AddMeeting lab={lab} today={today} dispatch={dispatch} onDone={() => setAdding(false)} />}

      {pi && (
        <div className="stat-row">
          <div>
            <span className="stat-n tnum">{missing.length}</span>
            <span className="muted small">decks missing in the next two weeks</span>
          </div>
          <div>
            <span className="stat-n tnum">{past.filter((m) => slidesFor(m, state)).length}</span>
            <span className="muted small">past decks on file</span>
          </div>
          {latest && (
            <div>
              <span className="small">Latest deck</span>
              <span className="muted small">
                {slidesFor(latest, state)}, {formatDate(latest.date, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      <section className="block tight" aria-labelledby="up-h">
        <h2 id="up-h">Coming up</h2>
        <ul className="meeting-list">
          {upcoming.map((m) => (
            <MeetingRow key={m.id} m={m} lab={lab} state={state} dispatch={dispatch} viewer={viewer} name={name} />
          ))}
        </ul>
      </section>

      <section className="block tight" aria-labelledby="past-h">
        <h2 id="past-h">{pi ? 'Past meetings' : 'My past presentations'}</h2>
        {visiblePast.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <ul className="meeting-list">
            {visiblePast.map((m) => (
              <MeetingRow key={m.id} m={m} lab={lab} state={state} dispatch={dispatch} viewer={viewer} name={name} past />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MeetingRow({ m, lab, state, dispatch, viewer, name, past = false }) {
  const pi = isPI(viewer.id);
  const mine = m.presenter === viewer.id;
  const slides = slidesFor(m, state);
  const inv = lab.inventions.find((i) => i.id === m.invention);
  const days = daysBetween(lab.lab.today, m.date);
  const [reminded, setReminded] = useState(false);

  let status;
  if (!pi && !mine) status = <span className="muted small">{name(m.presenter).split(' ')[0]} presents</span>;
  else if (slides) status = <span className="small">{slides}</span>;
  else status = <span className={`small ${days <= 7 ? 'warn-text' : 'muted'}`}>No slides yet</span>;

  return (
    <li className={`meeting ${mine ? 'mine' : ''}`}>
      <DueDate date={m.date} today={lab.lab.today} />
      <div className="meeting-main">
        <p>
          <strong>{m.topic}</strong>
        </p>
        <p className="muted small">
          {mine ? 'You' : name(m.presenter)}
          {inv && (pi || mine) ? `, ${inv.short}` : ''}
        </p>
        <p>{status}</p>
      </div>
      <div className="meeting-act">
        {mine && !past && (
          <label className="btn small">
            {slides ? 'Replace slides' : 'Upload slides'}
            <input
              type="file"
              accept=".ppt,.pptx,.key,.pdf,.odp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) dispatch({ type: 'slides', meeting: m.id, value: { name: f.name, created: new Date().toISOString() } });
                e.target.value = '';
              }}
            />
          </label>
        )}
        {pi && !mine && !slides && !past && (
          <button className="btn small quiet" onClick={() => setReminded(true)} disabled={reminded}>
            {reminded ? 'Reminder drafted' : `Remind ${name(m.presenter).split(' ')[0]}`}
          </button>
        )}
      </div>
    </li>
  );
}

function AddMeeting({ lab, today, dispatch, onDone }) {
  const people = lab.members.filter((m) => m.status !== 'left');
  const [f, setF] = useState({ date: today, presenter: people[1]?.id || people[0].id, topic: '', invention: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <section className="card add-card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.topic.trim()) return;
          dispatch({ type: 'addMeeting', meeting: { ...f, id: newId('lm'), topic: f.topic.trim(), invention: f.invention || null, slides: null } });
          onDone();
        }}
      >
        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={f.date} min={today} onChange={set('date')} />
          </label>
          <label className="field">
            <span>Presenter</span>
            <select value={f.presenter} onChange={set('presenter')}>
              {people.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Topic</span>
            <input value={f.topic} onChange={set('topic')} placeholder="Journal club: hydrogel review" required />
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
        <div className="form-foot">
          <button type="button" className="btn quiet" onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!f.topic.trim()}>
            Add to schedule
          </button>
        </div>
      </form>
    </section>
  );
}
