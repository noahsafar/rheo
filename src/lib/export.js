import { formatDate, KIND_LABEL } from './record.js';

const memberName = (lab, id) => lab.members.find((m) => m.id === id)?.name ?? id;

// The disclosure package as a readable document for Yale Ventures.
export function packageMarkdown(lab, rec) {
  const { inv } = rec;
  const L = [];
  L.push(`# Invention disclosure package: ${rec.name}`);
  L.push('');
  L.push(`Lab: ${lab.lab.name}, ${lab.lab.department}, ${lab.lab.institution}`);
  L.push(`Principal investigator: ${lab.lab.pi}`);
  L.push(`Prepared by Rheo on ${formatDate(lab.lab.today)}. Readiness: ${rec.score}/100.`);
  L.push('');
  L.push('> Synthetic demo data. Rheo assembles evidence; it does not decide inventorship or give legal advice.');
  L.push('');
  L.push('## Summary');
  L.push(inv.summary);
  L.push('');
  L.push('## Key dates');
  for (const k of rec.keyDates) L.push(`- ${formatDate(k.date)}: ${k.label}${k.flag ? ' (disclosed before any filing)' : ''}`);
  L.push('');
  L.push('## Contributors and evidence');
  L.push('| Person | Lab role | Contribution | Confirmed records | Active on this work |');
  L.push('|---|---|---|---|---|');
  for (const c of rec.ledger) {
    L.push(
      `| ${c.member.name} | ${c.member.role}${c.member.status === 'left' ? ` (left ${formatDate(c.member.end)})` : ''} | ${c.roles.join(', ')} | ${c.confirmed} | ${c.first ? `${formatDate(c.first)} – ${formatDate(c.last)}` : '—'} |`
    );
  }
  L.push('');
  L.push('## Checklist');
  for (const c of rec.checks) {
    const mark = c.status === 'done' ? '[x]' : '[ ]';
    L.push(`- ${mark} ${c.label}: ${c.detail}`);
  }
  L.push('');
  L.push('## Open items');
  if (rec.gaps.length === 0) L.push('None.');
  for (const g of rec.gaps) L.push(`- ${g.title}. ${g.body}`);
  L.push('');
  const section = (title, req) => {
    const list = rec.confirmed.filter((f) => f.reqs.includes(req));
    if (!list.length) return;
    L.push(`## ${title}`);
    for (const f of list) L.push(`- ${formatDate(f.date)}: ${f.name} (${memberName(lab, f.owner)}, ${f.reachable ? f.source : 'not reachable'})`);
    L.push('');
  };
  section('Record of conception', 'conception');
  section('Protocols', 'protocol');
  section('Public disclosures', 'public');
  section('Funding', 'funding');
  section('Agreements', 'mta');
  L.push(`## Records index`);
  L.push(`${rec.confirmed.length} confirmed records are listed in records-index.csv.`);
  return L.join('\n');
}

export function recordsCsv(lab, rec) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['date', 'name', 'type', 'owner', 'source', 'supports', 'reachable', 'location'];
  const rows = rec.confirmed
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((f) => [f.date, f.name, KIND_LABEL[f.kind] ?? f.kind, memberName(lab, f.owner), f.source, f.reqs.join(' '), f.reachable ? 'yes' : 'no', f.location ?? '']);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

// Structured intake format a tech transfer office could load (option D's export format).
export function intakeJson(lab, rec) {
  return JSON.stringify(
    {
      format: 'rheo-disclosure/0.1',
      generated: lab.lab.today,
      synthetic: true,
      lab: lab.lab,
      invention: { id: rec.inv.id, title: rec.name, summary: rec.inv.summary, readiness: rec.score },
      contributors: rec.ledger.map((c) => ({
        name: c.member.name,
        labRole: c.member.role,
        status: c.member.status,
        left: c.member.end && c.member.status === 'left' ? c.member.end : null,
        contribution: c.roles,
        confirmedRecords: c.confirmed,
      })),
      keyDates: rec.keyDates.map((k) => ({ date: k.date, label: k.label, disclosedBeforeFiling: !!k.flag })),
      checklist: rec.checks.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail })),
      openItems: rec.gaps.map((g) => ({ title: g.title, detail: g.body, severity: g.severity })),
      records: rec.confirmed.map((f) => ({ id: f.id, date: f.date, name: f.name, kind: f.kind, owner: memberName(lab, f.owner), source: f.source, supports: f.reqs, reachable: f.reachable })),
    },
    null,
    2
  );
}

