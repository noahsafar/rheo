// "Rheo does it for you": things Rheo can make from a person's work entries.
// Everything here is built only from what the entries say, so nothing is invented.

import { formatDate } from './record.js';
import { did, result, outcomeLabel, typeLabel, byNewest, similarityIndex, SIMILAR_MIN, invName } from './entries.js';

export const TOOLS = [
  {
    id: 'slides',
    title: 'Make lab meeting slides',
    blurb: 'Pick the entries to cover. Rheo makes a slide per experiment, plus what worked and open questions.',
    icon: 'slides',
  },
  {
    id: 'update',
    title: 'Write my weekly update',
    blurb: 'A short email for the head of the lab: what you did, what came of it, where you are stuck.',
    icon: 'mail',
  },
  {
    id: 'methods',
    title: 'Draft a methods section',
    blurb: 'Turns the processes you logged into methods text for a paper, thesis or protocol.',
    icon: 'flask',
  },
  {
    id: 'troubleshoot',
    title: "Find help with what didn't work",
    blurb: 'For each experiment that failed, who in the lab got similar work to work, and how.',
    icon: 'wrench',
  },
  {
    id: 'timeline',
    title: 'Summarize a project over time',
    blurb: 'Month by month: what was done and the key results. Good for committee meetings and thesis chapters.',
    icon: 'timeline',
  },
  {
    id: 'grant',
    title: 'Write preliminary data for a grant',
    blurb: "Key findings, methods the lab has established and the problems you solved, ready for a proposal's preliminary data.",
    icon: 'grant',
  },
  {
    id: 'job',
    title: 'Summarize my research for a job application',
    blurb: 'A research summary, CV highlights and the techniques you have used, from your own entries.',
    icon: 'job',
  },
  {
    id: 'ask',
    title: 'Tell Rheo what you need',
    blurb: 'Describe it in your own words and Rheo picks the right tool and settings.',
    icon: 'chat',
  },
];

