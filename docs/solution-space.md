# Solution space

How we got from the problem to the prototype in this repo. The full write-up and wireframes are in the team's solution space documents.

## Problem

Yale PIs who want to commercialize have to hand Yale Ventures a complete record of each invention: data, protocols, key dates and every contributor. Lab records are organized by person, not by invention, and people leave before the invention matures, so the record gets rebuilt when a disclosure is due.

## Design constraints

| Constraint | Why | Source |
| --- | --- | --- |
| At most 10 minutes of PI time a week, in tools they already open | Faculty are busy and slow to respond | Candy Hwang |
| Built on existing tools, no migration | Labs already juggle Teams, OneDrive, email and more | Bob McGrath, Aurelia |
| Files stay in approved storage; Rheo keeps links and metadata | Unpublished results are IP; some labs need HIPAA-compliant tools | Emily, Abigail Solomon |
| The lab owns the record, not the person | People leave before the invention matures | Abigail Solomon |
| Export follows the disclosure form | Yale Ventures can't keep up with follow-ups | Bob McGrath |
| A person confirms every suggestion | Output you have to double-check saves no time | Candy Hwang |
| Built before anyone asks, at about $2,400 per lab a year | The gap is invisible until a disclosure is due; new tools get abandoned | Bob McGrath |

## Divergence

We mapped options by who builds the record (people or software) and when (at disclosure, at a moment, or continuously).

| Option | Who | When |
| --- | --- | --- |
| A. Disclosure template and checklist | People | Continuously |
| B. Invention-first lab notebook | People, in new software | Continuously |
| C. Offboarding capture | People | When someone leaves |
| D. Yale Ventures intake portal | Tech transfer staff | At disclosure |
| E. Connector layer over existing tools | Software, confirmed by a person | Continuously |
| F. Shared records coordinator | A Yale Ventures staffer | Quarterly |
| G. Disclosure-time AI assistant | Software | At disclosure |

## How users reacted

We showed sketches of all seven options to __ PIs with commercial intent, __ lab members and __ Yale Ventures staff, then mockups of the leading option.

- **What resonated.** Numerous interviewees liked the deadlines tab, the way Rheo tracks people, and the projects tab: "Entering results for them to go under a project is good."
- **What didn't.** Some people wanted members, not just the PI, to have a people tab so they can see each other's work and collaborate, noting that "in most labs the PI does a lot less." Other users, however, said that in some labs not everyone wants others to see their results and data. Some users also asked for a connection to Slack, which many labs use.
- **What we learned.** Members, not the PI, are the daily users, and they will only log their work if it pays off for them, not just for the PI or Yale Ventures. So the prototype opens on a simple work log (what you did, the result, and whether it worked, filed under a project), and every entry feeds tools that save members time: lab meeting slides built from the entries they pick, a weekly update email for their PI, a methods draft for a paper or thesis, help with experiments that didn't work, preliminary data for grants, and a Jobs tab with CV entries, cover letters and bios. Instead of an all-or-nothing people tab, each entry has its own sharing setting (everyone, me and the head of the lab, or only me), so members can browse and build on what colleagues chose to share, filter for work similar to their own, and onboard through a "New to the lab" page built only from shared entries. We added Slack as a read-only source: Rheo reads the lab's project channels and suggests relevant messages as records for a person to confirm. Members can log work by typing /rheo in Slack, and Rheo can post updates and slides back to a channel.

## How we chose

We scored each option against the constraints (✓ meets, ◐ partly, ✗ fails). The connector layer is the only option with no failure, because it builds the record from work labs already do. The rest each fail at least one constraint outright: the template and notebook need habits that don't stick, offboarding alone never assembles a full package, the coordinator's cost grows with every lab, and the portal and AI assistant start after people have already left.

The final design keeps A's checklist as the readiness score, C as the handoff flow, and D's export format and site license model.

## How Rheo works

Seven steps, from setup to handoff.

1. **Connect, once.** The PI or lab manager signs in with Yale SSO and connects OneDrive or SharePoint, Google Drive, Teams or Slack channels, and their lab notebook, read-only. About ten minutes. No files move.
2. **Name an invention.** The PI creates an invention, such as a thermoresponsive hydrogel for siRNA release. Rheo proposes the files, protocols and messages that belong to it, using names, folders, authors and dates.
3. **Log work, get something back.** Members log what they did in seconds, from a + button on every screen, by voice, or by typing /rheo in Slack. Only "what I did" is required; the result, whether it worked, the process and the time it took are optional. Each entry is shared with everyone in the lab, only with the PI, or kept private. In return, Rheo turns members' entries into lab meeting slides, a weekly update for the PI, a methods draft, help with experiments that failed, grant preliminary data, and CV entries, cover letters and bios. Members can browse what colleagues shared and find work similar to their own, and new members get a "New to the lab" page built from shared entries.
4. **Confirm weekly.** A digest in email or Teams lists about a dozen new matches, ranked by confidence. The PI or a senior student taps confirm or reject, about five minutes a week.
5. **Build the record.** Each invention gets a timeline from original timestamps, a contributor ledger from file history, the work entries filed under it, funding tags, and a warning when a poster or paper is planned before filing.
6. **See what is missing.** A readiness score out of 100, across seven checks that mirror the disclosure form, names each gap and its fix, such as "14 raw data files are on a graduated student's personal drive."
7. **Hand off and export.** When a member's end date is set, Rheo runs a four-step handoff: move their records into lab storage, confirm what they worked on, note what is unfinished, and review their contribution. For people who already left, it tracks what still needs recovering. At disclosure, the PI answers six plain questions, with answers suggested from the team's shared entries, and one click exports a readable package, an index of every record, and structured intake data for Yale Ventures.

## What v1 leaves out

Rheo does not store files, replace the lab notebook, or decide inventorship; it gives counsel the evidence and they decide. It does not file anything on the lab's behalf. Everything it writes is a draft built only from what entries say, and it never shows private entries to anyone else.

## How we will know it works

We keep the targets from our problem space: time to file cut in half, one or fewer follow-ups per disclosure, 90% of key records retrievable without contacting a former member, and most lab members still logging and confirming after three months.

## Prototype and next steps

The prototype in this repo runs on a synthetic lab: eight members, three of whom have left and one who leaves in December, 1,200 records across five tools, about 40 work entries, a simulated Slack workspace, and two inventions with planted gaps. Next we will time PIs assembling a disclosure package with and without Rheo, measure whether members keep logging when they get slides and write-ups back, then pilot with one Yale lab through Bryn's Yale Ventures contacts.
