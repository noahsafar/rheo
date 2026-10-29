import { formatDate, formatMonth } from '../lib/record.js';

// Every invention with one plain status line and one obvious next step.
export default function Inventions({ lab, records, state }) {
  return (
    <div className="page narrow">
      <section className="page-head with-action">
        <div>
          <h1>Inventions</h1>
          <p className="lede">Ideas from your lab that could become a patent, a license or a company.</p>
        </div>
        <a className="btn primary big" href="#/disclose">
          Disclose an idea
        </a>
      </section>

      <ul className="inv-list">
        {lab.inventions.map((inv) => {
          const rec = records[inv.id];
          const sent = state.sent[inv.id];
          const started = state.disclosures[inv.id]?.step > 0;
          return (
            <li key={inv.id} className="card inv-row">
              <div className="inv-row-main">
                <h2>
                  <a href={`#/invention/${inv.id}`}>{rec.name}</a>
                </h2>
                <p className="muted">
                  {rec.confirmed.length} records{inv.isNew ? '' : ` since ${formatMonth(inv.started)}`}. {rec.inv.contributors.length}{' '}
                  {rec.inv.contributors.length === 1 ? 'person' : 'people'}.
                </p>
                <p className={`status-line ${sent ? 'ok' : ''}`}>
                  {sent
                    ? `Sent to Yale Ventures ${formatDate(sent)}`
                    : started
                      ? 'Disclosure started, not sent yet'
                      : rec.score >= 75
                        ? 'Ready to disclose'
                        : 'Rheo is still collecting records'}
                  <span className="muted"> · {rec.score} of 100 ready</span>
                </p>
              </div>
              <div className="inv-row-act">
                {!sent && (
                  <a className="btn primary" href={`#/disclose/${inv.id}`}>
                    {started ? 'Continue disclosure' : 'Disclose'}
                  </a>
                )}
                <a className="btn" href={`#/invention/${inv.id}`}>
                  See the record
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
