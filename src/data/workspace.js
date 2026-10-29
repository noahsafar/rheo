// Seed data for the lab workspace: lab meetings, deadlines, grants and each member's connections.
// Like lab.json, everything here is invented. Dates are relative to the synthetic "today" (2026-10-28).

export const contacts = {
  m1: 'e.marsh@marshlab.example',
  m2: 'd.osei@marshlab.example',
  m3: 'p.raman@marshlab.example',
  m4: 't.brandt@marshlab.example',
  m5: 'm.lindqvist@marshlab.example',
  m6: 'c.vega@marshlab.example',
  m7: 'h.kim@marshlab.example',
  m8: 'j.park@marshlab.example',
};

// Tools the PI connects once for the whole lab, versus accounts each member connects themselves.
export const LAB_SOURCES = ['onedrive', 'teams', 'outlook', 'labarchives'];

// Folders in each member's own Google Drive, shown in the folder picker.
export const driveFolders = {
  m1: ['Grant drafts', 'Marsh Lab admin', 'Reviews', 'Personal'],
  m2: ['In vivo knockdown', 'Hydrogel figures', 'Job applications', 'Personal'],
  m4: ['Sweat patch data', 'Calibration runs', 'Committee', 'Photos', 'Personal'],
  m6: ['Protocols (working copies)', 'Inventory', 'Personal'],
  m8: ['On-body trial data', 'Rotation projects', 'Coursework', 'Personal'],
};
export const folderCounts = {
  'Grant drafts': 38, 'Marsh Lab admin': 112, Reviews: 21, 'In vivo knockdown': 64, 'Hydrogel figures': 47,
  'Sweat patch data': 83, 'Calibration runs': 56, Committee: 14, Photos: 220, 'Protocols (working copies)': 29,
  Inventory: 17, 'On-body trial data': 41, 'Rotation projects': 33, Coursework: 90, 'Job applications': 12,
  Personal: 0,
};

// Who had connected what before the demo starts.
export const seedConnections = {
  m2: { gdrive: ['In vivo knockdown', 'Hydrogel figures'] },
  m4: { gdrive: ['Sweat patch data', 'Calibration runs'] },
  m6: { gdrive: ['Protocols (working copies)'] },
  // Ji-woo (m8) has not connected yet: the PI sees a nudge.
};

export const grants = [
  {
    id: 'g1',
    sponsor: 'National Institutes of Health',
    title: 'Injectable depots for sustained RNA delivery',
    number: 'R01 (synthetic)',
    federal: true,
    start: '2023-06-01',
    end: '2028-05-31',
    inventions: ['inv1'],
    lastReport: '2026-01-15',
    nextReport: '2027-01-15',
    report: 'Annual progress report',
  },
  {
    id: 'g2',
    sponsor: 'Yale translational pilot fund (synthetic)',
    title: 'Microfluidic sweat lactate patch',
    number: 'Pilot award',
    federal: false,
    start: '2025-12-01',
    end: '2026-11-30',
    inventions: ['inv2'],
    lastReport: '2025-12-01',
    nextReport: '2026-12-15',
    report: 'Final report',
  },
];

// Lab meeting is every Thursday. Past decks are on file; upcoming slots show who still owes slides.
export const meetings = [
  { id: 'lm1', date: '2026-10-01', presenter: 'm6', topic: 'Updated siRNA loading protocol', invention: 'inv1', slides: 'Lab meeting 2026-10-01 – Vega.pptx' },
  { id: 'lm2', date: '2026-10-08', presenter: 'm8', topic: 'First on-body trials, subjects 1–7', invention: 'inv2', slides: 'Lab meeting 2026-10-08 – Park.pptx' },
  { id: 'lm3', date: '2026-10-15', presenter: 'm2', topic: 'In vivo knockdown at four weeks', invention: 'inv1', slides: 'Lab meeting 2026-10-15 – Osei.pptx' },
  { id: 'lm4', date: '2026-10-22', presenter: 'm4', topic: 'Calibration drift with the new membrane', invention: 'inv2', slides: 'Lab meeting 2026-10-22 – Brandt.pptx' },
  { id: 'lm5', date: '2026-10-29', presenter: 'm1', topic: 'Disclosure plan and fund application', invention: null, slides: 'Lab meeting 2026-10-29 – Marsh.pptx' },
  { id: 'lm6', date: '2026-11-05', presenter: 'm8', topic: 'Trial data, subjects 8–12', invention: 'inv2', slides: null },
  { id: 'lm7', date: '2026-11-12', presenter: 'm2', topic: 'Knockdown cohorts and handoff plan', invention: 'inv1', slides: null },
  { id: 'lm8', date: '2026-11-19', presenter: 'm6', topic: 'Methods update', invention: null, slides: null },
  { id: 'lm9', date: '2026-12-03', presenter: 'm4', topic: 'Patch v4 channels', invention: 'inv2', slides: null },
  { id: 'lm10', date: '2026-12-10', presenter: 'm2', topic: 'Final update before leaving', invention: 'inv1', slides: null },
];

// type: disclosure | funding | public | compliance | people | milestone
// owners: member ids. action tells the page which shortcut to show.
export const deadlines = [
  { id: 'd1', date: '2026-10-20', title: 'Order the new siRNA lot', type: 'milestone', owners: ['m6'], invention: 'inv1', done: true },
  { id: 'd2', date: '2026-11-04', title: 'Upload slides for the Nov 5 lab meeting', type: 'milestone', owners: ['m8'], invention: 'inv2', meeting: 'lm6' },
  { id: 'd3', date: '2026-11-10', title: 'Thesis committee meeting', type: 'milestone', owners: ['m4'], invention: null },
  { id: 'd4', date: '2026-11-13', title: 'Send the siRNA hydrogel disclosure to Yale Ventures', type: 'disclosure', owners: ['m1'], invention: 'inv1', action: 'disclosure' },
  { id: 'd5', date: '2026-11-20', title: 'Translational fund pre-proposal: sweat patch', type: 'funding', owners: ['m1', 'm4'], invention: 'inv2' },
  { id: 'd6', date: '2026-12-01', title: 'Continuing review for the on-body sweat trials', type: 'compliance', owners: ['m4'], invention: 'inv2' },
  { id: 'd7', date: '2026-12-15', title: "Daniel Osei's last day: finish the handoff", type: 'people', owners: ['m1', 'm2'], invention: 'inv1', action: 'handoff', member: 'm2' },
  { id: 'd8', date: '2026-12-15', title: 'Pilot fund final report', type: 'funding', owners: ['m1'], invention: 'inv2', action: 'report', grant: 'g2' },
  { id: 'd9', date: '2027-01-15', title: 'NIH annual progress report', type: 'funding', owners: ['m1'], invention: 'inv1', action: 'report', grant: 'g1' },
  { id: 'd10', date: '2027-02-01', title: 'Conference abstract on the sweat patch', type: 'public', owners: ['m8'], invention: 'inv2' },
];

export const DEADLINE_TYPES = {
  disclosure: 'Yale Ventures',
  funding: 'Funding',
  public: 'Public disclosure',
  compliance: 'Compliance',
  people: 'People',
  milestone: 'Lab work',
};

export const LOG_TYPES = [
  { id: 'experiment', label: 'Experiment or result', reqs: ['rtp'], kind: 'log' },
  { id: 'idea', label: 'New idea', reqs: ['conception'], kind: 'log' },
  { id: 'protocol', label: 'Protocol or method change', reqs: ['protocol'], kind: 'log' },
  { id: 'note', label: 'Note or meeting notes', reqs: [], kind: 'log' },
];
