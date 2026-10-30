import { useState } from 'react';
import { DATE_RANGES } from '../lib/entries.js';
import { jobSummary, cvEntry, coverLetter, shortBio, skillsList } from '../lib/tools.js';
import { Output, DisclosureWarning, useMine } from './Tools.jsx';

// "Jobs": turn your own lab work into job materials. Only the viewer's own entries are used.
const KINDS = [
  { id: 'cv', label: 'CV entry', make: cvEntry, file: 'cv-entry.txt', about: 'Your position, then bullets on what you achieved and the skills you used. Paste it under Research experience.' },
  { id: 'summary', label: 'Research summary', make: jobSummary, file: 'research-summary.txt', about: 'A summary paragraph, CV highlights, techniques, your ideas and problems you solved. A start for a research statement.' },
  { id: 'cover', label: 'Cover letter', make: coverLetter, file: 'cover-letter-paragraph.txt', about: 'One paragraph about your lab work. Fill in the role and organization.' },
  { id: 'bio', label: 'Short bio', make: shortBio, file: 'bio.txt', about: 'Two or three sentences for LinkedIn, a personal website or a conference program.' },
  { id: 'skills', label: 'Skills', make: skillsList, file: 'skills.txt', about: 'Every technique you noted, how often and how recently you used it. Handy for interviews too.' },
];

const minusDays = (iso, n) => {
  const d = new Date(iso + 'T12:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function Jobs(ctx) {
  const { pi } = ctx;
  return (
    <div className="page narrow-wide">
      <section className="page-head">
        <p className="crumb">
          <a href={pi ? '#/lab' : '#/me'}>Home</a> / Jobs
        </p>
        <h1>Jobs</h1>
        <p className="lede">
          Turn the work you logged into job materials: a CV entry, a research summary, a cover letter paragraph, a short
          bio and your skills. Rheo uses only your own entries and only what they say.
        </p>
      </section>
      <JobsBody {...ctx} />
    </div>
  );
}

export function JobsBody({ lab, state, viewer, pi, initial = 'cv' }) {
  const [kind, setKind] = useState(initial);
  const [range, setRange] = useState('any');
  const mine = useMine(state, viewer, pi);
  const entries = range === 'any' ? mine : mine.filter((e) => e.date >= minusDays(lab.lab.today, Number(range) - 1));
  const k = KINDS.find((x) => x.id === kind);
  const text = k.make({ lab, state, viewer, entries });
  const invIds = [...new Set(entries.map((e) => e.invention).filter(Boolean))];

  return (
    <>
      <div className="jobs-bar">
        <div className="seg-control" role="group" aria-label="What to write">
          {KINDS.map((x) => (
            <button key={x.id} type="button" aria-pressed={kind === x.id} onClick={() => setKind(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
        <label className="field jobs-range">
          <span>Covering</span>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            {DATE_RANGES.filter((r) => r.id !== 'custom').map((r) => (
              <option key={r.id} value={r.id}>
                {r.id === 'any' ? 'Everything I logged' : r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        {k.about} Built from your {entries.length} {entries.length === 1 ? 'entry' : 'entries'}.
      </p>
      <DisclosureWarning lab={lab} state={state} invIds={invIds} what="a job application" />
      <Output
        text={text}
        fileName={k.file}
        note="Add publications, talks and awards yourself, and check with your PI before sharing unpublished results."
      />
    </>
  );
}
