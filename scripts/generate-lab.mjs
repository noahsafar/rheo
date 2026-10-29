// Generates the synthetic lab used by the Rheo prototype.
// Everything here is invented: the lab, people, files and inventions are fictional.
//
//   npm run generate   ->   writes src/data/lab.json
//
// The generator is seeded, so it produces the same lab every time unless you change SEED.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = 20261028;
const TODAY = '2026-10-28';
const TARGET_FILES = 1200;

// ---------- seeded random ----------
let s = SEED;
const rand = () => {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pad = (n, w = 2) => String(n).padStart(w, '0');

const toDate = (str) => new Date(str + 'T12:00:00Z');
const fmt = (d) => d.toISOString().slice(0, 10);
const between = (a, b) => {
  const t0 = toDate(a).getTime();
  const t1 = toDate(b).getTime();
  return fmt(new Date(t0 + rand() * (t1 - t0)));
};
const minDate = (a, b) => (a < b ? a : b);
const maxDate = (a, b) => (a > b ? a : b);

// ---------- the lab ----------
const lab = {
  name: 'Marsh Lab',
  pi: 'Elena Marsh',
  department: 'Biomedical Engineering',
  institution: 'Yale University (synthetic)',
  today: TODAY,
  synthetic: true,
};

const sources = [
  { id: 'onedrive', name: 'OneDrive', kind: 'Files', note: 'Lab and personal Yale accounts' },
  { id: 'teams', name: 'Microsoft Teams', kind: 'Chat', note: 'Lab team, 6 channels' },
  { id: 'outlook', name: 'Outlook', kind: 'Email', note: 'Lab members who opted in' },
  { id: 'labarchives', name: 'LabArchives', kind: 'Notebook', note: 'Lab notebook, 4 shared notebooks' },
  { id: 'gdrive', name: 'Google Drive', kind: 'Files', note: 'Shared lab folder only' },
];

const members = [
  { id: 'm1', name: 'Elena Marsh', role: 'Principal investigator', start: '2015-07-01', end: null, status: 'active' },
  { id: 'm2', name: 'Daniel Osei', role: 'Postdoctoral fellow', start: '2022-08-15', end: '2026-12-15', status: 'leaving', leavingNote: 'Starting a faculty position in January' },
  { id: 'm3', name: 'Priya Raman', role: 'PhD student', start: '2020-09-01', end: '2025-05-30', status: 'left', leftNote: 'Graduated, now in industry' },
  { id: 'm4', name: 'Tom Brandt', role: 'PhD student', start: '2022-09-01', end: null, status: 'active' },
  { id: 'm5', name: 'Maya Lindqvist', role: 'PhD student', start: '2021-09-01', end: '2026-01-16', status: 'left', leftNote: 'Left the program for an engineering job', accountDeletion: '2026-12-15' },
  { id: 'm6', name: 'Carlos Vega', role: 'Research technician', start: '2021-03-15', end: null, status: 'active' },
  { id: 'm7', name: 'Hana Kim', role: 'Summer undergraduate', start: '2025-06-02', end: '2025-08-15', status: 'left', leftNote: 'Summer research program ended' },
  { id: 'm8', name: 'Ji-woo Park', role: 'PhD student', start: '2024-09-01', end: null, status: 'active' },
];
const byId = Object.fromEntries(members.map((m) => [m.id, m]));
const activeWindow = (m, from, to) => [maxDate(m.start, from), minDate(m.end || TODAY, to)];

const inventions = [
  {
    id: 'inv1',
    title: 'Thermoresponsive hydrogel for sustained siRNA release',
    short: 'siRNA hydrogel',
    summary:
      'An injectable polymer gel that is liquid at room temperature, sets at body temperature and releases siRNA over about four weeks.',
    started: '2023-03-01',
    stage: 'Preparing disclosure',
    contributors: [
      { member: 'm1', roles: ['Conception'] },
      { member: 'm3', roles: ['Conception', 'Reduction to practice'] },
      { member: 'm2', roles: ['Reduction to practice'] },
      { member: 'm7', roles: ['Data'] },
      { member: 'm6', roles: ['Methods'] },
    ],
  },
  {
    id: 'inv2',
    title: 'Low-cost microfluidic patch for continuous sweat lactate',
    short: 'Sweat lactate patch',
    summary:
      'A disposable skin patch whose printed channels pull sweat across an enzymatic sensor, giving lactate readings every few minutes during exercise.',
    started: '2024-01-15',
    stage: 'Early record',
    contributors: [
      { member: 'm1', roles: ['Conception'] },
      { member: 'm5', roles: ['Conception', 'Design'] },
      { member: 'm4', roles: ['Reduction to practice'] },
      { member: 'm8', roles: ['Data'] },
    ],
  },
];

// What a complete disclosure package needs (option A's checklist, kept as the readiness score).
const requirements = [
  { id: 'conception', label: 'Dated record of the idea', help: 'The earliest dated note, message or sketch that shows the idea and who had it.', min: 1, weight: 20 },
  { id: 'rtp', label: 'Data showing it works', help: 'Experimental results that show the invention does what the disclosure claims.', min: 6, weight: 20 },
  { id: 'protocol', label: 'Methods someone else could repeat', help: 'Current protocols, with versions, for making and testing the invention.', min: 2, weight: 15 },
  { id: 'contributors', label: 'Every contributor accounted for', help: 'Each person who worked on it has at least one confirmed record. Inventorship itself is decided by patent counsel.', min: 1, weight: 15 },
  { id: 'public', label: 'Public disclosures listed', help: 'Talks, posters, abstracts, theses and preprints that mention the work, with dates.', min: 0, weight: 10 },
  { id: 'funding', label: 'Funding sources', help: 'Grants and agreements that supported the work, since sponsors can have rights.', min: 1, weight: 10 },
  { id: 'mta', label: 'Outside materials and agreements', help: 'Material transfer agreements or licenses for anything the lab received from outside.', min: 1, weight: 10 },
];

// ---------- file factory ----------
const files = [];
let nextId = 1;
const add = (f) => {
  const file = {
    id: 'f' + pad(nextId++, 4),
    invention: null,
    reqs: [],
    match: 'none', // none | suggested | confirmed | rejected
    confidence: null,
    reachable: true,
    ...f,
  };
  files.push(file);
  return file;
};

// Name templates by kind. Each returns { name, source, snippet? }
const T = {
  inv1: {
    notebook: () => ({ source: 'labarchives', name: `${pick(['Gel formulation', 'Gelation test', 'Release study', 'siRNA loading', 'Rheology run', 'Swelling test'])} – ${pick(['PEG-PLGA-PEG', 'triblock batch', 'low-MW batch', 'N/P 10', 'N/P 20'])} ${int(10, 25)}% w/v` }),
    data: () => {
      const t = pick([
        () => `rheology_sweep_${pick(['25C', '32C', '37C'])}_run${pad(int(1, 30))}.csv`,
        () => `release_assay_day${pick([1, 3, 7, 14, 21, 28])}_plate${int(1, 6)}.xlsx`,
        () => `knockdown_qPCR_${pick(['GAPDH', 'VEGF', 'TNF'])}_rep${int(1, 4)}.xlsx`,
        () => `gel_point_DSC_${pick(['A', 'B', 'C'])}${int(1, 9)}.txt`,
        () => `viability_MTT_${pick(['24h', '48h', '72h'])}.csv`,
      ]);
      return { source: pick(['onedrive', 'onedrive', 'gdrive']), name: t() };
    },
    protocol: () => ({ source: pick(['onedrive', 'labarchives']), name: `Protocol – ${pick(['siRNA loading', 'gel casting', 'in vitro release', 'rheology'])} v${int(1, 5)}.docx` }),
    message: () => ({ source: 'teams', name: `#hydrogel – ${pick(['gelation results', 'release curve update', 'batch issue', 'next steps on loading', 'qPCR came back'])}` , snippet: pick([
      'Gelation at 32 °C again, third batch in a row.',
      'Day 21 release still above 40%, posting the plot now.',
      'Knockdown holds at 4 weeks in the 15% gel.',
      'Can someone check the N/P 20 batch before Friday?',
      'Updated the loading protocol, v3 is in the folder.',
    ]) }),
    email: () => ({ source: 'outlook', name: `Re: ${pick(['hydrogel results for committee', 'polymer supplier quote', 'siRNA order', 'rheometer booking'])}` }),
    figure: () => ({ source: pick(['onedrive', 'gdrive']), name: `fig_${pick(['release_curve', 'gelation_temp', 'knockdown', 'viscosity'])}_${pick(['v1', 'v2', 'final', 'final2'])}.png` }),
    analysis: () => ({ source: 'onedrive', name: `${pick(['fit_release_kinetics', 'rheology_moduli', 'qpcr_ddct'])}.${pick(['py', 'R', 'ipynb'])}` }),
  },
  inv2: {
    notebook: () => ({ source: 'labarchives', name: `${pick(['Channel print', 'Enzyme layer', 'Calibration', 'On-body test', 'Wicking test'])} – ${pick(['lactate oxidase', 'PDMS v2', 'paper wick', 'Prussian blue', 'ramp test'])}` }),
    data: () => {
      const t = pick([
        () => `calibration_lactate_${pick(['0-25mM', '0-10mM'])}_chip${int(1, 40)}.csv`,
        () => `onbody_trial_S${pad(int(1, 12))}_${pick(['bike', 'run', 'rest'])}.csv`,
        () => `flow_rate_channel_${pick(['A', 'B', 'C'])}${int(1, 9)}.xlsx`,
        () => `amperometry_${pick(['drift', 'noise', 'response'])}_${int(1, 20)}.txt`,
      ]);
      return { source: pick(['onedrive', 'gdrive']), name: t() };
    },
    protocol: () => ({ source: pick(['onedrive', 'labarchives']), name: `Protocol – ${pick(['patch assembly', 'enzyme immobilization', 'on-body testing', 'sensor calibration'])} v${int(1, 4)}.docx` }),
    message: () => ({ source: 'teams', name: `#sweat-patch – ${pick(['channel prints', 'calibration drift', 'trial schedule', 'new enzyme layer', 'IRB question'])}`, snippet: pick([
      'v3 channels fill in under 2 minutes now.',
      'Drift is down to 4% over an hour with the new membrane.',
      'Subject 7 data looks clean, uploading.',
      'Can we try the paper wick instead of PDMS?',
      'Calibration curve is linear to 20 mM.',
    ]) }),
    email: () => ({ source: 'outlook', name: `Re: ${pick(['patch prototype for the fund application', 'enzyme supplier', 'on-body trial consent forms', 'printer resin order'])}` }),
    figure: () => ({ source: 'onedrive', name: `fig_${pick(['calibration', 'onbody_trace', 'channel_fill', 'patch_photo'])}_${pick(['v1', 'v2', 'final'])}.png` }),
    cad: () => ({ source: 'onedrive', name: `lactate_patch_${pick(['channel', 'housing', 'wick', 'electrode'])}_v${int(1, 3)}.SLDPRT` }),
  },
};

const generic = [
  () => ({ source: 'outlook', name: `PO ${int(4000, 4999)} – ${pick(['pipette tips', 'PBS', 'gloves', 'cell culture media', 'PDMS kit', 'centrifuge tubes'])}.pdf`, kind: 'admin' }),
  () => ({ source: 'onedrive', name: `Lab meeting ${between('2023-01-01', TODAY)}.pptx`, kind: 'slides' }),
  () => ({ source: 'teams', name: `#general – ${pick(['freezer alarm', 'lab cleanup Friday', 'who has the rheometer', 'safety training reminder', 'pizza in the lounge'])}`, kind: 'message' }),
  () => ({ source: 'onedrive', name: `collagen_scaffold_${pick(['SEM', 'porosity', 'tensile'])}_${int(1, 60)}.${pick(['tif', 'csv', 'xlsx'])}`, kind: 'data' }),
  () => ({ source: 'labarchives', name: `Collagen scaffold – ${pick(['crosslinking', 'seeding', 'imaging', 'mechanical test'])}`, kind: 'notebook' }),
  () => ({ source: 'gdrive', name: `Journal club – ${pick(['hydrogels review', 'wearables 2025', 'RNAi delivery', 'scaffold vascularization'])}.pdf`, kind: 'reading' }),
  () => ({ source: 'outlook', name: `${pick(['Seminar', 'Department', 'EHS', 'Grad office'])}: ${pick(['schedule change', 'reminder', 'new policy', 'room booking'])}`, kind: 'email' }),
  () => ({ source: 'onedrive', name: `${pick(['Thesis chapter', 'Committee report', 'Qual proposal'])} – ${pick(['draft', 'v2', 'comments'])}.docx`, kind: 'writing' }),
];

// ---------- invention records ----------
function inventionRecords(inv, plan) {
  for (const p of plan) {
    const m = byId[p.member];
    const [from, to] = activeWindow(m, p.from || inv.started, p.to || TODAY);
    for (let i = 0; i < p.n; i++) {
      const kind = pick(p.kinds);
      const base = T[inv.id][kind]();
      add({
        ...base,
        kind,
        owner: m.id,
        date: between(from, to),
        invention: inv.id,
        reqs: kind === 'data' || kind === 'figure' ? ['rtp'] : kind === 'protocol' ? ['protocol'] : [],
        match: rand() < p.confirmed ? 'confirmed' : 'suggested',
        confidence: Math.round((0.62 + rand() * 0.36) * 100) / 100,
      });
    }
  }
}

// Invention 1: siRNA hydrogel
inventionRecords(inventions[0], [
  { member: 'm3', n: 70, kinds: ['notebook', 'data', 'data', 'message', 'figure', 'analysis', 'protocol'], confirmed: 0.7 },
  { member: 'm2', n: 58, kinds: ['notebook', 'data', 'data', 'message', 'figure', 'email'], confirmed: 0.72 },
  { member: 'm1', n: 18, kinds: ['message', 'email', 'figure'], confirmed: 0.8 },
  { member: 'm6', n: 14, kinds: ['protocol', 'notebook', 'message'], confirmed: 0.75 },
  { member: 'm7', n: 3, kinds: ['message', 'data'], confirmed: 0 }, // Hana: nothing confirmed
]);

// Invention 2: sweat lactate patch
inventionRecords(inventions[1], [
  { member: 'm5', n: 46, kinds: ['cad', 'cad', 'notebook', 'message', 'data', 'figure'], confirmed: 0.55 },
  { member: 'm4', n: 52, kinds: ['data', 'data', 'notebook', 'message', 'figure', 'protocol'], confirmed: 0.5 },
  { member: 'm8', n: 22, kinds: ['data', 'notebook', 'message'], confirmed: 0.35 },
  { member: 'm1', n: 10, kinds: ['message', 'email'], confirmed: 0.7 },
]);

// ---------- hand-placed records: the evidence that makes or breaks each package ----------
const special = (f) => add({ confidence: 0.95, reachable: true, ...f });

// inv1 conception: a dated notebook entry, confirmed
special({ source: 'labarchives', kind: 'notebook', name: 'Idea: PEG-PLGA gel as an siRNA depot (sketch + rationale)', owner: 'm3', date: '2023-03-14', invention: 'inv1', reqs: ['conception'], match: 'confirmed', snippet: 'First entry proposing the thermoresponsive depot. Witnessed by E. Marsh on 2023-03-16.' });
special({ source: 'teams', kind: 'message', name: '#hydrogel – could the gel hold siRNA?', owner: 'm1', date: '2023-03-09', invention: 'inv1', reqs: ['conception'], match: 'confirmed', snippet: 'What if the triblock gel carried the siRNA itself instead of nanoparticles?' });

// inv1 protocols
special({ source: 'onedrive', kind: 'protocol', name: 'Protocol – siRNA loading v4 (current).docx', owner: 'm6', date: '2025-09-30', invention: 'inv1', reqs: ['protocol'], match: 'confirmed' });

// inv1 funding + MTA
special({ source: 'onedrive', kind: 'funding', name: 'R01 Specific Aims – injectable depots.pdf', owner: 'm1', date: '2023-06-02', invention: 'inv1', reqs: ['funding'], match: 'confirmed' });
special({ source: 'outlook', kind: 'mta', name: 'MTA – siRNA library from supplier (executed).pdf', owner: 'm1', date: '2023-05-11', invention: 'inv1', reqs: ['mta'], match: 'confirmed' });

// inv1 public disclosure, submitted BEFORE any filing -> flagged
special({ source: 'outlook', kind: 'public', name: 'BMES 2025 abstract – injectable siRNA depot (submitted).pdf', owner: 'm3', date: '2025-04-18', invention: 'inv1', reqs: ['public'], match: 'confirmed', flag: 'disclosed-before-filing', snippet: 'Abstract describes the gel composition and 4-week release. Published in the conference program October 2025.' });
special({ source: 'onedrive', kind: 'public', name: 'Raman PhD thesis – Chapter 4 (deposited).pdf', owner: 'm3', date: '2025-05-20', invention: 'inv1', reqs: ['public'], match: 'suggested', flag: 'disclosed-before-filing', confidence: 0.88, snippet: 'Thesis chapter on the hydrogel. Deposited theses can become public after an embargo period.' });

// inv1: Priya's raw rheology data lives on her personal Google Drive. Rheo only sees Teams messages pointing to it.
for (let i = 0; i < 14; i++) {
  special({ source: 'gdrive', kind: 'data', name: `rheology_raw_${pick(['25C', '32C', '37C'])}_batch${pad(i + 1)}.csv`, owner: 'm3', date: between('2023-09-01', '2024-06-30'), invention: 'inv1', reqs: ['rtp'], match: 'confirmed', reachable: false, location: "Priya Raman's personal Google Drive", confidence: 0.9 });
}
special({ source: 'teams', kind: 'message', name: '#hydrogel – where the raw rheology files are', owner: 'm3', date: '2024-07-02', invention: 'inv1', reqs: [], match: 'confirmed', snippet: "All the raw rheometer exports are on my personal Drive, I'll move them to the lab folder later." });

// inv1: Hana's summer work exists only as a photo of a paper notebook page
special({ source: 'teams', kind: 'message', name: '#hydrogel – photo of notebook p. 22 (release assay)', owner: 'm7', date: '2025-07-24', invention: 'inv1', reqs: [], match: 'suggested', confidence: 0.81, snippet: 'Photo of a handwritten page: day 7 and day 14 release readings for 3 gel batches.' });

// inv2 conception: a Teams thread, still unconfirmed (shows up in the digest)
special({ source: 'teams', kind: 'message', name: '#sweat-patch – could capillary channels replace the pump?', owner: 'm5', date: '2024-01-22', invention: 'inv2', reqs: ['conception'], match: 'suggested', confidence: 0.86, snippet: 'If we print the channels to wick sweat across the enzyme layer, we drop the pump entirely.' });
special({ source: 'labarchives', kind: 'notebook', name: 'Patch concept – channel geometry sketches', owner: 'm5', date: '2024-02-05', invention: 'inv2', reqs: ['conception'], match: 'suggested', confidence: 0.83 });

// inv2 protocols: one confirmed
special({ source: 'onedrive', kind: 'protocol', name: 'Protocol – patch assembly v3 (current).docx', owner: 'm4', date: '2026-03-10', invention: 'inv2', reqs: ['protocol'], match: 'confirmed' });

// inv2 funding: suggested only. MTA: none exists -> gap.
special({ source: 'outlook', kind: 'funding', name: 'Translational pilot fund – application (sweat patch).pdf', owner: 'm1', date: '2025-11-03', invention: 'inv2', reqs: ['funding'], match: 'suggested', confidence: 0.92 });

// inv2: Maya's CAD is reachable today, but her account is scheduled for deletion
for (let i = 1; i <= 3; i++) {
  special({ source: 'onedrive', kind: 'cad', name: `lactate_patch_assembly_v${i}.SLDASM`, owner: 'm5', date: ['2024-04-11', '2024-11-02', '2025-08-19'][i - 1], invention: 'inv2', reqs: ['rtp'], match: i === 3 ? 'suggested' : 'confirmed', location: "Maya Lindqvist's OneDrive (deleted Dec 15, 2026)", atRisk: true, confidence: 0.94 });
}

// Daniel is leaving: a few of his records still sit only in his personal OneDrive
for (let i = 0; i < 9; i++) {
  special({ source: 'onedrive', kind: 'data', name: `knockdown_invivo_${pick(['mouse', 'pilot'])}_${pad(i + 1)}.xlsx`, owner: 'm2', date: between('2026-04-01', '2026-10-15'), invention: 'inv1', reqs: ['rtp'], match: i < 4 ? 'confirmed' : 'suggested', location: "Daniel Osei's personal OneDrive", personalStorage: true, confidence: 0.87 });
}

// ---------- the rest of the lab's life ----------
while (files.length < TARGET_FILES) {
  const g = pick(generic)();
  const m = pick(members);
  const [from, to] = activeWindow(m, '2023-01-01', TODAY);
  if (from > to) continue;
  // a few unrelated files get low-confidence suggestions (realistic false positives for the digest)
  const falsePositive = rand() < 0.015;
  add({
    ...g,
    owner: m.id,
    date: between(from, to),
    invention: falsePositive ? pick(['inv1', 'inv2']) : null,
    match: falsePositive ? 'suggested' : 'none',
    confidence: falsePositive ? Math.round((0.51 + rand() * 0.12) * 100) / 100 : null,
    falsePositive: falsePositive || undefined,
  });
}

files.sort((a, b) => (a.date < b.date ? -1 : 1));

const out = { lab, sources, members, inventions, requirements, files };
const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/data/lab.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out));

const count = (fn) => files.filter(fn).length;
console.log(`Wrote ${files.length} files to ${target}`);
console.log(`  members: ${members.length} (${members.filter((m) => m.status === 'left').length} left, ${members.filter((m) => m.status === 'leaving').length} leaving)`);
for (const inv of inventions) {
  console.log(`  ${inv.short}: ${count((f) => f.invention === inv.id && f.match === 'confirmed')} confirmed, ${count((f) => f.invention === inv.id && f.match === 'suggested')} suggested`);
}
console.log(`  unreachable: ${count((f) => !f.reachable)}, false positives: ${count((f) => f.falsePositive)}`);
