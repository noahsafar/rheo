import { ProjectWorkLog } from '../components/WorkLog.jsx';
import { formatMonth } from '../lib/record.js';
import { invName } from '../lib/entries.js';

// A project as a lab member sees it: their own work on it, and what others shared.
// The PI gets the same work log at the top of the full invention page.
export default function Project({ lab, state, viewer, pi, inv }) {
  return (
    <div className="page">
      <section className="page-head">
        <p className="crumb">
          <a href="#/me">Home</a> / {inv.short}
        </p>
        <h1>{invName(state, inv)}</h1>
        <p className="lede">{inv.summary}</p>
        <p className="muted">
          {inv.stage}. Work since {formatMonth(inv.started)}.
        </p>
      </section>
      <ProjectWorkLog lab={lab} state={state} viewer={viewer} pi={pi} inv={inv} />
    </div>
  );
}
