import { useMemo, useState } from 'react';
import EntryForm from '../components/EntryForm.jsx';
import { WorkTable } from '../components/WorkLog.jsx';
import { formatDate } from '../lib/record.js';
import {
  did,
  result,
  outcomeLabel,
  typeLabel,
  visibilityLabel,
  canSee,
  visibleEntries,
  similarityIndex,
  SIMILAR_MIN,
  invName,
} from '../lib/entries.js';

// One piece of work in full. The author can fill in what they skipped, change who sees it, or delete it.
export default function Entry({ lab, state, dispatch, viewer, pi, id }) {
  const entry = (state.logs || []).find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const all = useMemo(() => visibleEntries(state, viewer, pi), [state.logs, viewer.id, pi]);
  const similar = useMemo(() => {
    if (!entry) return [];
    const index = similarityIndex(all);
    return all
      .filter((e) => e.id !== entry.id && e.owner !== entry.owner)
      .map((e) => ({ e, score: index.cos(entry.id, e.id) }))
      .filter((x) => x.score >= SIMILAR_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.e);
  }, [all, entry]);

  const home = pi ? '#/lab' : '#/me';
  if (!canSee(entry, viewer, pi)) {
    return (
      <div className="page narrow">
        <section className="page-head">
          <h1>{entry ? "This entry isn't shared with you" : 'Entry not found'}</h1>
          <p className="lede">
            {entry
              ? 'Its author kept it to themselves or the head of the lab.'
              : 'It may have been deleted, or the demo was reset.'}
          </p>
          <p>
            <a className="btn primary" href="#/entries">
              See all entries
            </a>
          </p>
        </section>
      </div>
    );
  }

  const mine = entry.owner === viewer.id;
  const author = lab.members.find((m) => m.id === entry.owner);
  const inv = lab.inventions.find((i) => i.id === entry.invention);
  const myProjects = pi ? lab.inventions : lab.inventions.filter((i) => i.contributors.some((c) => c.member === viewer.id));
  const projectHref = inv ? (pi ? `#/invention/${inv.id}` : `#/project/${inv.id}`) : null;

  if (editing) {
    return (
      <div className="page narrow">
        <section className="page-head">
          <p className="crumb">
            <a href="#/entries">All entries</a> / Edit
          </p>
          <h1>Edit entry</h1>
        </section>
        <section className="card">
          <EntryForm
            lab={lab}
            viewer={viewer}
            inventions={myProjects}
            initial={entry}
            submitLabel="Save changes"
            onCancel={() => setEditing(false)}
            onSave={(e) => {
              dispatch({ type: 'updateLog', entry: e });
              setEditing(false);
            }}
          />
        </section>
      </div>
    );
  }

  const Row = ({ label, value, field }) => (
    <div className="entry-row">
      <dt>{label}</dt>
      <dd>
        {value ? (
          value
        ) : mine ? (
          <button className="link small" onClick={() => setEditing(true)} aria-label={`Add ${field}`}>
            Add
          </button>
        ) : (
          <span className="muted">Not added</span>
        )}
      </dd>
    </div>
  );

  return (
    <div className="page narrow">
      <section className="page-head with-action">
        <div>
          <p className="crumb">
            <a href={home}>Home</a> / {inv ? <a href={projectHref}>{inv.short}</a> : 'Other lab work'} /{' '}
            {formatDate(entry.date)}
          </p>
          <h1>{did(entry)}</h1>
          <p className="muted">
            {mine ? 'You' : author?.name}, {formatDate(entry.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {entry.outcome && (
              <>
                {' '}
                <span className={`oc-badge oc-${entry.outcome}`}>{outcomeLabel(entry.outcome)}</span>
              </>
            )}
          </p>
        </div>
        {mine && (
          <div className="head-actions">
            <button className="btn primary" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <dl className="entry-list">
          <Row label="What I did" value={did(entry)} field="what you did" />
          <Row label="Result" value={result(entry)} field="a result" />
          <Row label="Did it work?" value={outcomeLabel(entry.outcome)} field="whether it worked" />
          <Row label="Process used" value={entry.process} field="the process used" />
          <Row label="How long it took" value={entry.duration} field="how long it took" />
          <Row label="Type of work" value={typeLabel(entry.type)} field="a type" />
          <Row label="Project" value={inv ? <a href={projectHref}>{invName(state, inv)}</a> : 'Other lab work'} field="a project" />
          <Row label="Who can see this" value={mine ? visibilityLabel(entry, lab.lab.pi.split(' ')[0]).replace('the author', 'you') : visibilityLabel(entry, lab.lab.pi.split(' ')[0])} field="who can see this" />
          {entry.audio && (
            <div className="entry-row">
              <dt>Voice note</dt>
              <dd>
                <audio controls src={entry.audio} aria-label="Voice note" />
              </dd>
            </div>
          )}
        </dl>
        {mine && (
          <div className="form-foot">
            <span className="muted small">Added {formatDate((entry.created || entry.date).slice(0, 10))}.</span>
            <button
              className="link small danger"
              onClick={() => {
                if (confirm('Delete this entry? This cannot be undone.')) {
                  dispatch({ type: 'removeLog', id: entry.id });
                  window.location.hash = '/entries';
                }
              }}
            >
              Delete entry
            </button>
          </div>
        )}
      </section>

      <section className="block" aria-labelledby="sim-h">
        <h2 id="sim-h">Similar work in the lab</h2>
        {similar.length === 0 ? (
          <p className="empty muted">Nothing shared by others looks like this yet.</p>
        ) : (
          <WorkTable entries={similar} lab={lab} viewer={viewer} showWho showProject caption="Similar entries" />
        )}
      </section>
    </div>
  );
}