export function download(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);

// A grant progress report draft: what the lab did on the funded work since the last report.
export function progressReportMarkdown(lab, grant, { records, files, meetings, sent, slidesFor }) {
  const since = grant.lastReport;
  const name = (id) => lab.members.find((m) => m.id === id)?.name ?? id;
  const L = [];
  L.push(`# ${grant.report}: ${grant.title}`);
  L.push('');
  L.push(`Sponsor: ${grant.sponsor} (${grant.number})`);
  L.push(`Award period: ${formatDate(grant.start)} to ${formatDate(grant.end)}`);
  L.push(`Reporting period: ${formatDate(since)} to ${formatDate(lab.lab.today)}`);
  L.push(`Principal investigator: ${lab.lab.pi}, ${lab.lab.name}`);
  L.push('');
  L.push('> Draft built by Rheo from the lab record (synthetic demo data). Edit before submitting.');
  L.push('');
  for (const invId of grant.inventions) {
    const rec = records[invId];
    const recent = rec.confirmed.filter((f) => f.date >= since);
    L.push(`## ${rec.name}`);
    L.push(rec.inv.summary);
    L.push('');
    L.push(`- ${recent.length} new records this period (${recent.filter((f) => f.reqs.includes('rtp')).length} results, ${recent.filter((f) => f.reqs.includes('protocol')).length} protocols)`);
    L.push(`- Readiness for patent disclosure: ${rec.score}/100`);
    L.push(`- Invention disclosure to Yale Ventures: ${sent[invId] ? `sent ${formatDate(sent[invId])}` : 'not yet sent'}`);
    if (grant.federal)
      L.push('- Federally funded: Yale Ventures reports the invention to the agency once it is disclosed.');
    L.push('');
    L.push('### People who worked on it');
    for (const c of rec.ledger) {
      const n = recent.filter((f) => f.owner === c.member.id).length;
      if (n) L.push(`- ${c.member.name}, ${c.member.role}: ${c.roles.join(', ').toLowerCase()} (${n} ${n === 1 ? 'record' : 'records'})`);
    }
    L.push('');
    const shown = meetings.filter((m) => m.invention === invId && m.date >= since && m.date <= lab.lab.today);
    if (shown.length) {
      L.push('### Presented at lab meeting');
      for (const m of shown) L.push(`- ${formatDate(m.date)}: ${m.topic} (${name(m.presenter)})${slidesFor(m) ? `, slides: ${slidesFor(m)}` : ''}`);
      L.push('');
    }
    const pub = rec.confirmed.filter((f) => f.kind === 'public');
    if (pub.length) {
      L.push('### Abstracts, posters and theses');
      for (const f of pub) L.push(`- ${formatDate(f.date)}: ${f.name.replace(/\.pdf$/, '')}`);
      L.push('');
    }
    const results = recent
      .filter((f) => f.reqs.length && !['data', 'figure', 'analysis'].includes(f.kind))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 10);
    if (results.length) {
      L.push('### Notebook entries and logged results');
      for (const f of results) L.push(`- ${formatDate(f.date)}: ${f.name}${f.snippet ? `. ${f.snippet}` : ''}`);
      L.push('');
    }
    const data = recent.filter((f) => ['data', 'figure', 'analysis'].includes(f.kind));
    if (data.length) {
      L.push(`### Data files`);
      L.push(`${data.length} data files, figures and analysis scripts were added this period. The full list is in the records index.`);
      L.push('');
    }
  }
  return L.join('\n');
}
