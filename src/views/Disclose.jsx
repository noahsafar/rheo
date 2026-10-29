import { useEffect, useRef } from 'react';
import { formatDate } from '../lib/record.js';
import { grants } from '../data/workspace.js';
import { allDeadlines, newId } from '../lib/workspace.js';
import { disclosureMarkdown, download, slug } from '../lib/export.js';
import { go } from '../App.jsx';

// "Disclose an idea": the PI answers six plain questions, Rheo fills in what it already knows from the
// lab record, and the answers plus the evidence go to Yale Ventures in one step.

const STEPS = [
  { id: 'describe', label: 'The idea' },
  { id: 'people', label: 'Who worked on it' },
  { id: 'start', label: 'When it started' },
  { id: 'public', label: 'Who has seen it' },
  { id: 'funding', label: 'Funding' },
  { id: 'review', label: 'Check and send' },
];

export default function Disclose({ lab, records, state, dispatch, invId }) {
  if (!invId) return <Chooser lab={lab} records={records} state={state} />;
  if (invId === 'new') return <NewIdea lab={lab} dispatch={dispatch} />;
  const rec = records[invId];
  if (!rec) return <Chooser lab={lab} records={records} state={state} />;
  return <Wizard lab={lab} rec={rec} state={state} dispatch={dispatch} />;
}

