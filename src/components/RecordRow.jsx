import { formatDate, KIND_LABEL } from '../lib/record.js';

export default function RecordRow({ f, lab, dispatch, showInvention = false, onRemove }) {
  const owner = lab.members.find((m) => m.id === f.owner);
  const source = lab.sources.find((s) => s.id === f.source);
  const inv = lab.inventions.find((i) => i.id === f.invention);
  const where = f.location || source?.name;
  const supports = f.reqs.map((r) => lab.requirements.find((q) => q.id === r)?.label).filter(Boolean);

  return (
    <li className={`record ${f.match} ${f.thumb ? 'has-thumb' : ''}`}>
      {f.thumb && <img className="record-thumb" src={f.thumb} alt={`Photo of ${f.name}`} />}
      <div className="record-main">
        <p className="record-name">{f.name}</p>
        <p className="muted small">
          {KIND_LABEL[f.kind] ?? f.kind}, {owner?.name}
          {owner?.status === 'left' ? ' (left)' : ''}, {formatDate(f.date)}. {where}
          {!f.reachable && <span className="warn-text">, Rheo can't open this</span>}
          {(f.atRisk || f.personalStorage) && <span className="warn-text">, not in lab storage</span>}
        </p>
        {f.snippet && <p className="snippet">{f.snippet}</p>}
        {f.audio && <audio className="record-audio" controls preload="none" src={f.audio} aria-label={`Voice note: ${f.name}`} />}
        {(supports.length > 0 || showInvention || f.flag) && (
          <p className="tags">
            {showInvention && inv && <span className="tag inv">{inv.short}</span>}
            {supports.map((s) => (
              <span key={s} className="tag">
                {s}
              </span>
            ))}
            {f.flag && <span className="tag warn">Before any filing</span>}
          </p>
        )}
      </div>
      <div className="record-side">
        {f.match === 'pending-view' ? (
          <span className="muted small">Not confirmed yet</span>
        ) : f.match === 'suggested' ? (
          <>
            <span className="muted small tnum" title="How sure Rheo is about this match">
              {Math.round(f.confidence * 100)}% match
            </span>
            <div className="record-actions">
              <button className="btn small" onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'confirmed' })}>
                Confirm
              </button>
              <button
                className="btn small quiet"
                onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'rejected' })}
                aria-label={`Not related: ${f.name}`}
              >
                Not related
              </button>
            </div>
          </>
        ) : f.logged ? (
          onRemove ? (
            <button className="link small" onClick={() => onRemove(f)}>
              Remove
            </button>
          ) : (
            <span className="muted small">Added by {owner?.name.split(' ')[0]}</span>
          )
        ) : f.match === 'confirmed' ? (
          <button className="link small" onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'suggested' })}>
            Unconfirm
          </button>
        ) : f.match === 'rejected' ? (
          <button className="link small" onClick={() => dispatch({ type: 'unmatch', ids: [f.id] })}>
            Undo
          </button>
        ) : null}
      </div>
    </li>
  );
}
