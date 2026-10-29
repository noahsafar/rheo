import { useEffect, useRef } from 'react';
import { packageMarkdown, recordsCsv, intakeJson, download, slug } from '../lib/export.js';

export default function ExportPanel({ lab, rec, onClose }) {
  const ref = useRef(null);
  const md = packageMarkdown(lab, rec);
  const base = slug(rec.name);

  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.querySelector('button')?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-h" ref={ref}>
        <div className="dialog-head">
          <h2 id="export-h">Disclosure package</h2>
          <button className="btn small quiet" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">
          Everything Yale Ventures asks for, from {rec.confirmed.length} confirmed records.{' '}
          {rec.gaps.length > 0
            ? `${rec.gaps.length} open ${rec.gaps.length === 1 ? 'item is' : 'items are'} listed at the top so nobody has to chase them later.`
            : 'No open items.'}
        </p>
        <div className="downloads">
          <button className="btn primary" onClick={() => download(`${base}-disclosure.md`, md, 'text/markdown')}>
            Download package
          </button>
          <button className="btn" onClick={() => download(`${base}-records-index.csv`, recordsCsv(lab, rec), 'text/csv')}>
            Records index (.csv)
          </button>
          <button className="btn" onClick={() => download(`${base}-intake.json`, intakeJson(lab, rec), 'application/json')}>
            Yale Ventures intake (.json)
          </button>
        </div>
        <pre className="preview" tabIndex={0} aria-label="Package preview">
          {md}
        </pre>
      </div>
    </div>
  );
}
