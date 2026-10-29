// Work entries: what someone did at the bench, what came of it, and how.
// Only "what I did" is required; everything else can be filled in later.

import { LOG_TYPES } from '../data/workspace.js';

export const OUTCOMES = [
  { id: 'worked', label: 'Worked' },
  { id: 'partly', label: 'Partly' },
  { id: 'failed', label: "Didn't work" },
  { id: 'unclear', label: 'Too early to tell' },
];
export const outcomeLabel = (id) => OUTCOMES.find((o) => o.id === id)?.label;

export const DURATIONS = ['15 min', '30 min', '1 h', '2 h', 'Half day', 'Full day'];

export const typeLabel = (id) => LOG_TYPES.find((t) => t.id === id)?.label;

// Older entries stored a title and free-text body; read them as "what I did" and "result".
export const did = (e) => e.did ?? e.title ?? '';
export const result = (e) => e.result ?? e.body ?? '';

export const byNewest = (a, b) => (b.date === a.date ? (b.created || '').localeCompare(a.created || '') : b.date.localeCompare(a.date));

// Who can see an entry. Entries made before this setting existed stay between the person and the PI.
export const VISIBILITY = [
  { id: 'lab', label: 'Everyone in the lab' },
  { id: 'pi', label: 'Only me and the head of the lab' },
  { id: 'private', label: 'Only me' },
];
export const visibilityOf = (e) => e.visibility || 'pi';
export const visibilityLabel = (e, piName) =>
  ({ lab: 'Everyone in the lab', pi: `Only the author and ${piName} (head of lab)`, private: 'Only the author' })[
    visibilityOf(e)
  ];

export function canSee(e, viewer, pi) {
  if (!e) return false;
  if (e.owner === viewer.id) return true;
  const v = visibilityOf(e);
  return v === 'lab' || (v === 'pi' && pi);
}

export function visibleEntries(state, viewer, pi) {
  return (state.logs || []).filter((e) => canSee(e, viewer, pi)).sort(byNewest);
}

// ---------- similar work ----------
// Plain word overlap, weighted so rare words ("RiboGreen", "rheology") count more than common ones.
const STOP = new Set(
  'the and for with from that this was were are not but all any can had has have into its out our than then they too very will just only also more most some such about after again before being both each few how off once other over same under until when where which while who why your yours mine their them what did does doing done day days week used use using made make ran run get got per one two three new old first last next via set test tested testing tests tried try check checked repeat repeated compared started start ran'.split(
    ' '
  )
);
const words = (e) =>
  `${did(e)} ${result(e)} ${e.process || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9µ°\-\s]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w))
    .map(stem);

// Rough stemming so "bonded", "bonding" and "bonds" count as the same word.
function stem(w) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

export function similarityIndex(entries) {
  const docs = new Map(entries.map((e) => [e.id, words(e)]));
  const df = new Map();
  for (const ws of docs.values()) for (const w of new Set(ws)) df.set(w, (df.get(w) || 0) + 1);
  const n = entries.length || 1;
  const vec = new Map();
  for (const [id, ws] of docs) {
    const v = new Map();
    for (const w of ws) v.set(w, (v.get(w) || 0) + Math.log(1 + n / (df.get(w) || 1)));
    let norm = 0;
    for (const x of v.values()) norm += x * x;
    vec.set(id, { v, norm: Math.sqrt(norm) || 1 });
  }
  const cos = (a, b) => {
    const A = vec.get(a);
    const B = vec.get(b);
    if (!A || !B) return 0;
    let dot = 0;
    for (const [w, x] of A.v) if (B.v.has(w)) dot += x * B.v.get(w);
    return dot / (A.norm * B.norm);
  };
  return { cos };
}

// For each entry by someone else, the closest entry of mine (if any is close enough).
export const SIMILAR_MIN = 0.12;
export function closestMine(entry, mine, index) {
  let best = null;
  for (const m of mine) {
    if (m.id === entry.id) continue;
    const score = index.cos(entry.id, m.id);
    if (!best || score > best.score) best = { entry: m, score };
  }
  return best && best.score >= SIMILAR_MIN ? best : null;
}

// A rough first guess at what kind of entry this is, so people don't have to choose.
export function guessType(text) {
  const t = text.toLowerCase();
  if (/\b(idea|what if|could we|we could|hypothes[ie]s|might work)\b/.test(t)) return 'idea';
  if (/\b(changed|switched|modified|new protocol|instead of|now using|updated the (method|protocol))\b/.test(t))
    return 'protocol';
  if (t.trim()) return 'experiment';
  return 'note';
}

export const DATE_RANGES = [
  { id: 'any', label: 'Any time' },
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
  { id: 'custom', label: 'Pick dates' },
];

const minusDays = (iso, n) => {
  const d = new Date(iso + 'T12:00');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export function applyFilters(entries, f, today) {
  let from = '';
  let to = '';
  if (f.range === 'custom') {
    from = f.from || '';
    to = f.to || '';
  } else if (f.range !== 'any') {
    from = minusDays(today, Number(f.range));
  }
  return entries.filter(
    (e) =>
      (!from || e.date >= from) &&
      (!to || e.date <= to) &&
      (f.type === 'all' || e.type === f.type) &&
      (f.outcome === 'all' || (f.outcome === 'none' ? !e.outcome : e.outcome === f.outcome)) &&
      (f.project === 'all' || (e.invention || '') === f.project) &&
      (f.who === 'all' || e.owner === f.who)
  );
}

// The PI can rename an invention during setup; fall back to its working title.
export const invName = (state, inv) => state.names?.[inv.id] || inv.title;
