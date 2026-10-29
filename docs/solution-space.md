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

## Convergence

E is the only option that fails no constraint. The final design keeps A's checklist as the readiness score, C as the handoff flow, and D's export format and site license model. Customer reactions to the sketches are being collected.

## Final design

1. **Connect** lab tools read-only.
2. **Name** an invention; Rheo proposes the records that belong to it.
3. **Confirm** about a dozen ranked matches in a weekly digest.
4. **Record**: timeline, contributor ledger, funding and public-disclosure flags.
5. **Spot gaps**: a score out of 100 across seven checks, each gap with its fix.
6. **Hand off and export**: a four-step handoff when someone leaves, and a one-click disclosure package.

The prototype in this repo implements all six on the synthetic Marsh Lab.
