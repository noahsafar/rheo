// Turns the raw synthetic lab plus the PI's actions into the invention record:
// readiness score, gaps, contributor ledger, timeline and the weekly digest.

export const DAY = 24 * 60 * 60 * 1000;
export const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

export const formatDate = (iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
export const formatMonth = (iso) => formatDate(iso, { month: 'short', year: 'numeric' });

export const KIND_LABEL = {
  notebook: 'Notebook entry',
  data: 'Data',
  message: 'Message',
  email: 'Email',
  figure: 'Figure',
  analysis: 'Analysis code',
  protocol: 'Protocol',
  cad: 'CAD model',
  funding: 'Funding',
  mta: 'Agreement',
  public: 'Public disclosure',
  admin: 'Admin',
  slides: 'Slides',
  reading: 'Reading',
  writing: 'Writing',
};

// Apply the PI's decisions (confirm, reject, move to lab storage) on top of the generated files.
export function effectiveFiles(lab, state) {
  return lab.files.map((f) => {
    const match = state.matches[f.id] ?? f.match;
    const moved = !!state.moved[f.id];
    return {
      ...f,
      match,
      reachable: f.reachable || moved,
      atRisk: f.atRisk && !moved,
      personalStorage: f.personalStorage && !moved,
      location: moved ? 'Lab OneDrive › Rheo records' : f.location,
      moved,
    };
  });
}

const STATUS_CREDIT = { done: 1, partial: 0.5, gap: 0 };

export function buildRecord(lab, files, state, invId) {
  const inv = lab.inventions.find((i) => i.id === invId);
  const name = state.names[invId] || inv.title;
  const mine = files.filter((f) => f.invention === invId && f.match !== 'rejected');
  const confirmed = mine.filter((f) => f.match === 'confirmed');
  const suggested = mine.filter((f) => f.match === 'suggested');
  const memberById = Object.fromEntries(lab.members.map((m) => [m.id, m]));

  const forReq = (req) => ({
    ok: confirmed.filter((f) => f.reqs.includes(req) && f.reachable),
    unreachable: confirmed.filter((f) => f.reqs.includes(req) && !f.reachable),
    atRisk: confirmed.filter((f) => f.reqs.includes(req) && f.reachable && f.atRisk),
    pending: suggested.filter((f) => f.reqs.includes(req)),
  });

  const checks = lab.requirements.map((req) => {
    const r = forReq(req.id);
    let status;
    let detail;
    if (req.id === 'contributors') {
      const missing = inv.contributors.filter(
        (c) => !confirmed.some((f) => f.owner === c.member && f.reachable)
      );
      status = missing.length === 0 ? 'done' : missing.length === 1 ? 'partial' : 'gap';
      detail =
        missing.length === 0
          ? `All ${inv.contributors.length} contributors have confirmed records`
          : `${missing.map((c) => memberById[c.member].name).join(', ')} ${missing.length === 1 ? 'has' : 'have'} no confirmed records`;
      return { ...req, status, detail, missing: missing.map((c) => c.member), evidence: [] };
    }
    if (req.id === 'public') {
      const listed = r.ok.length + r.pending.length;
      status = r.pending.length ? 'partial' : 'done';
      detail = listed === 0 ? 'None found so far' : `${r.ok.length} confirmed, ${r.pending.length} to review`;
      return { ...req, status, detail, evidence: r.ok, pending: r.pending };
    }
    if (req.id === 'mta' && state.noneNeeded[`${invId}:mta`]) {
      return { ...req, status: 'done', detail: 'Marked as none needed by the PI', evidence: [] };
    }
    let credit;
    if (r.ok.length >= req.min && r.unreachable.length === 0 && r.atRisk.length === 0) {
      status = 'done';
      detail = `${r.ok.length} confirmed`;
    } else if (r.ok.length >= req.min && r.unreachable.length > 0) {
      status = 'partial';
      detail = `${r.ok.length} confirmed, ${r.unreachable.length} outside lab accounts`;
    } else if (r.ok.length >= req.min && r.atRisk.length > 0) {
      status = 'partial';
      detail = `${r.ok.length} confirmed, ${r.atRisk.length} on an account being deleted`;
    } else if (r.ok.length > 0) {
      status = 'partial';
      detail = `${r.ok.length} confirmed${r.pending.length ? `, ${r.pending.length} to review` : ''}`;
    } else if (r.pending.length > 0) {
      // Rheo has a guess, but nobody has confirmed it: little credit until a person does
      status = 'partial';
      credit = 0.25;
      detail = `None confirmed, ${r.pending.length} to review`;
    } else {
      status = 'gap';
      detail = 'Nothing found yet';
    }
    return { ...req, status, credit, detail, evidence: r.ok, pending: r.pending, unreachable: r.unreachable };
  });

  const score = Math.round(
    checks.reduce((sum, c) => sum + c.weight * (c.credit ?? STATUS_CREDIT[c.status]), 0) /
      checks.reduce((sum, c) => sum + c.weight, 0) *
      100
  );

  // ---- gaps: the specific things standing between the lab and a complete package ----
  const gaps = [];
  const unreachable = confirmed.filter((f) => !f.reachable);
  if (unreachable.length) {
    const owner = memberById[unreachable[0].owner];
    gaps.push({
      id: `${invId}:unreachable`,
      severity: 'high',
      title: `${unreachable.length} raw data files are outside lab accounts`,
      body: `They are on ${unreachable[0].location}. Rheo found them through ${owner.name.split(' ')[0]}'s messages but can't open them. ${owner.name} ${owner.status === 'left' ? 'left the lab' : 'is'} ${owner.end ? 'on ' + formatDate(owner.end) : ''}.`,
      action: 'request',
      member: owner.id,
      files: unreachable.map((f) => f.id),
    });
  }
  const atRisk = mine.filter((f) => f.atRisk);
  if (atRisk.length) {
    const owner = memberById[atRisk[0].owner];
    const days = daysBetween(lab.lab.today, owner.accountDeletion);
    gaps.push({
      id: `${invId}:atrisk`,
      severity: 'high',
      title: `${owner.name}'s account is deleted in ${days} days`,
      body: `${atRisk.length} CAD files for this invention live only in that account. Copy them to lab storage before ${formatDate(owner.accountDeletion)}.`,
      action: 'move',
      files: atRisk.map((f) => f.id),
    });
  }
  const personal = mine.filter((f) => f.personalStorage);
  if (personal.length) {
    const owner = memberById[personal[0].owner];
    gaps.push({
      id: `${invId}:personal`,
      severity: 'medium',
      title: `${owner.name} leaves in ${daysBetween(lab.lab.today, owner.end)} days`,
      body: `${personal.length} of their records for this invention are in a personal folder. Run the handoff before ${formatDate(owner.end)}.`,
      action: 'handoff',
      member: owner.id,
    });
  }
  const contributorCheck = checks.find((c) => c.id === 'contributors');
  for (const mid of contributorCheck.missing || []) {
    const m = memberById[mid];
    const theirs = suggested.filter((f) => f.owner === mid);
    gaps.push({
      id: `${invId}:contrib:${mid}`,
      severity: 'medium',
      title: `No confirmed records from ${m.name}`,
      body: theirs.length
        ? `Rheo matched ${theirs.length} of their records. Confirm them so their part in the work is on file.`
        : `Rheo found nothing from them yet. Their work may be on paper or in a tool that isn't connected.`,
      action: theirs.length ? 'review' : null,
      member: mid,
      files: theirs.map((f) => f.id),
    });
  }
  const early = mine.filter((f) => f.flag === 'disclosed-before-filing');
  if (early.length) {
    gaps.push({
      id: `${invId}:public`,
      severity: 'warning',
      title: 'Public disclosure before any filing',
      body: `${early.map((f) => `${f.name.replace(/\.pdf$/, '')} (${formatDate(f.date)})`).join('; ')}. Rheo doesn't give legal advice: tell Yale Ventures early, since this can affect patent rights outside the US.`,
      action: null,
    });
  }
  for (const c of checks) {
    if (['contributors', 'public'].includes(c.id)) continue;
    if (c.status === 'gap') {
      gaps.push({
        id: `${invId}:missing:${c.id}`,
        severity: 'medium',
        title: `Missing: ${c.label.toLowerCase()}`,
        body: c.help,
        action: c.id === 'mta' ? 'none-needed' : null,
        req: c.id,
      });
    } else if (c.status === 'partial' && c.pending?.length && c.evidence.length === 0) {
      gaps.push({
        id: `${invId}:pending:${c.id}`,
        severity: 'low',
        title: `${c.label}: ${c.pending.length} ${c.pending.length === 1 ? 'match' : 'matches'} to confirm`,
        body: `Rheo found likely records but nobody has confirmed them yet.`,
        action: 'review',
        files: c.pending.map((f) => f.id),
      });
    }
  }

  // ---- contributor ledger ----
  const ledger = inv.contributors.map((c) => {
    const m = memberById[c.member];
    const recs = mine.filter((f) => f.owner === c.member);
    const conf = recs.filter((f) => f.match === 'confirmed');
    const dates = recs.map((f) => f.date).sort();
    const keyRecord =
      recs.find((f) => f.reqs.includes('conception') && f.match === 'confirmed') ||
      conf.find((f) => f.reqs.includes('protocol')) ||
      conf[0] ||
      recs[0];
    return {
      member: m,
      roles: c.roles,
      confirmed: conf.length,
      suggested: recs.length - conf.length,
      first: dates[0],
      last: dates[dates.length - 1],
      keyRecord,
    };
  });

  // ---- key dates ----
  const conceptionRecs = mine.filter((f) => f.reqs.includes('conception')).sort((a, b) => (a.date < b.date ? -1 : 1));
  const keyDates = [
    conceptionRecs[0] && { date: conceptionRecs[0].date, label: 'Earliest record of the idea', file: conceptionRecs[0] },
    ...early.map((f) => ({ date: f.date, label: f.kind === 'public' ? `Public: ${f.name.replace(/\.pdf$/, '')}` : f.name, file: f, flag: true })),
  ].filter(Boolean);

  // Pilot metric: share of the record the lab can open today without chasing someone who left.
  const openable = confirmed.filter((f) => f.reachable && !f.atRisk).length;
  const retrievable = {
    n: openable,
    total: confirmed.length,
    pct: confirmed.length ? Math.floor((openable / confirmed.length) * 100) : 100,
  };

  return { inv, name, files: mine, confirmed, suggested, checks, score, gaps, ledger, keyDates, retrievable };
}

// The weekly digest: a short, ranked list so confirming takes about five minutes.
export function digest(lab, files, limit = 12) {
  const rank = (f) =>
    (f.reqs.length ? 2 : 0) + (f.flag ? 1.5 : 0) + f.confidence + (f.owner === 'm7' ? 1 : 0);
  return files
    .filter((f) => f.match === 'suggested' && f.invention)
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit);
}

export const pendingCount = (files) => files.filter((f) => f.match === 'suggested' && f.invention).length;
