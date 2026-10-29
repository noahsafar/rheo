# Rheo

Rheo builds the record behind a lab's inventions from the tools the lab already uses, so the handoff to the tech transfer office takes days instead of a last-minute hunt for missing files.

This repo is the first prototype, running on a synthetic lab. Every person, file and invention in it is invented.

**Try it in your browser:** https://noahsafar.github.io/rheo/ (no install). The lab page has a four-step guide that takes about five minutes.

How we chose this design, from constraints to the options we explored, is in [docs/solution-space.md](docs/solution-space.md).

The Versatilists: Bryn, Noah, Pola, Yuto.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

`npm run build` makes a static site in `dist/` that can be hosted anywhere. Every push to `main` publishes it to GitHub Pages through `.github/workflows/pages.yml`.

## What the prototype shows

| Screen | What it demonstrates |
|---|---|
| Setup | Connect five tools read-only, index 1,200 records, name two inventions (about 10 minutes in real life) |
| Lab | Readiness score per invention, who has left, who is leaving |
| Invention | Readiness checklist, open items with fixes, timeline by contributor, contributor ledger, every record, and the pilot metric: share of records the lab can open without contacting someone who left |
| Weekly digest | 12 ranked matches to confirm or reject, including two false positives (about 5 minutes). Also shown as the Monday email the PI would get, with the same buttons |
| Handoffs | Offboarding for someone leaving, recovery for people who already left |
| Export | One-click disclosure package: readable document, records index CSV, structured intake JSON |

### Lab workspace: two kinds of account

Use **Signed in as** in the top right to switch between the PI and any lab member. In the real product the NetID sign-in decides this.

**Lab members see only their own work:**

| Screen | What it does |
|---|---|
| My work | Log an experiment, idea, protocol change or note in under a minute; confirm Rheo's matches on their own files; see their deadlines and lab meeting slots |
| My sources | Connect their own Google Drive by picking folders (Docs, Sheets and Slides included); photograph paper notebook pages and check the date and page before saving |
| Lab meetings | The schedule, plus uploading their own slides |
| My deadlines | Only what's assigned to them |

Pages for the whole lab show "Only the PI can see this page" to members.

**The PI sees everything:**

| Screen | What it does |
|---|---|
| Overview | Adds what's coming in from members this week and what's due in the next 30 days |
| People | Everyone's records, connections and pending confirmations; add a member and send an invite; open any member's page |
| Lab meetings | Who presents when, which decks are missing, past decks on file; schedule meetings |
| Deadlines | Grant reports, Yale Ventures disclosures, compliance, public-disclosure warnings and lab milestones; assign them to people |
| Funding & Yale Ventures | Send each invention's disclosure to Yale Ventures; build a grant progress report draft from the record since the last report |

Everything members add (log entries, notebook pages, slides) becomes a record on the invention, so it raises the readiness score. Try it: sign in as Tom Brandt, log a "New idea" on the sweat patch, then switch back to Elena and watch the score move from 57.

Google sign-in and email invites are simulated. Photo upload works for real, but the photos stay in your browser.

Use "Reset demo" in the footer to start over. Progress is saved in the browser.

## The synthetic lab

`scripts/generate-lab.mjs` writes `src/data/lab.json`. Run `npm run generate` after editing it.

- **Marsh Lab**, Biomedical Engineering. 8 members: 3 have left, 1 leaves in December.
- **1,200 records** across OneDrive, Teams, Outlook, LabArchives and Google Drive.
- **Invention 1, siRNA hydrogel** (starts at 78/100). Problems planted: 14 raw data files on a graduated student's personal Google Drive, a summer undergrad whose work exists only as a photo of a paper notebook page, a conference abstract and thesis chapter made public before any filing, and a postdoc leaving with records in a personal folder.
- **Invention 2, sweat lactate patch** (starts at 57/100). Problems planted: the idea's earliest record is unconfirmed, the CAD files sit in a departed student's account that is deleted in 48 days, funding is unconfirmed and no material transfer agreement is on file.

Resolving the open items on invention 1 takes it to 100. The pre-filing disclosure stays listed in the package on purpose: Yale Ventures needs to know about it either way.

## How it's built

- React 18 and Vite, plain CSS, no backend.
- `src/lib/record.js` turns files plus the PI's decisions into the readiness score, open items, ledger and digest.
- `src/lib/export.js` builds the disclosure package.
- `src/data/workspace.js` seeds lab meetings, deadlines, grants and members' Drive folders; `src/lib/workspace.js` holds what the lab adds and the access rules (`canSee`, `isPI`).
- `src/views/` has one file per screen; `src/components/` holds the timeline, readiness checklist, record row and export dialog.

## Not in v1

Rheo doesn't store files, replace the lab notebook or decide inventorship. It doesn't send messages either: it drafts them for the PI to send.

## Next

Pilot with one Yale lab against a baseline: time to file, follow-up requests per disclosure, share of records retrievable without contacting a former member, and members still confirming after three months.
