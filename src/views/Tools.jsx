import { useMemo, useState } from 'react';
import { formatDate } from '../lib/record.js';
import { allMeetings } from '../lib/workspace.js';
import { did, result, outcomeLabel, visibleEntries, invName, DATE_RANGES } from '../lib/entries.js';
import { WorkTable } from '../components/WorkLog.jsx';
import {
  TOOLS,
  slideOutline,
  downloadPptx,
  weeklyUpdate,
  methodsDraft,
  troubleshoot,
  projectTimeline,
  interpret,
  grantDraft,
} from '../lib/tools.js';
import { grants } from '../data/workspace.js';
import { PostToSlack } from './Slack.jsx';
import { JobsBody } from './Jobs.jsx';

const minusDays = (iso, n) => {
  const d = new Date(iso + 'T12:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const inRange = (e, days, today) => !days || e.date >= minusDays(today, days - 1);

// ---------- the section on the home page ----------
export function RheoDoesIt() {
  return (
    <section aria-labelledby="does-h" className="block tight">
      <div className="section-head">
        <h2 id="does-h">Rheo does it for you</h2>
      </div>
      <ul className="tool-grid">
        {TOOLS.map((t) => (
          <li key={t.id}>
            <a className={`tool-card ${t.id === 'ask' ? 'ask' : ''}`} href={t.href || `#/tools/${t.id}`}>
              <ToolIcon name={t.icon} />
              <strong>{t.title}</strong>
              <span className="muted small">{t.blurb}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- #/tools/<id> ----------
export default function Tools({ lab, state, dispatch, viewer, pi, toolId }) {
  const tool = TOOLS.find((t) => t.id === toolId);
  const home = pi ? '#/lab' : '#/me';
  if (!tool) {
    return (
      <div className="page">
        <section className="page-head">
          <p className="crumb">
            <a href={home}>Home</a> / Rheo does it for you
          </p>
          <h1>Rheo does it for you</h1>
        </section>
        <RheoDoesIt />
      </div>
    );
  }
  const ctx = { lab, state, dispatch, viewer, pi };
  return (
    <div className="page narrow-wide">
      <section className="page-head">
        <p className="crumb">
          <a href={home}>Home</a> / <a href="#/tools">Rheo does it for you</a> / {tool.title}
        </p>
        <h1>{tool.title}</h1>
        <p className="lede">{tool.blurb}</p>
      </section>
      <ToolBody id={tool.id} ctx={ctx} />
      <p className="other-tools muted small">
        Other things Rheo can do:{' '}
        {TOOLS.filter((t) => t.id !== tool.id).map((t, i, xs) => (
          <span key={t.id}>
            <a href={t.href || `#/tools/${t.id}`}>{t.title.toLowerCase()}</a>
            {i < xs.length - 1 ? ', ' : '.'}
          </span>
        ))}
      </p>
    </div>
  );
}

function ToolBody({ id, ctx, prefill }) {
  if (id === 'slides') return <Slides {...ctx} prefill={prefill} />;
  if (id === 'update') return <Update {...ctx} prefill={prefill} />;
  if (id === 'methods') return <Methods {...ctx} prefill={prefill} />;
  if (id === 'troubleshoot') return <Troubleshoot {...ctx} prefill={prefill} />;
  if (id === 'timeline') return <Timeline {...ctx} prefill={prefill} />;
  if (id === 'grant') return <Grant {...ctx} prefill={prefill} />;
  if (id === 'job') return <JobsBody {...ctx} />;
  return <Ask {...ctx} />;
}

export const useMine = (state, viewer, pi) =>
  useMemo(() => visibleEntries(state, viewer, pi).filter((e) => e.owner === viewer.id), [state.logs, viewer.id, pi]);

const myProjects = (lab, viewer, pi) =>
  pi ? lab.inventions : lab.inventions.filter((i) => i.contributors.some((c) => c.member === viewer.id));

// ---------- pick which entries ----------
function EntryPicker({ lab, state, entries, selected, setSelected, project, setProject, range, setRange, projects }) {
  const today = lab.lab.today;
  const days = range === 'any' ? null : Number(range);
  const shown = entries.filter((e) => (project === 'all' || (e.invention || '') === project) && inRange(e, days, today));
  const allOn = shown.length > 0 && shown.every((e) => selected.has(e.id));
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  return (
    <section className="card picker" aria-labelledby="pick-h">
      <div className="card-head">
        <h2 id="pick-h">
          Which entries? <span className="count">{selected.size}</span>
        </h2>
        <button
          type="button"
          className="link small"
          onClick={() => {
            const next = new Set(selected);
            for (const e of shown) allOn ? next.delete(e.id) : next.add(e.id);
            setSelected(next);
          }}
        >
          {allOn ? 'Unselect these' : 'Select all shown'}
        </button>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Project</span>
          <select value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">All my projects</option>
            {projects.map((i) => (
              <option key={i.id} value={i.id}>
                {i.short}
              </option>
            ))}
            <option value="">Other lab work</option>
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {DATE_RANGES.filter((r) => r.id !== 'custom').map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="empty muted">None of your entries match. Try a longer date range.</p>
      ) : (
        <ul className="pick-list">
          {shown.map((e) => (
            <li key={e.id}>
              <label className={selected.has(e.id) ? 'on' : ''}>
                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                <span className="pick-date tnum">{formatDate(e.date, { month: 'short', day: 'numeric' })}</span>
                <span className="pick-text">
                  {did(e)}
                  {(result(e) || e.outcome) && (
                    <span className="muted small stack">
                      {e.outcome ? `${outcomeLabel(e.outcome)}. ` : ''}
                      {result(e)}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function usePicker({ lab, state, viewer, pi, prefill, defaultDays = 14, filter = () => true }) {
  const mine = useMine(state, viewer, pi);
  const pool = mine.filter(filter);
  const [project, setProject] = useState(prefill?.invention ?? 'all');
  const [range, setRange] = useState(String(prefill?.days ? nearestRange(prefill.days) : defaultDays === null ? 'any' : nearestRange(defaultDays)));
  const [selected, setSelected] = useState(() => {
    const days = prefill?.days ?? defaultDays;
    const ids = pool
      .filter((e) => (!prefill?.invention || e.invention === prefill.invention) && inRange(e, days, lab.lab.today))
      .filter((e) => !prefill?.outcome || e.outcome === prefill.outcome)
      .map((e) => e.id);
    // Nothing recent? Start with the latest few so there is something to show.
    return new Set(ids.length ? ids : pool.slice(0, 6).map((e) => e.id));
  });
  const chosen = pool.filter((e) => selected.has(e.id));
  const picker = (
    <EntryPicker
      lab={lab}
      state={state}
      entries={pool}
      selected={selected}
      setSelected={setSelected}
      project={project}
      setProject={setProject}
      range={range}
      setRange={setRange}
      projects={myProjects(lab, viewer, pi)}
    />
  );
  return { chosen, picker, pool };
}
const nearestRange = (days) => (days <= 7 ? '7' : days <= 30 ? '30' : days <= 90 ? '90' : 'any');

// ---------- 1. slides ----------
function Slides({ lab, state, dispatch, viewer, pi, prefill }) {
  const today = lab.lab.today;
  const upcoming = allMeetings(state).filter((m) => m.presenter === viewer.id && m.date >= today);
  const [meetingId, setMeetingId] = useState(upcoming[0]?.id || '');
  const meeting = upcoming.find((m) => m.id === meetingId);
  const { chosen, picker } = usePicker({
    lab,
    state,
    viewer,
    pi,
    prefill: prefill || (upcoming[0]?.invention ? { invention: upcoming[0].invention, days: 30 } : null),
  });
  const outline = slideOutline({ lab, state, viewer, entries: chosen, meeting });
  const [busy, setBusy] = useState(false);
  const [attached, setAttached] = useState(null);
  const fileName = `Lab meeting ${meeting?.date || today} – ${viewer.name.split(' ').slice(-1)[0]}.pptx`;

  return (
    <>
      {upcoming.length > 0 && (
        <label className="field narrow-select">
          <span>For which lab meeting?</span>
          <select value={meetingId} onChange={(e) => setMeetingId(e.target.value)}>
            {upcoming.map((m) => (
              <option key={m.id} value={m.id}>
                {formatDate(m.date, { month: 'short', day: 'numeric' })}: {m.topic}
              </option>
            ))}
            <option value="">Not for a lab meeting</option>
          </select>
        </label>
      )}
      {picker}
      <section className="block" aria-labelledby="prev-h">
        <div className="section-head">
          <h2 id="prev-h">
            Preview <span className="count">{outline.slides.length} slides</span>
          </h2>
        </div>
        {chosen.length === 0 ? (
          <p className="empty muted">Pick at least one entry above.</p>
        ) : (
          <>
            <ol className="slide-grid">
              {outline.slides.map((s, i) => (
                <li key={i} className={`slide-thumb ${s.kind}`}>
                  <SlidePreview s={s} />
                </li>
              ))}
            </ol>
            <div className="tool-actions">
              <button
                className="btn primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await downloadPptx(outline, fileName);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Making slides…' : 'Download PowerPoint'}
              </button>
              {meeting && (
                <button
                  className="btn"
                  disabled={attached === meeting.id}
                  onClick={() => {
                    dispatch({ type: 'slides', meeting: meeting.id, value: { name: fileName, created: new Date().toISOString() } });
                    setAttached(meeting.id);
                  }}
                >
                  {attached === meeting.id ? `Attached to ${formatDate(meeting.date, { month: 'short', day: 'numeric' })}` : `Attach to the ${formatDate(meeting.date, { month: 'short', day: 'numeric' })} lab meeting`}
                </button>
              )}
              {chosen.length > 0 && (
                <PostToSlack
                  lab={lab}
                  state={state}
                  dispatch={dispatch}
                  viewer={viewer}
                  defaultChannel="marsh-lab"
                  text={`${meeting ? `Slides for the ${formatDate(meeting.date, { month: 'short', day: 'numeric' })} lab meeting` : 'Slides'}: ${outline.title} (${outline.slides.length} slides, from ${chosen.length} entries).`}
                  link="#/meetings"
                  linkLabel="Lab meeting schedule"
                />
              )}
              <span className="muted small">Opens in PowerPoint, Keynote or Google Slides. Add figures and next steps before you present.</span>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function SlidePreview({ s }) {
  if (s.kind === 'title')
    return (
      <div className="sp">
        <p className="sp-title">{s.title}</p>
        <p className="sp-sub">{s.subtitle}</p>
        <p className="sp-sub">{s.note}</p>
      </div>
    );
  return (
    <div className="sp">
      <p className="sp-title">{s.title}</p>
      {s.kind === 'entry' && (
        <>
          <p className="sp-sub">
            {s.subtitle}
            {s.outcome && <span className={`oc-badge oc-${s.outcome}`}>{outcomeLabel(s.outcome)}</span>}
          </p>
          <ul>
            {s.bullets.slice(0, 4).map(([k, v]) => (
              <li key={k}>
                <b>{k}</b> {v}
              </li>
            ))}
          </ul>
        </>
      )}
      {s.kind === 'summary' && (
        <div className="sp-cols">
          {s.columns.map(([h, items]) => (
            <div key={h}>
              <b>{h}</b>
              <ul>
                {(items.length ? items : ['Nothing yet']).slice(0, 4).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {s.kind === 'list' && (
        <ul>
          {(s.items.length ? s.items : [s.empty]).slice(0, 4).map((t, i) => (
            <li key={i} className={s.items.length ? '' : 'sp-empty'}>
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- text outputs (update, methods, timeline) ----------
export function Output({ text, fileName, mailto, note, slack }) {
  const [edited, setEdited] = useState(null);
  const [copied, setCopied] = useState(false);
  const value = edited ?? text;
  // Regenerate when the inputs change, unless the person already edited the text.
  const [last, setLast] = useState(text);
  if (text !== last) {
    setLast(text);
    setEdited(null);
  }
  return (
    <section className="block" aria-labelledby="out-h">
      <div className="section-head">
        <h2 id="out-h">Draft</h2>
        {edited !== null && (
          <button className="link small" onClick={() => setEdited(null)}>
            Start over from the entries
          </button>
        )}
      </div>
      <textarea className="tool-output" rows={Math.min(24, value.split('\n').length + 2)} value={value} onChange={(e) => setEdited(e.target.value)} aria-label="Draft text you can edit" />
      {note && <p className="muted small">{note}</p>}
      <div className="tool-actions">
        <button
          className="btn primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
            } catch {
              /* clipboard blocked: the text is still selectable */
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        {mailto && (
          <a className="btn" href={mailto(value)}>
            Open in email
          </a>
        )}
        <button
          className="btn"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([value], { type: 'text/plain' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download
        </button>
        {slack && <PostToSlack {...slack} text={value} />}
      </div>
    </section>
  );
}

// ---------- 2. weekly update ----------
function Update({ lab, state, dispatch, viewer, pi, prefill }) {
  const today = lab.lab.today;
  const [days, setDays] = useState(String(prefill?.days || 7));
  const mine = useMine(state, viewer, pi);
  const from = minusDays(today, Number(days) - 1);
  const entries = mine.filter((e) => e.date >= from && (!prefill?.invention || e.invention === prefill.invention));
  const text = weeklyUpdate({ lab, state, viewer, entries, from, to: today });
  const piMember = lab.members.find((m) => m.name === lab.lab.pi);
  return (
    <>
      <div className="field-row narrow-select">
        <label className="field">
          <span>Covering</span>
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">The last 7 days</option>
            <option value="14">The last 2 weeks</option>
            <option value="30">The last 30 days</option>
          </select>
        </label>
      </div>
      <p className="muted">
        Built from {entries.length} {entries.length === 1 ? 'entry' : 'entries'} you logged since {formatDate(from, { month: 'short', day: 'numeric' })}.
        {entries.length === 0 && ' Nothing logged in this range yet. Try a longer range.'}
      </p>
      <Output
        text={text}
        fileName={`update-${today}.txt`}
        mailto={
          !pi && piMember?.email
            ? (v) => {
                const [subject, ...body] = v.split('\n');
                return `mailto:${piMember.email}?subject=${encodeURIComponent(subject.replace(/^Subject:\s*/, ''))}&body=${encodeURIComponent(body.join('\n').trim())}`;
              }
            : null
        }
        slack={{ lab, state, dispatch, viewer }}
        note={`Fill in "Next week" before you send.${pi ? '' : ` Open in email starts a message to ${lab.lab.pi} in your email app; nothing is sent until you press send.`}`}
      />
    </>
  );
}

// ---------- 3. methods ----------
function Methods({ lab, state, viewer, pi, prefill }) {
  const { chosen, picker } = usePicker({ lab, state, viewer, pi, prefill, defaultDays: 90, filter: (e) => !!e.process });
  const { text } = methodsDraft({ lab, state, entries: chosen });
  return (
    <>
      <p className="muted">Only entries where you noted the process used are listed. Add a process to any entry and it shows up here.</p>
      {picker}
      <Output text={text} fileName="methods-draft.txt" note="Check reagents, amounts and instruments against your notebook. Rheo only knows what the entries say." />
    </>
  );
}

// ---------- 4. troubleshoot ----------
function Troubleshoot({ lab, state, viewer, pi }) {
  const all = useMemo(() => visibleEntries(state, viewer, pi), [state.logs, viewer.id, pi]);
  const mine = all.filter((e) => e.owner === viewer.id);
  const items = troubleshoot({ lab, viewer, mine, allVisible: all });
  if (items.length === 0)
    return <p className="empty muted">None of your entries are marked "Didn't work" or "Partly". When one is, Rheo looks for who in the lab got similar work to work.</p>;
  return (
    <ul className="trouble-list">
      {items.map(({ entry, helpers }) => (
        <li key={entry.id} className="card">
          <p className="trouble-head">
            <span className={`oc-badge oc-${entry.outcome}`}>{outcomeLabel(entry.outcome)}</span>{' '}
            <a href={`#/entry/${entry.id}`}>
              <strong>{did(entry)}</strong>
            </a>
            <span className="muted small stack">
              {formatDate(entry.date)}
              {result(entry) ? `. ${result(entry)}` : ''}
            </span>
          </p>
          {helpers.length === 0 ? (
            <p className="muted small">No similar work that worked yet. Ask at the next lab meeting, or add the process you used so Rheo can match it better.</p>
          ) : (
            <>
              <p className="small trouble-sub">Similar work that worked:</p>
              <ul className="helper-list">
                {helpers.map(({ entry: h, who }) => (
                  <li key={h.id}>
                    <a href={`#/entry/${h.id}`}>{did(h)}</a>
                    <span className="muted small stack">
                      {who}, {formatDate(h.date)}
                      {h.process ? `. How: ${h.process}` : ''}
                      {result(h) ? `. Result: ${result(h)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------- 5. timeline ----------
function Timeline({ lab, state, dispatch, viewer, pi, prefill }) {
  const projects = myProjects(lab, viewer, pi);
  const [invId, setInvId] = useState(prefill?.invention || projects[0]?.id || '');
  const [scope, setScope] = useState('mine');
  const [range, setRange] = useState(prefill?.days ? nearestRange(prefill.days) : 'any');
  const all = useMemo(() => visibleEntries(state, viewer, pi), [state.logs, viewer.id, pi]);
  const days = range === 'any' ? null : Number(range);
  const entries = all.filter(
    (e) => (e.invention || '') === invId && (scope === 'lab' || e.owner === viewer.id) && inRange(e, days, lab.lab.today)
  );
  const text = projectTimeline({ lab, state, entries, invId });
  return (
    <>
      <div className="field-row">
        <label className="field">
          <span>Project</span>
          <select value={invId} onChange={(e) => setInvId(e.target.value)}>
            {projects.map((i) => (
              <option key={i.id} value={i.id}>
                {invName(state, i)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Whose work</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="mine">Just mine</option>
            <option value="lab">Everything shared with me</option>
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {DATE_RANGES.filter((r) => r.id !== 'custom').map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Built from {entries.length} {entries.length === 1 ? 'entry' : 'entries'}.
      </p>
      <Output
        text={text}
        fileName={`timeline-${invId || 'other'}.txt`}
        slack={{ lab, state, dispatch, viewer, defaultChannel: invId === 'inv1' ? 'hydrogel' : invId === 'inv2' ? 'sweat-patch' : 'marsh-lab' }}
      />
    </>
  );
}

// ---------- before anything leaves the lab ----------
// Sending details of an undisclosed invention outside the lab can limit patent rights.
export function DisclosureWarning({ lab, state, invIds, what }) {
  const pending = lab.inventions.filter((i) => invIds.includes(i.id) && !state.sent?.[i.id]);
  if (!pending.length) return null;
  return (
    <div className="found warn">
      <p className="found-label">Check with Yale Ventures before you send this</p>
      <p>
        {pending.map((i) => i.short).join(' and ')} {pending.length > 1 ? "haven't" : "hasn't"} been disclosed to Yale Ventures yet.
        Details in {what} can count as sharing the invention publicly, which can limit patents. Keep it general, or{' '}
        <a href={`#/disclose/${pending[0].id}`}>disclose it first</a>.
      </p>
    </div>
  );
}

// ---------- grant: preliminary data ----------
function Grant({ lab, state, viewer, pi, prefill }) {
  const projects = myProjects(lab, viewer, pi);
  const [invId, setInvId] = useState(prefill?.invention || projects[0]?.id || '');
  const linked = grants.filter((g) => g.inventions.includes(invId));
  const [grantId, setGrantId] = useState('');
  const [scope, setScope] = useState('lab');
  const [range, setRange] = useState(prefill?.days ? nearestRange(prefill.days) : 'any');
  const all = useMemo(() => visibleEntries(state, viewer, pi), [state.logs, viewer.id, pi]);
  const days = range === 'any' ? null : Number(range);
  const entries = all.filter(
    (e) => (e.invention || '') === invId && (scope === 'lab' || e.owner === viewer.id) && inRange(e, days, lab.lab.today)
  );
  const grant = grants.find((g) => g.id === grantId);
  const { text } = grantDraft({ lab, state, entries, invId, grant });
  return (
    <>
      <div className="field-row">
        <label className="field">
          <span>Project</span>
          <select value={invId} onChange={(e) => { setInvId(e.target.value); setGrantId(''); }}>
            {projects.map((i) => (
              <option key={i.id} value={i.id}>
                {invName(state, i)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Builds on a current grant? (optional)</span>
          <select value={grantId} onChange={(e) => setGrantId(e.target.value)}>
            <option value="">Don't mention one</option>
            {(linked.length ? linked : grants).map((g) => (
              <option key={g.id} value={g.id}>
                {g.sponsor}: {g.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Whose work</span>
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="lab">Everything shared with me</option>
            <option value="mine">Just mine</option>
          </select>
        </label>
        <label className="field">
          <span>Date</span>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {DATE_RANGES.filter((r) => r.id !== 'custom').map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Built from {entries.length} {entries.length === 1 ? 'entry' : 'entries'}. Only entries shared with you are used, never anyone's "Only me" entries.
      </p>
      <DisclosureWarning lab={lab} state={state} invIds={[invId]} what="a grant application" />
      <Output
        text={text}
        fileName={`preliminary-data-${invId}.txt`}
        note="A starting point: add figures, statistics and citations, and match the funder's page limits."
      />
    </>
  );
}

// ---------- 6. tell Rheo what you need ----------
const EXAMPLES = [
  'Make slides from my last 2 weeks on the hydrogel',
  'Preliminary data for a grant on the sweat patch',
  'Help with my CV for a postdoc application',
  'Email my PI an update on this week',
  "What didn't work this month?",
  'Summarize the sweat patch for my committee',
];

function Ask(ctx) {
  const { lab, state, viewer, pi } = ctx;
  const [text, setText] = useState('');
  const [asked, setAsked] = useState(null);
  const mine = useMine(state, viewer, pi);
  const plan = asked ? interpret(asked, { lab, state, today: lab.lab.today }) : null;
  const tool = plan?.tool && TOOLS.find((t) => t.id === plan.tool);
  const inv = plan?.invention && lab.inventions.find((i) => i.id === plan.invention);
  const matches =
    plan && !tool
      ? mine.filter((e) => {
          const hay = `${did(e)} ${result(e)} ${e.process || ''}`.toLowerCase();
          return plan.words.some((w) => hay.includes(w));
        })
      : [];

  return (
    <>
      <form
        className="card ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) setAsked(text.trim());
        }}
      >
        <label className="field">
          <span>What do you need?</span>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Make slides from my last two weeks on the hydrogel for Thursday" />
        </label>
        <div className="ask-examples" aria-label="Examples">
          {EXAMPLES.map((x) => (
            <button
              key={x}
              type="button"
              className="qn-chip"
              onClick={() => {
                setText(x);
                setAsked(x);
              }}
            >
              {x}
            </button>
          ))}
        </div>
        <div className="form-foot">
          <span className="muted small">In this prototype Rheo matches your words to its tools. It doesn't write anything it can't find in your entries.</span>
          <button className="btn primary" type="submit" disabled={!text.trim()}>
            Ask Rheo
          </button>
        </div>
      </form>

      {plan && tool && (
        <section className="block" aria-live="polite">
          <div className="found suggest">
            <p className="found-label">Rheo will</p>
            <p>
              <strong>{tool.title.toLowerCase()}</strong>
              {inv ? ` for ${inv.short}` : ''}
              {plan.days ? `, covering the last ${plan.days === 1 ? 'day' : `${plan.days} days`}` : ''}
              {plan.outcome ? `, only entries that ${plan.outcome === 'failed' ? "didn't work" : 'worked'}` : ''}. Change anything below.
            </p>
          </div>
          <ToolBody key={asked} id={tool.id} ctx={ctx} prefill={plan} />
        </section>
      )}

      {plan && !tool && (
        <section className="block" aria-live="polite">
          <div className="found suggest">
            <p className="found-label">Rheo couldn't match that to one of its tools</p>
            <p>
              {matches.length
                ? `Here are ${matches.length} of your entries that mention it. Open one, or use them in a tool.`
                : 'None of your entries mention it either. Try different words, or pick one of the tools.'}
            </p>
          </div>
          {matches.length > 0 && <WorkTable entries={matches} lab={lab} viewer={viewer} showProject caption="Matching entries" />}
          <div className="tool-actions">
            {TOOLS.filter((t) => t.id !== 'ask').map((t) => (
              <a key={t.id} className="btn small" href={t.href || `#/tools/${t.id}`}>
                {t.title}
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ---------- icons ----------
function ToolIcon({ name }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    slides: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" {...p} />
        <path d="M12 16v4M8 20h8M7 12l3-3 2 2 4-4" {...p} />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" {...p} />
        <path d="M3 7l9 6 9-6" {...p} />
      </>
    ),
    flask: <path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 5.9 21h12.2a1.6 1.6 0 0 0 1.4-2.5L14 9V3M7.5 14h9" {...p} />,
    wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a2 2 0 0 0 2.8 2.8l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.4-.4-2.4z" {...p} />,
    timeline: (
      <>
        <path d="M4 12h16" {...p} />
        <circle cx="7" cy="12" r="2" {...p} />
        <circle cx="13" cy="12" r="2" {...p} />
        <circle cx="19" cy="12" r="2" {...p} />
        <path d="M7 6v3M13 15v3M19 6v3" {...p} />
      </>
    ),
    chat: <path d="M4 5h16v11H9l-5 4z M8 10h8 M8 13h5" {...p} />,
    grant: (
      <>
        <path d="M6 3h9l4 4v14H6z" {...p} />
        <path d="M15 3v4h4M9 12h7M9 16h5" {...p} />
      </>
    ),
    job: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" {...p} />
        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" {...p} />
      </>
    ),
  };
  return (
    <svg className="tool-icon" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
