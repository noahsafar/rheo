import { useEffect, useRef, useState } from 'react';
import EntryForm from './EntryForm.jsx';

// The "+" button on every screen. One tap opens a work entry; only "What did you do?" is required.

export default function QuickNote({ lab, viewer, dispatch, inventions }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const dialog = useRef(null);
  const fab = useRef(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const close = () => {
    setOpen(false);
    fab.current?.focus();
  };

  return (
    <>
      <button ref={fab} className="qn-fab" aria-label="Add what you worked on" title="Add what you worked on" onClick={() => setOpen(true)}>
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        className="qn-dialog"
        aria-labelledby="qn-h"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the backdrop (the dialog element itself) closes it.
          if (e.target === dialog.current) close();
        }}
      >
        {open && (
          <div className="qn-form">
            <EntryForm
              lab={lab}
              viewer={viewer}
              inventions={inventions}
              onCancel={close}
              heading={
                <div className="qn-head">
                  <h2 id="qn-h">What did you work on?</h2>
                  <button type="button" className="btn quiet small" onClick={close} aria-label="Close">
                    ✕
                  </button>
                </div>
              }
              onSave={(entry) => {
                dispatch({ type: 'addLog', entry });
                setToast({ id: entry.id, text: 'Entry saved.' });
                close();
              }}
            />
          </div>
        )}
      </dialog>
      <div className="qn-toast" role="status" aria-live="polite">
        {toast && (
          <span>
            {toast.text}{' '}
            <a href={`#/entry/${toast.id}`} onClick={() => setToast(null)}>
              Open it
            </a>
          </span>
        )}
      </div>
    </>
  );
}