// ---------- step 0: which idea ----------
function Chooser({ lab, records, state }) {
  const open = lab.inventions.filter((i) => !state.sent[i.id]);
  const sent = lab.inventions.filter((i) => state.sent[i.id]);
  return (
    <div className="page narrow wizard">
      <section className="page-head">
        <h1>Disclose an idea to Yale Ventures</h1>
        <p className="lede">
          Telling Yale Ventures about an invention is the first step toward a patent, a license or a company. It takes
          about ten minutes. Rheo fills in what it already knows from your lab's records, and you can stop at any time.
        </p>
      </section>
      <h2 className="q">Which idea is it?</h2>
      <ul className="big-choices">
        {open.map((i) => {
          const d = state.disclosures[i.id];
          return (
            <li key={i.id}>
              <a className="big-choice" href={`#/disclose/${i.id}`}>
                <strong>{records[i.id].name}</strong>
                <span className="muted">
                  {d?.step ? `You started this. Pick up at "${STEPS[d.step].label.toLowerCase()}".` : `Rheo already has ${records[i.id].confirmed.length} records for this.`}
                </span>
              </a>
            </li>
          );
        })}
        <li>
          <a className="big-choice new" href="#/disclose/new">
            <strong>Something new</strong>
            <span className="muted">An idea Rheo isn't tracking yet.</span>
          </a>
        </li>
      </ul>
      {sent.length > 0 && (
        <>
          <h2 className="q small-q">Already sent</h2>
          <ul className="sent-list">
            {sent.map((i) => (
              <li key={i.id}>
                <a href={`#/disclose/${i.id}`}>{records[i.id].name}</a>
                <span className="muted small">Sent {formatDate(state.sent[i.id])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function NewIdea({ lab, dispatch }) {
  const titleRef = useRef(null);
  const summaryRef = useRef(null);
  return (
    <div className="page narrow wizard">
      <StepHeader step={0} />
      <form
        className="step"
        onSubmit={(e) => {
          e.preventDefault();
          const title = titleRef.current.value.trim();
          if (!title) return titleRef.current.focus();
          const id = newId('inv');
          dispatch({
            type: 'addInvention',
            invention: {
              id,
              title,
              short: title.length > 30 ? title.slice(0, 28).trim() + '…' : title,
              summary: summaryRef.current.value.trim(),
              started: lab.lab.today,
              stage: 'New idea',
              contributors: [],
              isNew: true,
            },
          });
          dispatch({ type: 'disclosure', inv: id, value: { title, summary: summaryRef.current.value.trim(), step: 1, people: ['m1'] } });
          go(`disclose/${id}`);
        }}
      >
        <h2 className="q">What's the idea?</h2>
        <label className="field big-field">
          <span>Give it a short name</span>
          <input ref={titleRef} placeholder="Self-healing coating for stents" required />
        </label>
        <label className="field big-field">
          <span>In a sentence or two, what does it do?</span>
          <textarea ref={summaryRef} rows={4} placeholder="Plain words are best. Yale Ventures will ask for the technical detail later." />
        </label>
        <StepNav back={() => go('disclose')} nextLabel="Next" submit />
      </form>
    </div>
  );
}

// ---------- the six steps ----------
function Wizard({ lab, rec, state, dispatch }) {
  const inv = rec.inv;
  const d = state.disclosures[inv.id] || {};
  const funded = grants.filter((g) => g.inventions.includes(inv.id)).map((g) => g.id);
  const foundMta = rec.confirmed.find((f) => f.reqs.includes('mta'));
  const a = {
    step: 0,
    title: rec.name,
    summary: inv.summary,
    whatsNew: '',
    people: inv.isNew ? ['m1'] : inv.contributors.map((c) => c.member),
    outside: [],
    start: rec.keyDates[0] ? '' : 'unsure',
    startDate: '',
    shared: '',
    sharedNote: '',
    planned: '',
    plannedNote: '',
    grants: funded,
    otherSponsor: '',
    materials: foundMta ? 'yes' : '',
    materialsNote: '',
    ...d,
  };
  const set = (value) => dispatch({ type: 'disclosure', inv: inv.id, value });
  const toStep = (step) => {
    set({ step });
    window.scrollTo(0, 0);
  };
  const heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, [a.step]);

  if (state.sent[inv.id]) return <Sent lab={lab} rec={rec} a={a} state={state} />;

  const step = STEPS[a.step].id;
  const send = () => {
    const today = lab.lab.today;
    if (a.materials === 'no') dispatch({ type: 'noneNeeded', key: `${inv.id}:mta` });
    dispatch({ type: 'sent', inv: inv.id, date: today });
    dispatch({ type: 'exported', inv: inv.id });
    for (const dl of allDeadlines(state))
      if (dl.action === 'disclosure' && dl.invention === inv.id) dispatch({ type: 'deadlineDone', id: dl.id, value: true });
    window.scrollTo(0, 0);
  };

  return (
    <div className="page narrow wizard">
      <StepHeader step={a.step} onJump={a.step > 0 ? toStep : null} />
      <div className="step">
        <h2 className="q" tabIndex={-1} ref={heading}>
          {QUESTIONS[step]}
        </h2>

        {step === 'describe' && (
          <>
            <Prefilled />
            <label className="field big-field">
              <span>Name</span>
              <input value={a.title} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label className="field big-field">
              <span>What does it do?</span>
              <textarea rows={4} value={a.summary} onChange={(e) => set({ summary: e.target.value })} />
            </label>
            <label className="field big-field">
              <span>What makes it different from what exists today? (optional)</span>
              <textarea
                rows={3}
                value={a.whatsNew}
                onChange={(e) => set({ whatsNew: e.target.value })}
                placeholder="For example: no pump needed, lasts four weeks instead of one, costs a tenth as much"
              />
            </label>
          </>
        )}

        {step === 'people' && (
          <>
            <p className="help">
              Tick everyone who helped with the idea or the work behind it. Include people who have left. Yale Ventures
              and patent counsel decide later who counts as an inventor, so it's better to include too many than too
              few.
            </p>
            <ul className="people-pick">
              {lab.members.map((m) => {
                const n = rec.files.filter((f) => f.owner === m.id).length;
                const on = a.people.includes(m.id);
                return (
                  <li key={m.id}>
                    <label className={`person ${on ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => set({ people: e.target.checked ? [...a.people, m.id] : a.people.filter((x) => x !== m.id) })}
                      />
                      <span className="avatar" aria-hidden="true">
                        {m.name.split(' ').map((p) => p[0]).join('')}
                      </span>
                      <span className="person-text">
                        <strong>{m.name}</strong>
                        <span className="muted small">
                          {m.role}
                          {m.status === 'left' ? `, left ${formatDate(m.end, { month: 'short', year: 'numeric' })}` : ''}
                          {n ? `. ${n} records on this` : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <OutsidePeople a={a} set={set} />
          </>
        )}

        {step === 'start' && (
          <>
            {rec.keyDates[0] ? (
              <div className="found">
                <p className="found-label">The earliest record Rheo found</p>
                <p>
                  <strong>{formatDate(rec.keyDates[0].date, { month: 'long', day: 'numeric', year: 'numeric' })}</strong>:{' '}
                  {rec.keyDates[0].file.name} by {lab.members.find((m) => m.id === rec.keyDates[0].file.owner)?.name}
                </p>
              </div>
            ) : (
              <p className="help">Rheo hasn't found a dated record of this idea yet. A rough date is fine.</p>
            )}
            <Choices
              value={a.start}
              onChange={(v) => set({ start: v })}
              options={[
                ...(rec.keyDates[0] ? [['found', "Yes, that's about when it started"]] : []),
                ['earlier', rec.keyDates[0] ? 'It started earlier' : 'I know roughly when'],
                ['unsure', "I'm not sure"],
              ]}
            />
            {a.start === 'earlier' && (
              <label className="field big-field">
                <span>Roughly when? Any date in the right month is fine.</span>
                <input type="date" value={a.startDate} max={lab.lab.today} onChange={(e) => set({ startDate: e.target.value })} />
              </label>
            )}
          </>
        )}

        {step === 'public' && (
          <>
            <p className="help">
              This matters because sharing an invention publicly before a patent is filed can limit where it can be
              patented. It's common, and Yale Ventures deals with it often. They just need to know.
            </p>
            {rec.files.some((f) => f.flag === 'disclosed-before-filing') && (
              <div className="found warn">
                <p className="found-label">Rheo found these</p>
                <ul>
                  {rec.files
                    .filter((f) => f.flag === 'disclosed-before-filing')
                    .map((f) => (
                      <li key={f.id}>
                        {f.name.replace(/\.pdf$/, '')}, {formatDate(f.date)}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            <p className="sub-q">
              {rec.files.some((f) => f.flag === 'disclosed-before-filing') ? 'Anything else?' : 'Has it been shared outside the lab?'} Talks,
              posters, papers, theses, or conversations with companies.
            </p>
            <Choices value={a.shared} onChange={(v) => set({ shared: v })} options={[['no', 'No'], ['yes', 'Yes'], ['unsure', "I'm not sure"]]} />
            {a.shared === 'yes' && (
              <label className="field big-field">
                <span>What and when?</span>
                <textarea rows={2} value={a.sharedNote} onChange={(e) => set({ sharedNote: e.target.value })} placeholder="Poster at a department retreat, last spring" />
              </label>
            )}
            <p className="sub-q">Is anyone planning to present or publish it soon?</p>
            <Choices value={a.planned} onChange={(v) => set({ planned: v })} options={[['no', 'No'], ['yes', 'Yes'], ['unsure', "I'm not sure"]]} />
            {a.planned === 'yes' && (
              <>
                <label className="field big-field">
                  <span>What and when?</span>
                  <textarea rows={2} value={a.plannedNote} onChange={(e) => set({ plannedNote: e.target.value })} placeholder="Ji-woo's conference abstract, due Feb 1" />
                </label>
                <p className="hint">Yale Ventures will want to talk with you before then. Rheo puts this at the top of what they see.</p>
              </>
            )}
          </>
        )}

        {step === 'funding' && (
          <>
            <p className="help">Funders can have rights to inventions they paid for, so Yale Ventures needs to know who funded the work.</p>
            <ul className="people-pick">
              {grants.map((g) => {
                const on = a.grants.includes(g.id);
                return (
                  <li key={g.id}>
                    <label className={`person ${on ? 'on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => set({ grants: e.target.checked ? [...a.grants, g.id] : a.grants.filter((x) => x !== g.id) })}
                      />
                      <span className="person-text">
                        <strong>{g.title}</strong>
                        <span className="muted small">
                          {g.sponsor}
                          {funded.includes(g.id) ? '. Rheo linked this grant to the idea.' : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <label className="field big-field">
              <span>Any other funding, such as a company or foundation? (optional)</span>
              <input value={a.otherSponsor} onChange={(e) => set({ otherSponsor: e.target.value })} />
            </label>
            <p className="sub-q">Did the work use materials, data or software from another lab or company?</p>
            {foundMta && (
              <div className="found">
                <p className="found-label">Rheo found an agreement</p>
                <p>{foundMta.name}</p>
              </div>
            )}
            <Choices value={a.materials} onChange={(v) => set({ materials: v })} options={[['no', 'No'], ['yes', 'Yes'], ['unsure', "I'm not sure"]]} />
            {a.materials === 'yes' && !foundMta && (
              <label className="field big-field">
                <span>What, and from whom?</span>
                <input value={a.materialsNote} onChange={(e) => set({ materialsNote: e.target.value })} />
              </label>
            )}
          </>
        )}

        {step === 'review' && <Review lab={lab} rec={rec} a={a} toStep={toStep} />}

        <StepNav
          back={a.step > 0 ? () => toStep(a.step - 1) : () => go('disclose')}
          next={step === 'review' ? send : () => toStep(a.step + 1)}
          nextLabel={step === 'review' ? 'Send to Yale Ventures' : 'Next'}
          nextDisabled={step === 'describe' && !a.title.trim()}
          later
        />
      </div>
    </div>
  );
}

const QUESTIONS = {
  describe: "What's the idea?",
  people: 'Who worked on it?',
  start: 'When did it start?',
  public: 'Has anyone outside the lab seen it?',
  funding: 'Who paid for the work?',
  review: 'Check your answers and send',
};

function Review({ lab, rec, a, toStep }) {
  const name = (id) => lab.members.find((m) => m.id === id)?.name;
  const label = { yes: 'Yes', no: 'No', unsure: 'Not sure', '': 'Not answered' };
  const rows = [
    [0, 'The idea', <>{a.title}{a.summary ? <span className="muted stack">{a.summary}</span> : null}</>],
    [1, 'Who worked on it', [...a.people.map(name), ...a.outside.map((o) => `${o.name}${o.org ? ` (${o.org})` : ''}`)].filter(Boolean).join(', ') || 'Not answered'],
    [
      2,
      'When it started',
      a.start === 'found' && rec.keyDates[0]
        ? formatDate(rec.keyDates[0].date, { month: 'long', year: 'numeric' })
        : a.start === 'earlier' && a.startDate
          ? formatDate(a.startDate, { month: 'long', year: 'numeric' })
          : a.start === 'unsure'
            ? 'Not sure'
            : 'Not answered',
    ],
    [
      3,
      'Shared outside the lab',
      [
        { yes: `Yes${a.sharedNote ? `: ${a.sharedNote}` : ''}`, no: 'Nothing beyond what Rheo found', unsure: 'Not sure', '': 'Not answered' }[a.shared],
        { yes: `Coming up: ${a.plannedNote || 'yes'}`, no: 'Nothing planned', unsure: 'Not sure what is planned', '': '' }[a.planned],
      ]
        .filter(Boolean)
        .join('. ') + '.',
    ],
    [
      4,
      'Funding',
      `${grants.filter((g) => a.grants.includes(g.id)).map((g) => g.sponsor).join(', ') || 'None listed'}${a.otherSponsor ? `, ${a.otherSponsor}` : ''}. Used outside materials: ${label[a.materials].toLowerCase()}.`,
    ],
  ];
  const open = rec.gaps.filter((g) => g.severity !== 'low').slice(0, 4);

  return (
    <>
      <dl className="review">
        {rows.map(([i, k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
            <button className="link small" onClick={() => toStep(i)} aria-label={`Change ${k.toLowerCase()}`}>
              Change
            </button>
          </div>
        ))}
      </dl>
      <div className="found">
        <p className="found-label">Rheo attaches the evidence for you</p>
        <p>
          {rec.confirmed.length} records from your lab, a timeline of the work and a list of who did what. You don't
          need to gather anything.
        </p>
      </div>
      {open.length > 0 && (
        <div className="found warn">
          <p className="found-label">Yale Ventures may ask about</p>
          <ul>
            {open.map((g) => (
              <li key={g.id}>{g.title}</li>
            ))}
          </ul>
          <p className="small">You can still send now. These go at the top of the package so they can help you sort them out.</p>
        </div>
      )}
    </>
  );
}

function Sent({ lab, rec, a, state }) {
  return (
    <div className="page narrow wizard">
      <section className="sent-hero" role="status">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="28" r="27" className="sent-circle" />
          <path d="M17 29l7 7 15-16" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="sent-check" />
        </svg>
        <h1>Sent to Yale Ventures</h1>
        <p className="lede">
          {rec.name}, on {formatDate(state.sent[rec.inv.id], { month: 'long', day: 'numeric', year: 'numeric' })}.
        </p>
      </section>
      <section className="step">
        <h2 className="q small-q">What happens next</h2>
        <ol className="next-steps">
          <li>Someone from Yale Ventures reads it and contacts you to talk it through.</li>
          <li>If they need anything else, they'll ask about specific records. Rheo keeps collecting new ones in the background.</li>
          <li>Before anyone presents or publishes this work, check with them first.</li>
        </ol>
        <div className="step-nav">
          <a className="btn" href="#/lab">
            Back to home
          </a>
          <button className="btn" onClick={() => download(`${slug(rec.name)}-disclosure.md`, disclosureMarkdown(lab, rec, a, grants), 'text/markdown')}>
            Download a copy
          </button>
          <a className="btn quiet" href={`#/invention/${rec.inv.id}`}>
            See the full record
          </a>
        </div>
      </section>
    </div>
  );
}

// ---------- pieces ----------
function StepHeader({ step, onJump }) {
  return (
    <div className="step-head">
      <p className="step-count">
        Step {step + 1} of {STEPS.length}
      </p>
      <ol className="step-track" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s.id} className={i < step ? 'done' : i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined}>
            {onJump && i < step ? (
              <button className="link" onClick={() => onJump(i)}>
                {s.label}
              </button>
            ) : (
              <span>{s.label}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepNav({ back, next, nextLabel, nextDisabled, submit, later }) {
  return (
    <div className="step-nav">
      <button type="button" className="btn big quiet" onClick={back}>
        Back
      </button>
      {later && (
        <a className="link small later" href="#/lab">
          Finish later (your answers are saved)
        </a>
      )}
      <button type={submit ? 'submit' : 'button'} className="btn big primary" onClick={submit ? undefined : next} disabled={nextDisabled}>
        {nextLabel}
      </button>
    </div>
  );
}

function Choices({ value, onChange, options }) {
  return (
    <div className="choices" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className={`choice ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Prefilled() {
  return <p className="prefilled">Rheo filled this in from your lab's records. Change anything that's wrong.</p>;
}

function OutsidePeople({ a, set }) {
  const nameRef = useRef(null);
  const orgRef = useRef(null);
  const add = () => {
    const name = nameRef.current.value.trim();
    if (!name) return nameRef.current.focus();
    set({ outside: [...a.outside, { name, org: orgRef.current.value.trim() }] });
    nameRef.current.value = '';
    orgRef.current.value = '';
  };
  return (
    <div className="outside">
      <p className="sub-q">Anyone from outside the lab? (optional)</p>
      {a.outside.length > 0 && (
        <ul className="sent-list">
          {a.outside.map((o, i) => (
            <li key={i}>
              <span>
                {o.name}
                {o.org ? `, ${o.org}` : ''}
              </span>
              <button className="link small" onClick={() => set({ outside: a.outside.filter((_, j) => j !== i) })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="field-row">
        <label className="field">
          <span>Name</span>
          <input ref={nameRef} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        </label>
        <label className="field">
          <span>Where they work</span>
          <input ref={orgRef} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        </label>
        <button type="button" className="btn add-outside" onClick={add}>
          Add person
        </button>
      </div>
    </div>
  );
}
