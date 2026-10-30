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
import Disclose from './views/Disclose.jsx';
import Inventions from './views/Inventions.jsx';
import LabTabs from './components/LabTabs.jsx';
import QuickNote from './components/QuickNote.jsx';
import Entries from './views/Entries.jsx';
import Entry from './views/Entry.jsx';
import Project from './views/Project.jsx';
import Tools from './views/Tools.jsx';
import Welcome from './views/Welcome.jsx';
import Slack from './views/Slack.jsx';
import { slackFiles } from './lib/slack.js';
import { SAMPLE_LOGS } from './data/sampleLogs.js';
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
  logs: SAMPLE_LOGS, // work members logged in Rheo (starts with synthetic sample entries)
  samplesV1: true,
  slack: { connected: false, channels: [], posts: [] }, // the demo Slack connection
  pages: [], // notebook pages members photographed
  slides: {}, // meetingId -> { name, created }
  meetingsAdded: [],
  deadlinesAdded: [],
  deadlinesDone: {}, // deadlineId -> boolean
  connections: {}, // memberId -> { gdrive: [folder names] }
  sent: {}, // invId -> date sent to Yale Ventures
  reports: {}, // grantId -> date a progress report was built
  disclosures: {}, // invId -> the PI's answers in the Disclose an idea flow
  inventionsAdded: [], // new ideas the PI disclosed that Rheo wasn't tracking yet
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw);
    // Demos saved before sample entries existed get them added once, alongside anything already logged.
    if (!saved.samplesV1) saved.logs = [...SAMPLE_LOGS, ...(saved.logs || [])];
    return { ...initialState, ...saved, samplesV1: true };
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
    case 'slack':
      return { ...state, slack: { ...(state.slack || {}), ...a.value } };
    case 'slackPost':
      return { ...state, slack: { ...state.slack, posts: [...(state.slack?.posts || []), ...a.posts] } };
    case 'updateLog':
      return { ...state, logs: state.logs.map((l) => (l.id === a.entry.id ? a.entry : l)) };
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
    case 'disclosure':
      return {
        ...state,
        disclosures: { ...state.disclosures, [a.inv]: { ...(state.disclosures[a.inv] || {}), ...a.value } },
      };
    case 'addInvention':
      return { ...state, inventionsAdded: [...state.inventionsAdded, a.invention] };
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

  const L = useMemo(() => labView(lab, state), [state.membersAdded, state.inventionsAdded]);
  const files = useMemo(() => [...effectiveFiles(L, state), ...entryFiles(state), ...slackFiles(state)], [L, state]);
  const records = useMemo(
    () => Object.fromEntries(L.inventions.map((i) => [i.id, buildRecord(L, files, state, i.id)])),
    [L, files, state]
  );
  const viewer = L.members.find((m) => m.id === state.viewer) || L.members[0];
  const pi = isPI(viewer.id);
  const ctx = { lab: L, state, dispatch, files, records, viewer, pi };

  if (!state.connected) return <Connect {...ctx} lab={lab} />;

  const [page, param] = route;
  const piPages = ['', 'lab', 'invention', 'inventions', 'disclose', 'digest', 'handoff', 'people', 'funding'];
  const labTabs = ['people', 'meetings', 'deadlines', 'handoff'];
  let view;
  if (!pi && piPages.includes(page || '')) {
    // Members land on their own workspace; PI-only pages are not reachable from a member account.
    view = page && page !== 'lab' ? <NoAccess viewer={viewer} /> : <MyWork {...ctx} subject={viewer} />;
  } else if (page === 'invention' && records[param]) view = <Invention {...ctx} rec={records[param]} />;
  else if (page === 'inventions') view = <Inventions {...ctx} />;
  else if (page === 'disclose') view = <Disclose {...ctx} invId={param} />;
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
  else if (page === 'entries') view = <Entries key={route.join('/')} {...ctx} project={param} scope={route[2] || 'mine'} />;
  else if (page === 'welcome') view = <Welcome {...ctx} />;
  else if (page === 'slack') view = <Slack {...ctx} channelId={param} />;
  else if (page === 'tools') view = <Tools key={param || 'hub'} {...ctx} toolId={param} />;
  else if (page === 'entry') view = <Entry key={param} {...ctx} id={param} />;
  else if (page === 'project' && L.inventions.some((i) => i.id === param))
    view = <Project {...ctx} inv={L.inventions.find((i) => i.id === param)} />;
  else view = <Lab {...ctx} />;

  const current = page || (pi ? 'lab' : 'me');
  // Four plain destinations for the PI, three for members. Everything else lives inside them.
  const nav = pi
    ? [
        ['lab', 'Home', ['lab', 'me', 'digest', 'entries', 'entry', 'tools', 'slack']],
        ['inventions', 'Inventions', ['inventions', 'invention', 'disclose']],
        ['people', 'My lab', labTabs],
        ['funding', 'Funding', ['funding']],
        ['welcome', 'New to the lab', ['welcome']],
      ]
    : [
        ['me', 'Home', ['me', 'sources', 'entries', 'entry', 'project', 'tools', 'slack']],
        ['meetings', 'Lab meetings', ['meetings']],
        ['deadlines', 'Deadlines', ['deadlines']],
        ['welcome', 'New to the lab', ['welcome']],
      ];
  const signIns = L.members.filter((m) => m.status !== 'left');
  const showLabTabs = pi && labTabs.includes(page) && !(page === 'people' && param);

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
      <div className="demo-bar">
        <span>Demo with made-up data.</span>
        <label>
          <span>See Rheo as</span>
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
      </div>
      <header className="topbar">
        <a className="wordmark" href={pi ? '#/lab' : '#/me'} aria-label="Rheo home">
          <RheoMark />
          <span>Rheo</span>
        </a>
        <nav aria-label="Main">
          {nav.map(([id, label, match]) => (
            <a key={id} href={`#/${id}`} aria-current={match.includes(current) ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        {pi ? (
          <a className="btn primary header-cta" href="#/disclose">
            Disclose an idea
          </a>
        ) : (
          <a className="btn primary header-cta" href="#/me" onClick={() => setTimeout(() => document.getElementById('log-h')?.scrollIntoView({ block: 'start' }), 50)}>
            Log work
          </a>
        )}
      </header>
      {showLabTabs && <LabTabs current={page} />}
      <main id="main" tabIndex={-1}>
        {view}
      </main>
      <QuickNote
        lab={L}
        viewer={viewer}
        dispatch={dispatch}
        inventions={pi ? L.inventions : L.inventions.filter((i) => i.contributors.some((c) => c.member === viewer.id))}
      />
      <footer className="footer">
        <span>
          Rheo prototype on a synthetic lab. Files stay in the lab's own storage; Rheo keeps links and the record.
          Use "See Rheo as" at the top to see what each person sees.
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
