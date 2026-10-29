import { useState } from 'react';
import EntryForm from './EntryForm.jsx';

// The simple "what did you do today" card at the top of every home page.
export default function LogCard({ lab, viewer, onInventions, dispatch }) {
  const [saved, setSaved] = useState(null);
  const [n, setN] = useState(0); // remount the form after each save so it starts empty
  return (
    <section className="card log-card" aria-labelledby="log-h">
      <h2 id="log-h">Log work</h2>
      <EntryForm
        key={n}
        lab={lab}
        viewer={viewer}
        inventions={onInventions}
        autoFocus={false}
        submitLabel="Add to my work"
        onSave={(entry) => {
          dispatch({ type: 'addLog', entry });
          setSaved(entry.id);
          setN((x) => x + 1);
        }}
      />
      {saved && (
        <p className="muted small" aria-live="polite">
          Saved. <a href={`#/entry/${saved}`}>Open it</a>
        </p>
      )}
    </section>
  );
}
