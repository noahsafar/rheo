const STATUS_TEXT = { done: 'Complete', partial: 'In progress', gap: 'Missing' };

export default function Readiness({ score, checks, compact = false }) {
  return (
    <div className={`readiness ${compact ? 'compact' : ''}`}>
      <div className="score">
        <span className="score-n tnum">{score}</span>
        <span className="score-of">/100 ready</span>
      </div>
      <div
        className="seg-bar"
        role="img"
        aria-label={`Readiness ${score} out of 100. ${checks.map((c) => `${c.label}: ${STATUS_TEXT[c.status]}`).join('. ')}`}
      >
        {checks.map((c) => (
          <span key={c.id} className={`seg ${c.status}`} style={{ flexGrow: c.weight }} title={`${c.label}: ${c.detail}`} />
        ))}
      </div>
      {!compact && (
        <ul className="checks">
          {checks.map((c) => (
            <li key={c.id} className={c.status}>
              <StatusIcon status={c.status} />
              <div>
                <span className="check-label">{c.label}</span>
                <span className="muted small">{c.detail}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatusIcon({ status }) {
  return (
    <svg className={`status-icon ${status}`} width="18" height="18" viewBox="0 0 18 18" aria-label={STATUS_TEXT[status]} role="img">
      {status === 'done' && (
        <>
          <circle cx="9" cy="9" r="8" />
          <path d="M5.5 9.2l2.3 2.3 4.7-4.8" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {status === 'partial' && (
        <>
          <circle cx="9" cy="9" r="7.2" fill="none" strokeWidth="1.6" />
          <path d="M9 1.8a7.2 7.2 0 0 1 0 14.4z" />
        </>
      )}
      {status === 'gap' && <circle cx="9" cy="9" r="7.2" fill="none" strokeWidth="1.6" strokeDasharray="3 2.4" />}
    </svg>
  );
}
