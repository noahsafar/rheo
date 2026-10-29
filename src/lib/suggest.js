// Suggested answers for "Disclose an idea", drawn from what the team logged on the project.
// Entries marked "Only me" are never used. Every suggestion keeps its source entries so the PI can check them.

import { did, result, byNewest } from './entries.js';

export function teamEntries(state, invId) {
  return (state.logs || []).filter((e) => e.invention === invId && e.visibility !== 'private').sort(byNewest);
}

const PUBLIC_RE = /\b(poster|talk|present(ed|ing|ation)?|abstract|conference|seminar|symposium|retreat|manuscript|preprint|publish(ed|ing)?|journal|thesis|webinar|company|investor|startup)\b/i;
const PLANNED_RE = /\b(due|will|plan(ned|ning)?|upcoming|next (week|month)|submit(ting)?|draft(ed|ing)?)\b/i;
const MATERIALS_RE = /\b(from (another|the \w+) lab|sent by|provided by|gift(ed)?|samples? from|sample agreement|mta|material transfer|collaborator|licensed|vendor|supplier|company)\b/i;

const text = (e) => `${did(e)}. ${result(e)}. ${e.process || ''}`;
const sentence = (s) => {
  const t = s.trim().replace(/[.;\s]+$/, '');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
};

export function suggestions({ lab, state, rec, a }) {
  const inv = rec.inv;
  const entries = teamEntries(state, inv.id);
  const out = {};

  // The idea: what worked, and the ideas people wrote down.
  const wins = entries.filter((e) => e.outcome === 'worked' && result(e) && e.type !== 'note').slice(0, 4);
  const ideas = entries.filter((e) => e.type === 'idea').slice(0, 2);
  if (wins.length || ideas.length) {
    const parts = [];
    if (wins.length) parts.push(`What the team has shown so far: ${wins.map((e) => sentence(result(e))).join('; ')}.`);
    if (ideas.length) parts.push(`Ideas the team is exploring: ${ideas.map((e) => sentence(did(e).replace(/^idea:\s*/i, ''))).join('; ')}.`);
    out.describe = {
      note: 'Rheo drafted this from results that worked and ideas the team logged. Edit it to say why it matters.',
      draft: parts.join(' '),
      sources: [...wins, ...ideas],
    };
  }

  // People: anyone who logged work on this but isn't ticked.
  const loggers = [...new Set(entries.map((e) => e.owner))];
  const missing = loggers.filter((id) => !a.people.includes(id));
  out.people = {
    missing: missing.map((id) => ({
      member: lab.members.find((m) => m.id === id),
      count: entries.filter((e) => e.owner === id).length,
      latest: entries.find((e) => e.owner === id),
    })).filter((x) => x.member),
    loggers: loggers.length,
  };

  // Start: the earliest entry on this, compared with the earliest record Rheo already found.
  const earliest = [...entries].sort((x, y) => x.date.localeCompare(y.date))[0];
  if (earliest) {
    const found = rec.keyDates[0]?.date;
    out.start = { entry: earliest, earlier: !found || earliest.date < found };
  }

  // Shared outside the lab: talks, posters, abstracts, papers, companies.
  const pub = entries.filter((e) => PUBLIC_RE.test(text(e)));
  if (pub.length) {
    out.public = pub.slice(0, 5).map((e) => ({
      entry: e,
      planned: PLANNED_RE.test(text(e)),
      summary: sentence(`${did(e)}${result(e) ? ` (${result(e).replace(/[.\s]+$/, '')})` : ''}`),
    }));
  }

  // Outside materials: samples or agreements mentioned in entries.
  const mats = entries.filter((e) => MATERIALS_RE.test(text(e)));
  if (mats.length) out.materials = mats.slice(0, 3);

  return out;
}
