// Everything the lab adds through Rheo (members, log entries, notebook pages, slides, deadlines)
// layered on top of the synthetic lab, plus the access rules for who sees what.

import { meetings as seedMeetings, deadlines as seedDeadlines, seedConnections, contacts, LOG_TYPES } from '../data/workspace.js';

export const PI_ID = 'm1';
export const isPI = (viewer) => viewer === PI_ID;

// The lab as the app sees it: generated lab plus members the PI added, and those members on their inventions.
export function labView(lab, state) {
  const added = state.membersAdded || [];
  const members = [...lab.members.map((m) => ({ ...m, email: contacts[m.id] })), ...added];
  const inventions = lab.inventions.map((inv) => ({
    ...inv,
    contributors: [
      ...inv.contributors,
      ...added.filter((m) => m.inventions?.includes(inv.id)).map((m) => ({ member: m.id, roles: ['Data'] })),
    ],
  }));
  return { ...lab, members, inventions };
}

// Log entries, notebook pages and uploaded slides become records like any other file,
// so they count toward each invention's readiness score.
export function entryFiles(state) {
  const out = [];
  for (const e of state.logs || []) {
    const type = LOG_TYPES.find((t) => t.id === e.type);
    out.push({
      id: e.id,
      source: 'rheo',
      kind: 'log',
      name: e.title,
      snippet: e.body || undefined,
      owner: e.owner,
      date: e.date,
      invention: e.invention || null,
      reqs: e.invention ? type?.reqs ?? [] : [],
      match: 'confirmed',
      confidence: 1,
      reachable: true,
      location: e.attachment ? `Lab OneDrive › Rheo › ${e.attachment}` : 'Logged in Rheo',
      logged: true,
      created: e.created,
    });
  }
  for (const p of state.pages || []) {
    out.push({
      id: p.id,
      source: 'scan',
      kind: 'scan',
      name: `${p.notebook}, p. ${p.page}`,
      snippet: p.note || undefined,
      owner: p.owner,
      date: p.date,
      invention: p.invention || null,
      reqs: p.invention ? (p.isIdea ? ['conception'] : ['rtp']) : [],
      match: 'confirmed',
      confidence: 1,
      reachable: true,
      location: 'Lab OneDrive › Notebook scans',
      thumb: p.thumb,
      logged: true,
      created: p.created,
    });
  }
  for (const m of allMeetings(state)) {
    const up = state.slides?.[m.id];
    if (!up) continue;
    out.push({
      id: `slides-${m.id}`,
      source: 'onedrive',
      kind: 'slides',
      name: up.name,
      owner: m.presenter,
      date: m.date,
      invention: m.invention || null,
      reqs: [],
      match: 'confirmed',
      confidence: 1,
      reachable: true,
      location: 'Lab OneDrive › Lab meetings',
      logged: true,
      created: up.created,
    });
  }
  return out;
}

export const allMeetings = (state) =>
  [...seedMeetings, ...(state.meetingsAdded || [])].sort((a, b) => (a.date < b.date ? -1 : 1));

export const allDeadlines = (state) =>
  [...seedDeadlines, ...(state.deadlinesAdded || [])]
    .map((d) => ({ ...d, done: state.deadlinesDone?.[d.id] ?? d.done ?? false }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

export const slidesFor = (m, state) => state.slides?.[m.id]?.name || m.slides;

export const connectionsFor = (state, memberId) => ({
  ...(seedConnections[memberId] || {}),
  ...(state.connections?.[memberId] || {}),
});

// What a viewer is allowed to see. The PI sees everything; a member sees only their own work.
export const canSee = (viewer, ownerIds) => isPI(viewer) || [].concat(ownerIds).includes(viewer);

export function recentActivity(files, limit = 8) {
  return files
    .filter((f) => f.logged)
    .sort((a, b) => ((b.created || b.date) > (a.created || a.date) ? 1 : -1))
    .slice(0, limit);
}

export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
