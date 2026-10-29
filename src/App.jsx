import { useEffect, useMemo, useReducer, useState } from 'react';
import lab from './data/lab.json';
import { buildRecord, effectiveFiles, pendingCount } from './lib/record.js';
import Connect from './views/Connect.jsx';
import Lab from './views/Lab.jsx';
import Invention from './views/Invention.jsx';
import Digest from './views/Digest.jsx';
import Handoff from './views/Handoff.jsx';
import MyWork from './views/MyWork.jsx';
import Sources from './views/Sources.jsx';
import People from './views/People.jsx';
import Meetings from './views/Meetings.jsx';
import Deadlines from './views/Deadlines.jsx';
import Funding from './views/Funding.jsx';
import { labView, entryFiles, isPI, PI_ID } from './lib/workspace.js';

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
  // Lab workspace
  viewer: PI_ID, // who is signed in; the PI sees everything, members see only their own work
  membersAdded: [], // people the PI added
  logs: [], // work members logged in Rheo
  pages: [], // notebook pages members photographed
  slides: {}, // meetingId -> { name, created }
  meetingsAdded: [],
  deadlinesAdded: [],
  deadlinesDone: {}, // deadlineId -> boolean
  connections: {}, // memberId -> { gdrive: [folder names] }
  sent: {}, // invId -> date sent to Yale Ventures
  reports: {}, // grantId -> date a progress report was built
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
    case 'viewer':
      // Signing in for the first time accepts the invite.
      return {
        ...state,
        viewer: a.id,
        membersAdded: state.membersAdded.map((m) => (m.id === a.id ? { ...m, invited: false } : m)),
      };
    case 'addMember':
      return { ...state, membersAdded: [...state.membersAdded, a.member] };
    case 'addLog':
      return { ...state, logs: [...state.logs, a.entry] };
    case 'removeLog':
      return { ...state, logs: state.logs.filter((l) => l.id !== a.id) };
    case 'addPage':
      return { ...state, pages: [...state.pages, a.page] };
    case 'removePage':
      return { ...state, pages: state.pages.filter((p) => p.id !== a.id) };
    case 'slides':
      return { ...state, slides: { ...state.slides, [a.meeting]: a.value } };
    case 'addMeeting':
      return { ...state, meetingsAdded: [...state.meetingsAdded, a.meeting] };
    case 'addDeadline':
      return { ...state, deadlinesAdded: [...state.deadlinesAdded, a.deadline] };
    case 'deadlineDone':
      return { ...state, deadlinesDone: { ...state.deadlinesDone, [a.id]: a.value } };
    case 'connection':
      return {
        ...state,
        connections: {
          ...state.connections,
          [a.member]: { ...(state.connections[a.member] || {}), [a.source]: a.value },
        },
      };
    case 'sent':
      return { ...state, sent: { ...state.sent, [a.inv]: a.date } };
    case 'report':
      return { ...state, reports: { ...state.reports, [a.grant]: a.date } };
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

  const L = useMemo(() => labView(lab, state), [state.membersAdded]);
  const files = useMemo(() => [...effectiveFiles(L, state), ...entryFiles(state)], [L, state]);
  const records = useMemo(
    () => Object.fromEntries(L.inventions.map((i) => [i.id, buildRecord(L, files, state, i.id)])),
    [L, files, state]
  );
  // The nav shows this week's batch, not the whole backlog: the digest is meant to take five minutes.
  const pending = Math.min(pendingCount(files), 12);
  const viewer = L.members.find((m) => m.id === state.viewer) || L.members[0];
  const pi = isPI(viewer.id);
  const ctx = { lab: L, state, dispatch, files, records, viewer };

  if (!state.connected) return <Connect {...ctx} lab={lab} />;

  const [page, param] = route;
  const piPages = ['', 'lab', 'invention', 'digest', 'handoff', 'people', 'funding'];
  let view;
  if (!pi && piPages.includes(page || '')) {
    // Members land on their own workspace; PI-only pages are not reachable from a member account.
    view = page && page !== 'lab' ? <NoAccess viewer={viewer} /> : <MyWork {...ctx} subject={viewer} />;
  } else if (page === 'invention' && records[param]) view = <Invention {...ctx} rec={records[param]} />;
  else if (page === 'digest') view = <Digest {...ctx} />;
  else if (page === 'handoff') view = <Handoff {...ctx} memberId={param} />;
  else if (page === 'people' && param) {
    const subject = L.members.find((m) => m.id === param);
    view = subject ? <MyWork {...ctx} subject={subject} /> : <People {...ctx} />;
  } else if (page === 'people') view = <People {...ctx} />;
  else if (page === 'funding') view = <Funding {...ctx} />;
  else if (page === 'meetings') view = <Meetings {...ctx} />;
  else if (page === 'deadlines') view = <Deadlines {...ctx} />;
  else if (page === 'me') view = pi ? <Lab {...ctx} /> : <MyWork {...ctx} subject={viewer} />;
  else if (page === 'sources') view = <Sources {...ctx} />;
  else view = <Lab {...ctx} />;

  const current = page || (pi ? 'lab' : 'me');
  const nav = pi
    ? [
        ['lab', 'Overview'],
        ['people', 'People'],
        ['meetings', 'Lab meetings'],
        ['deadlines', 'Deadlines'],
        ['funding', 'Funding & Yale Ventures'],
        ['digest', 'Digest', pending],
        ['handoff', 'Handoffs'],
      ]
    : [
        ['me', 'My work'],
        ['sources', 'My sources'],
        ['meetings', 'Lab meetings'],
        ['deadlines', 'My deadlines'],
      ];
  const active = (id) => current === id || (id === 'lab' && current === 'invention');
  const signIns = L.members.filter((m) => m.status !== 'left');

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
        <a className="wordmark" href={pi ? '#/lab' : '#/me'} aria-label="Rheo home">
          <RheoMark />
          <span>Rheo</span>
        </a>
        <nav aria-label="Main">
          {nav.map(([id, label, count]) => (
            <a key={id} href={`#/${id}`} aria-current={active(id) ? 'page' : undefined}>
              {label} {count > 0 && <span className="count">{count}</span>}
            </a>
          ))}
        </nav>
        <label className="viewer">
          <span className="viewer-label">Signed in as</span>
          <select
            value={viewer.id}
            onChange={(e) => {
              dispatch({ type: 'viewer', id: e.target.value });
              go(isPI(e.target.value) ? 'lab' : 'me');
            }}
          >
            {signIns.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}, {isPI(m.id) ? 'PI' : m.role}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main id="main" tabIndex={-1}>
        {view}
      </main>
      <footer className="footer">
        <span>
          Rheo prototype on a synthetic lab. Files stay in the lab's own storage; Rheo keeps links and the record.
          Switch "Signed in as" to see what each person sees.
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

function NoAccess({ viewer }) {
  return (
    <div className="page narrow">
      <section className="page-head">
        <h1>Only the PI can see this page</h1>
        <p className="lede">
          {viewer.name.split(' ')[0]}, you can see your own records, deadlines and lab meeting slots. The lab-wide
          view belongs to the PI.
        </p>
        <p>
          <a className="btn primary" href="#/me">
            Go to my work
          </a>
        </p>
      </section>
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