const nameOf = (lab, id) => lab.members.find((m) => m.id === id)?.name ?? 'Someone';
const firstOf = (lab, id) => nameOf(lab, id).split(' ')[0];
const projectOf = (lab, state, id) => {
  const inv = lab.inventions.find((i) => i.id === id);
  return inv ? invName(state, inv) : 'Other lab work';
};
// Lowercase only an ordinary capitalized first word, so "Ran RiboGreen" becomes "ran RiboGreen" but "PhD" and "qPCR" stay.
const lowerFirst = (s) => (/^[A-Z][a-z]*\b/.test(s) && !/^[A-Z][a-z]*[A-Z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const upperFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const clean = (s) => (s || '').trim().replace(/[.\s]+$/, '');
const groupBy = (xs, key) => {
  const m = new Map();
  for (const x of xs) {
    const k = key(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
};
const chrono = (xs) => [...xs].sort((a, b) => -byNewest(a, b));

// ---------- slides ----------
export function slideOutline({ lab, state, viewer, entries, meeting }) {
  const list = chrono(entries);
  const projects = [...new Set(list.map((e) => e.invention || ''))];
  const title = meeting?.topic || (projects.length === 1 ? projectOf(lab, state, projects[0]) : 'Work update');
  const span = list.length
    ? `${formatDate(list[0].date, { month: 'short', day: 'numeric' })} – ${formatDate(list[list.length - 1].date, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : '';
  const slides = [
    {
      kind: 'title',
      title,
      subtitle: `${viewer.name}, ${lab.lab.name} lab meeting${meeting ? `, ${formatDate(meeting.date, { month: 'long', day: 'numeric' })}` : ''}`,
      note: `Work from ${span}`,
    },
  ];
  for (const e of list) {
    const bullets = [];
    if (result(e)) bullets.push(['Result', clean(result(e))]);
    if (e.outcome) bullets.push(['Did it work', outcomeLabel(e.outcome)]);
    if (e.process) bullets.push(['How', clean(e.process)]);
    if (e.duration) bullets.push(['Time', e.duration]);
    slides.push({
      kind: 'entry',
      title: clean(did(e)),
      subtitle: `${formatDate(e.date)}${projects.length > 1 ? ` · ${projectOf(lab, state, e.invention)}` : ''}`,
      outcome: e.outcome,
      bullets,
      entryId: e.id,
    });
  }
  const worked = list.filter((e) => e.outcome === 'worked');
  const notYet = list.filter((e) => e.outcome === 'failed' || e.outcome === 'partly');
  const unclear = list.filter((e) => e.outcome === 'unclear');
  slides.push({
    kind: 'summary',
    title: 'Where things stand',
    columns: [
      ['Worked', worked.map((e) => clean(did(e)))],
      ["Didn't work yet", notYet.map((e) => clean(did(e)))],
    ],
  });
  slides.push({
    kind: 'list',
    title: 'Questions for the lab',
    items: [
      ...notYet.map((e) => `How do we fix "${clean(did(e))}"?${result(e) ? ` ${clean(result(e))}.` : ''}`),
      ...unclear.map((e) => `What would settle "${clean(did(e))}"?`),
    ].slice(0, 6),
    empty: 'Add the questions you want the lab to help with.',
  });
  slides.push({ kind: 'list', title: 'Next steps', items: [], empty: 'Add your next steps before the meeting.' });
  return { title, slides };
}

export async function downloadPptx(outline, fileName) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  const BLUE = '2A3CA8';
  const INK = '141A2B';
  const MUTED = '6F778A';
  const OC = { worked: ['1F6F53', 'DCEFE6'], partly: ['A8640C', 'FBEFD9'], failed: ['141A2B', 'EBE9F2'], unclear: ['4A5368', 'E7EAF0'] };
  const font = 'Calibri';
  for (const s of outline.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    if (s.kind === 'title') {
      slide.background = { color: BLUE };
      slide.addText(s.title, { x: 0.8, y: 2.3, w: 11.7, h: 1.4, fontFace: font, fontSize: 40, bold: true, color: 'FFFFFF' });
      slide.addText(s.subtitle, { x: 0.8, y: 3.8, w: 11.7, h: 0.6, fontFace: font, fontSize: 20, color: 'E2E6FA' });
      slide.addText(s.note, { x: 0.8, y: 4.4, w: 11.7, h: 0.5, fontFace: font, fontSize: 16, color: 'C9D0F4' });
      continue;
    }
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: BLUE }, line: { color: BLUE } });
    slide.addText(s.title, { x: 0.7, y: 0.45, w: 11.9, h: 1.0, fontFace: font, fontSize: 30, bold: true, color: INK, valign: 'top' });
    if (s.kind === 'entry') {
      slide.addText(s.subtitle, { x: 0.7, y: 1.45, w: 8, h: 0.4, fontFace: font, fontSize: 15, color: MUTED });
      if (s.outcome && OC[s.outcome]) {
        const [fg, bg] = OC[s.outcome];
        slide.addText(outcomeLabel(s.outcome), {
          x: 10.6, y: 0.55, w: 2.0, h: 0.45, fontFace: font, fontSize: 14, bold: true, color: fg, align: 'center',
          shape: pptx.ShapeType.roundRect, rectRadius: 0.2, fill: { color: bg },
        });
      }
      const rows = s.bullets.length ? s.bullets : [['Result', 'Add what you found.']];
      slide.addText(
        rows.flatMap(([k, v]) => [
          { text: `${k}  `, options: { bold: true, color: BLUE, fontSize: 16, breakLine: false } },
          { text: v, options: { color: INK, fontSize: 20, breakLine: true } },
        ]),
        { x: 0.7, y: 2.2, w: 11.9, h: 4.6, fontFace: font, valign: 'top', paraSpaceAfter: 14 }
      );
    } else if (s.kind === 'summary') {
      s.columns.forEach(([head, items], i) => {
        const x = 0.7 + i * 6.1;
        slide.addText(head, { x, y: 1.7, w: 5.7, h: 0.5, fontFace: font, fontSize: 20, bold: true, color: i === 0 ? '1F6F53' : 'A8640C' });
        slide.addText(
          items.length ? items.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })) : [{ text: 'Nothing here yet', options: { color: MUTED } }],
          { x, y: 2.3, w: 5.7, h: 4.5, fontFace: font, fontSize: 17, color: INK, valign: 'top', paraSpaceAfter: 8 }
        );
      });
    } else if (s.kind === 'list') {
      slide.addText(
        s.items.length ? s.items.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })) : [{ text: s.empty, options: { color: MUTED, italic: true } }],
        { x: 0.7, y: 1.8, w: 11.9, h: 5, fontFace: font, fontSize: 20, color: INK, valign: 'top', paraSpaceAfter: 12 }
      );
    }
    slide.addText(outline.title, { x: 0.7, y: 6.9, w: 9, h: 0.35, fontFace: font, fontSize: 11, color: MUTED });
  }
  await pptx.writeFile({ fileName });
}

// ---------- weekly update ----------
export function weeklyUpdate({ lab, state, viewer, entries, from, to }) {
  const list = chrono(entries);
  const piFirst = lab.lab.pi.split(' ')[0];
  const span = `${formatDate(from, { month: 'short', day: 'numeric' })} to ${formatDate(to, { month: 'short', day: 'numeric' })}`;
  const lines = [`Subject: Update from ${viewer.name.split(' ')[0]}, ${span}`, '', `Hi ${piFirst},`, '', `Here's what I worked on from ${span}.`];
  for (const [inv, xs] of groupBy(list, (e) => e.invention || '')) {
    lines.push('', projectOf(lab, state, inv));
    for (const e of xs) {
      const bits = [e.outcome ? `${outcomeLabel(e.outcome)}.` : '', result(e) ? `${clean(result(e))}.` : ''].filter(Boolean).join(' ');
      lines.push(`- ${formatDate(e.date, { month: 'short', day: 'numeric' })}: ${clean(did(e))}.${bits ? ` ${bits}` : ''}`);
    }
  }
  const stuck = list.filter((e) => e.outcome === 'failed' || e.outcome === 'partly');
  lines.push('', 'Where I could use help');
  lines.push(...(stuck.length ? stuck.map((e) => `- ${clean(did(e))}${result(e) ? `: ${clean(result(e))}` : ''}.`) : ['- Nothing blocking right now.']));
  lines.push('', 'Next week', '- ', '', 'Thanks,', viewer.name.split(' ')[0]);
  return lines.join('\n');
}

// ---------- methods ----------
export function methodsDraft({ lab, state, entries }) {
  const withProcess = chrono(entries).filter((e) => e.process);
  const skipped = entries.length - withProcess.length;
  const out = ['Methods (draft from lab entries; check every detail before using)', ''];
  for (const [type, xs] of groupBy(withProcess, (e) => e.type || 'experiment')) {
    out.push(type === 'protocol' ? 'Protocol changes' : typeLabel(type) === 'Experiment or result' ? 'Experimental procedures' : typeLabel(type));
    for (const e of xs) {
      const what = clean(did(e));
      const how = clean(e.process);
      const time = e.duration ? ` Time: about ${timeWords(e.duration)}.` : '';
      out.push(`${what.charAt(0).toUpperCase() + what.slice(1)}. ${how.charAt(0).toUpperCase() + how.slice(1)}.${time} [${formatDate(e.date)}, ${projectOf(lab, state, e.invention)}]`, '');
    }
  }
  if (!withProcess.length) out.push('None of the picked entries say what process was used. Add a process to an entry and try again.');
  return { text: out.join('\n').trim(), skipped };
}

const timeWords = (d) => ({ 'half day': 'half a day', 'full day': 'a full day' })[d.toLowerCase()] || d;

// ---------- troubleshoot ----------
export function troubleshoot({ lab, viewer, mine, allVisible }) {
  const stuck = mine.filter((e) => e.outcome === 'failed' || e.outcome === 'partly');
  const index = similarityIndex(allVisible);
  return stuck.map((e) => {
    const helpers = allVisible
      .filter((x) => x.id !== e.id && x.outcome === 'worked')
      .map((x) => ({ x, score: index.cos(e.id, x.id) }))
      .filter((h) => h.score >= SIMILAR_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ x }) => ({ entry: x, who: x.owner === viewer.id ? (x.date > e.date ? 'You, later' : 'You, earlier') : nameOf(lab, x.owner) }));
    return { entry: e, helpers };
  });
}

// ---------- project timeline ----------
export function projectTimeline({ lab, state, entries, invId }) {
  const list = chrono(entries);
  const out = [`${projectOf(lab, state, invId)}: work over time`, ''];
  for (const [month, xs] of groupBy(list, (e) => e.date.slice(0, 7))) {
    out.push(formatDate(`${month}-01`, { month: 'long', year: 'numeric' }));
    const worked = xs.filter((e) => e.outcome === 'worked' && result(e));
    const failed = xs.filter((e) => e.outcome === 'failed');
    const people = [...new Set(xs.map((e) => firstOf(lab, e.owner)))];
    out.push(`- ${xs.length} ${xs.length === 1 ? 'entry' : 'entries'} by ${people.join(', ')}.`);
    const listed = new Set();
    for (const e of worked.slice(0, 4)) {
      listed.add(e.id);
      out.push(`- ${clean(did(e))}: ${clean(result(e))}.`);
    }
    for (const e of failed.slice(0, 2)) {
      listed.add(e.id);
      out.push(`- Didn't work: ${clean(did(e))}${result(e) ? ` (${clean(result(e))})` : ''}.`);
    }
    for (const e of xs.filter((e) => (e.type === 'idea' || e.type === 'protocol') && !listed.has(e.id)).slice(0, 2))
      out.push(`- ${e.type === 'idea' ? 'New idea' : 'Changed the method'}: ${clean(did(e)).replace(/^idea:\s*/i, '')}.`);
    out.push('');
  }
  if (!list.length) out.push('No entries in this range.');
  return out.join('\n').trim();
}

// ---------- techniques ----------
// The methods someone used, read from the "process used" field: "MTT, HeLa, 3 replicates" gives MTT and HeLa.
export function techniquesFrom(entries) {
  const counts = new Map();
  for (const e of entries) {
    if (!e.process) continue;
    for (let part of e.process.split(/[,;]/)) {
      part = part.trim().split(/\s+(at|for|with|in|on|from|to|every|against|instead)\s+/i)[0].trim();
      if (!part || /\d/.test(part) || part.length < 2 || part.length > 40) continue;
      if (/^(standard|same|n=|kept|pressed|standard passaging)$/i.test(part)) continue;
      if (/^[a-z]+ed$/i.test(part)) continue; // a lone verb like "Compared" isn't a technique
      const key = part.toLowerCase();
      const cur = counts.get(key) || { name: /^[a-z]+\b/.test(part) && !/[A-Z]/.test(part.split(/\s/)[0]) ? upperFirst(part) : part, n: 0, people: new Set(), latest: null };
      cur.n += 1;
      cur.people.add(e.owner);
      if (!cur.latest || e.date > cur.latest.date) cur.latest = e;
      counts.set(key, cur);
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
}

// Something that didn't work, paired with the later or similar work that fixed it.
export function problemsSolved(entries) {
  const index = similarityIndex(entries);
  const out = [];
  for (const f of chrono(entries).filter((e) => e.outcome === 'failed' || e.outcome === 'partly')) {
    const fix = entries
      .filter((x) => x.id !== f.id && x.outcome === 'worked')
      .map((x) => ({ x, score: index.cos(f.id, x.id) }))
      .filter((h) => h.score >= 0.2)
      .sort((a, b) => b.score - a.score)[0]?.x;
    if (fix) out.push({ problem: f, fix });
  }
  return out;
}

const monthYear = (iso) => formatDate(iso, { month: 'long', year: 'numeric' });

// ---------- grant: preliminary data ----------
export function grantDraft({ lab, state, entries, invId, grant }) {
  const list = chrono(entries);
  const out = [];
  const project = projectOf(lab, state, invId);
  out.push(`Preliminary data: ${project}`, '');
  if (!list.length) return { text: [...out, 'No entries for this project yet.'].join('\n'), list };
  const people = [...new Set(list.map((e) => nameOf(lab, e.owner)))];
  const worked = list.filter((e) => e.outcome === 'worked' && result(e) && e.type !== 'note');
  out.push(
    `Since ${monthYear(list[0].date)}, ${people.length > 1 ? `${people.length} members of the ${lab.lab.name}` : nameOf(lab, people[0])} have logged ${list.filter((e) => e.type !== 'note').length} experiments and analyses on this work${grant ? `, building on support from ${grant.sponsor} (${grant.title})` : ''}.`,
    ''
  );
  out.push('Key findings');
  out.push(...(worked.length ? worked.slice(-6).map((e) => `- ${clean(result(e))} (${lowerFirst(clean(did(e)))}, ${formatDate(e.date, { month: 'short', year: 'numeric' })}).`) : ['- No results marked as working yet.']));
  const tech = techniquesFrom(list).slice(0, 8);
  if (tech.length) out.push('', 'Methods established in the lab', `- ${tech.map((t) => t.name).join(', ')}.`);
  const solved = problemsSolved(list);
  if (solved.length) {
    out.push('', 'Challenges we have already addressed');
    for (const { problem, fix } of solved.slice(0, 3))
      out.push(`- ${clean(did(problem))}${result(problem) ? ` (${lowerFirst(clean(result(problem)))})` : ''}. Resolved: ${lowerFirst(clean(did(fix)))}${result(fix) ? `, ${lowerFirst(clean(result(fix)))}` : ''}.`);
  }
  const open = list.filter((e) => e.outcome === 'unclear' || e.outcome === 'partly' || e.type === 'idea');
  if (open.length) {
    out.push('', 'Open questions this proposal would address');
    for (const e of open.slice(-4)) out.push(`- ${clean(did(e)).replace(/^idea:\s*/i, '')}${e.outcome === 'partly' && result(e) ? ` (so far: ${lowerFirst(clean(result(e)))})` : ''}.`);
  }
  out.push('', `Contributors: ${people.join(', ')}.`);
  return { text: out.join('\n'), list };
}

// ---------- job application: research summary ----------
export function jobSummary({ lab, state, viewer, entries }) {
  const list = chrono(entries);
  const out = [];
  if (!list.length) return 'No entries yet. Log some work first.';
  const projects = [...new Set(list.map((e) => e.invention || ''))].map((id) => projectOf(lab, state, id));
  const tech = techniquesFrom(list);
  const worked = list.filter((e) => e.outcome === 'worked' && result(e) && e.type !== 'note');
  const ideas = list.filter((e) => e.type === 'idea');
  const solved = problemsSolved(list);
  out.push('Research summary', '');
  out.push(
    `As a ${lowerFirst(viewer.role)} in the ${lab.lab.name} (${lab.lab.department}), I work on ${projects.length > 1 ? 'two projects: ' : 'the '}${projects.map(lowerFirst).join(' and ')}. ` +
      `${tech.length ? `My work uses ${tech.slice(0, 4).map((t) => t.name).join(', ')}${tech.length > 4 ? ' and other methods' : ''}. ` : ''}` +
      `${solved.length ? `When methods failed, I found working alternatives, for example ${lowerFirst(clean(did(solved[0].fix)))}. ` : ''}` +
      `${ideas.length ? `I also proposed new directions, including ${lowerFirst(clean(did(ideas[ideas.length - 1])).replace(/^idea:\s*/i, ''))}.` : ''}`.trim(),
    ''
  );
  out.push('Highlights for a CV');
  out.push(...(worked.length ? worked.slice(-6).reverse().map((e) => `- ${clean(did(e))}: ${lowerFirst(clean(result(e)))}.`) : ['- Mark results as "Worked" and they show up here.']));
  if (tech.length) {
    out.push('', 'Techniques');
    out.push(`- ${tech.map((t) => (t.n > 1 ? `${t.name} (${t.n}x)` : t.name)).join(', ')}.`);
  }
  if (ideas.length) {
    out.push('', 'Ideas I originated');
    out.push(...ideas.map((e) => `- ${clean(did(e)).replace(/^idea:\s*/i, '')} (${formatDate(e.date, { month: 'short', year: 'numeric' })}).`));
  }
  if (solved.length) {
    out.push('', 'Problems I solved');
    out.push(...solved.slice(0, 4).map(({ problem, fix }) => `- ${clean(did(problem))} didn't work; ${lowerFirst(clean(did(fix)))} did.`));
  }
  out.push('', `Based on ${list.length} entries from ${monthYear(list[0].date)} to ${monthYear(list[list.length - 1].date)}. Add publications, talks and awards yourself.`);
  return out.join('\n');
}

// ---------- tell Rheo what you need ----------
// Matches plain-language requests to a tool and its settings. A production version would use an AI model;
// in this prototype it reads keywords, project names and time phrases.
const RULES = [
  ['grant', /\b(grants?|proposals?|preliminary data|specific aims|aims page|fellowship|r01|r21|k99|nsf|nih|funding application)\b/i],
  ['job', /\b(jobs?|cv|resume|résumé|research statement|faculty|postdoc application|position|interview|cover letter|hiring|career)\b/i],
  ['slides', /\b(slides?|deck|powerpoint|ppt|present(ation)?|lab meeting|talk)\b/i],
  ['update', /\b(update|email|e-mail|report to|tell (my )?(pi|boss|advisor)|weekly|progress|status)\b/i],
  ['methods', /\b(methods?|protocol write|write.?up (the )?procedure|materials and methods|paper|manuscript|thesis methods)\b/i],
  ['troubleshoot', /\b(fail(ed|ing|ure)?|didn'?t work|not working|troubleshoot|fix|stuck|help with|problem)\b/i],
  ['timeline', /\b(timeline|over time|history|committee|summar(y|ize|ise)|chapter|month by month|overview)\b/i],
];

export function interpret(text, { lab, state, today }) {
  const t = text.toLowerCase();
  const tool = RULES.find(([, re]) => re.test(t))?.[0] || null;
  const inv = lab.inventions.find((i) => {
    const names = [i.short, i.title, invName(state, i)].map((s) => s.toLowerCase());
    const keywords = names.flatMap((n) => n.split(/\s+/)).filter((w) => w.length > 4);
    return names.some((n) => t.includes(n)) || keywords.some((w) => t.includes(w));
  });
  let days = null;
  const m = t.match(/(last|past)\s+(\d+)?\s*(day|week|month)s?/);
  if (m) days = (Number(m[2]) || 1) * { day: 1, week: 7, month: 30 }[m[3]];
  else if (/\b(this|this past) week\b/.test(t)) days = 7;
  else if (/\btoday\b/.test(t)) days = 1;
  else if (/\byesterday\b/.test(t)) days = 2;
  const outcome = /\b(fail(ed)?|didn'?t work)\b/.test(t) ? 'failed' : /\bworked\b/.test(t) ? 'worked' : null;
  const words = t
    .replace(/[^a-z0-9µ°\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !/^(make|need|want|please|could|would|from|with|that|this|what|last|past|week|weeks|days|month|slides|email|rheo|about|some|have|help|into|based|entries|work|worked|lab)$/.test(w));
  return { tool, invention: inv?.id || null, days, outcome, words };
}
