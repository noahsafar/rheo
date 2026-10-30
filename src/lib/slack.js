// The Slack connection, simulated for the demo:
// 1. Rheo reads the channels the lab picks (read-only) and suggests messages about the work as records.
// 2. People log work from Slack with /rheo.
// 3. Rheo posts updates, slides and reminders back to a channel.

import { SLACK_CHANNELS, SLACK_MESSAGES } from '../data/slack.js';
import { OUTCOMES, guessType } from './entries.js';
import { newId } from './workspace.js';

export const slackState = (state) => state.slack || { connected: false, channels: [], posts: [] };
export const channelById = (id) => SLACK_CHANNELS.find((c) => c.id === id);

// Messages in connected channels become records like Teams messages: suggested until someone confirms them.
// They don't count toward readiness checks, so connecting Slack never changes a score by itself.
export function slackFiles(state) {
  const s = slackState(state);
  if (!s.connected) return [];
  return SLACK_MESSAGES.filter((m) => s.channels.includes(m.channel)).map((m) => ({
    id: m.id,
    source: 'slack',
    kind: 'message',
    name: `${channelById(m.channel).name}: ${m.text.length > 70 ? m.text.slice(0, 68).trimEnd() + '…' : m.text}`,
    snippet: m.text,
    owner: m.owner,
    date: m.date,
    invention: m.invention,
    reqs: [],
    match: state.matches?.[m.id] ?? (m.invention ? 'suggested' : 'none'),
    confidence: m.confidence ?? null,
    reachable: true,
    location: `Slack › ${channelById(m.channel).name}`,
  }));
}

// Everything shown in a channel: the workspace's own messages plus what people and Rheo posted in the demo.
// Like real slash commands, /rheo commands and Rheo's private replies are only visible to the person who typed them.
export function channelMessages(state, channel, viewerId) {
  const posts = slackState(state).posts.filter((p) => p.channel === channel && (!p.visibleTo || p.visibleTo === viewerId));
  return [...SLACK_MESSAGES.filter((m) => m.channel === channel), ...posts].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
  );
}

export const nowTime = () => new Date().toTimeString().slice(0, 5);

// /rheo <what I did>; result: …; worked; process: …; took 2 h; only me
// Everything after the first part is optional and can come in any order.
export function parseRheo(text, { lab, viewer, channel, pi }) {
  const body = text.replace(/^\/rheo\s*/i, '').trim();
  if (!body || /^help$/i.test(body)) return { help: true };
  const parts = body.split(/\s*[;|]\s*/).filter(Boolean);
  const entry = { did: '', result: '', process: '', duration: '', outcome: '', visibility: 'lab' };
  const leftover = [];
  for (const p of parts) {
    const kv = p.match(/^(result|results|process|how|time|took|project)\s*[:=]?\s+(.*)$/i);
    if (kv) {
      const [, k, v] = kv;
      const key = k.toLowerCase();
      if (key.startsWith('result')) entry.result = v;
      else if (key === 'process' || key === 'how') entry.process = v;
      else if (key === 'time' || key === 'took') entry.duration = v;
      else if (key === 'project') entry.projectHint = v;
      continue;
    }
    const outcome = OUTCOMES.find((o) => o.label.toLowerCase() === p.toLowerCase() || (o.id === 'failed' && /^(failed|did ?n[o']?t work)$/i.test(p)));
    if (outcome) {
      entry.outcome = outcome.id;
      continue;
    }
    if (/^(only me|private)$/i.test(p)) {
      entry.visibility = 'private';
      continue;
    }
    if (/^(me \+ head of lab|me and (the )?(pi|head of (the )?lab)|pi only)$/i.test(p)) {
      entry.visibility = pi ? 'private' : 'pi';
      continue;
    }
    leftover.push(p);
  }
  entry.did = leftover.join('; ');
  if (!entry.did) return { error: 'Say what you did first, for example: /rheo Ran release assay on batch 14; result: 62% release; worked' };

  // Project: from the channel, then a project name in the message, then the person's first project.
  const mine = pi ? lab.inventions : lab.inventions.filter((i) => i.contributors.some((c) => c.member === viewer.id));
  const hay = `${entry.projectHint || ''} ${entry.did}`.toLowerCase();
  const named = lab.inventions.find((i) =>
    [i.short, i.title].some((n) => n.toLowerCase().split(/\s+/).filter((w) => w.length > 4).some((w) => hay.includes(w)))
  );
  const invention = channelById(channel)?.invention || named?.id || mine[0]?.id || '';
  delete entry.projectHint;
  return {
    entry: {
      ...entry,
      id: newId('log'),
      owner: viewer.id,
      created: new Date().toISOString(),
      date: lab.lab.today,
      invention,
      type: guessType(`${entry.did} ${entry.result} ${entry.process}`),
      via: 'slack',
    },
  };
}

export const HELP = [
  'Log work from any channel:',
  '/rheo Ran release assay on batch 14; result: 62% release; worked',
  'Add any of: result: …  process: …  took 2 h  worked / partly / didn\'t work  only me',
  'In a project channel the entry goes to that project. Elsewhere Rheo uses the project you name, or your first one.',
].join('\n');
