import { useEffect, useMemo, useReducer, useState } from 'react';
import lab from './data/lab.json';
import { buildRecord, effectiveFiles, pendingCount } from './lib/record.js';
import Connect from './views/Connect.jsx';
import Lab from './views/Lab.jsx';
import Invention from './views/Invention.jsx';
import Digest from './views/Digest.jsx';
import Handoff from './views/Handoff.jsx';

const STORAGE_KEY = 'rheo-demo-v1';

const initialState = {
  connected: false,
  matches: {}, // fileId -> 'confirmed' | 'rejected'
  moved: {}, // fileId -> true once copied into lab storage
  requested: {}, // gapId -> date the request was drafted
  noneNeeded: {}, // `${invId}:${req}` -> true
  handoffs: {}, // memberId -> { done, note, date }
  names: {}, // invId -> PI's name for the invention
  digestDone: false, // this week's digest fully reviewed
  exported: {}, // invId -> true once a package was downloaded
  guideHidden: false,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

function reducer(state, a) {
  switch (a.type) {
    case 'connect':
      return { ...state, connected: true, names: { ...state.names, ...a.names } };
    case 'match': {
      const matches = { ...state.matches };
      for (const id of a.ids) matches[id] = a.value;
      return { ...state, matches };
    }
    case 'unmatch': {
      const matches = { ...state.matches };
      for (const id of a.ids) delete matches[id];
      return { ...state, matches };
    }
    case 'move': {
      const moved = { ...state.moved };
      for (const id of a.ids) moved[id] = true;
      return { ...state, moved };
    }
    case 'requested':
      return { ...state, requested: { ...state.requested, [a.id]: a.date } };
    case 'noneNeeded':
      return { ...state, noneNeeded: { ...state.noneNeeded, [a.key]: true } };
    case 'handoff':
      return { ...state, handoffs: { ...state.handoffs, [a.member]: a.value } };
    case 'digestDone':
      return { ...state, digestDone: true };
    case 'exported':
      return { ...state, exported: { ...state.exported, [a.inv]: true } };
    case 'guide':
      return { ...state, guideHidden: a.hidden };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

// Tiny hash router: #/lab, #/invention/inv1, #/digest, #/handoff/m2
function useRoute() {
  const read = () => (window.location.hash.replace(/^#\/?/, '') || '').split('/');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
export const go = (path) => {
  window.location.hash = '/' + path;
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const route = useRoute();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable: the demo still works, it just won't remember */
    }
  }, [state]);

  const files = useMemo(() => effectiveFiles(lab, state), [state]);
  const records = useMemo(
    () => Object.fromEntries(lab.inventions.map((i) => [i.id, buildRecord(lab, files, state, i.id)])),
    [files, state]
  );
  // The nav shows this week's batch, not the whole backlog: the digest is meant to take five minutes.
  const pending = Math.min(pendingCount(files), 12);
  const ctx = { lab, state, dispatch, files, records };

  if (!state.connected) return <Connect {...ctx} />;

  const [page, param] = route;
  let view;
  if (page === 'invention' && records[param]) view = <Invention {...ctx} rec={records[param]} />;
  else if (page === 'digest') view = <Digest {...ctx} />;
  else if (page === 'handoff') view = <Handoff {...ctx} memberId={param} />;
  else view = <Lab {...ctx} />;

  const current = page || 'lab';
  return (
    <div className="shell">
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          // The router owns the hash, so jump focus instead of letting #main change the route.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <a className="wordmark" href="#/lab" aria-label="Rheo, lab overview">
          <RheoMark />
          <span>Rheo</span>
        </a>
        <nav aria-label="Main">
          <a href="#/lab" aria-current={current === 'lab' ? 'page' : undefined}>
            {lab.lab.name}
          </a>
          {lab.inventions.map((i) => (
            <a
              key={i.id}
              href={`#/invention/${i.id}`}
              aria-current={current === 'invention' && param === i.id ? 'page' : undefined}
            >
              {i.short}
            </a>
          ))}
          <a href="#/digest" aria-current={current === 'digest' ? 'page' : undefined}>
            Weekly digest {pending > 0 && <span className="count">{pending}</span>}
          </a>
          <a href="#/handoff" aria-current={current === 'handoff' ? 'page' : undefined}>
            Handoffs
          </a>
        </nav>
        <span className="demo-tag" title="Every person, file and invention here is invented">
          Synthetic lab
        </span>
      </header>
      <main id="main" tabIndex={-1}>
        {view}
      </main>
      <footer className="footer">
        <span>
          Rheo prototype. Read-only: Rheo indexes the lab's tools and never stores or edits files. All data is
          synthetic.
        </span>
        <button
          className="link"
          onClick={() => {
            if (confirm('Reset the demo to its starting state?')) {
              dispatch({ type: 'reset' });
              go('');
            }
          }}
        >
          Reset demo
        </button>
      </footer>
    </div>
  );
}

export function RheoMark({ size = 22 }) {
  // Three lanes merging into one: separate people's records becoming one invention record.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="mark">
      <path d="M2 5c6 0 8 7 20 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M2 12h20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M2 19c6 0 8-7 20-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
