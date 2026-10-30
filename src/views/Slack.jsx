import { useEffect, useRef, useState } from 'react';
import { SLACK_CHANNELS } from '../data/slack.js';
import { formatDate } from '../lib/record.js';
import { slackState, channelById, channelMessages, parseRheo, nowTime, HELP } from '../lib/slack.js';
import { did, outcomeLabel } from '../lib/entries.js';
import { newId } from '../lib/workspace.js';

// Slack, simulated for the demo. A real connection is a Slack app the workspace admin installs once.
export default function Slack({ lab, files, state, dispatch, viewer, pi, channelId }) {
  const s = slackState(state);
  const home = pi ? '#/lab' : '#/me';
  return (
    <div className="page narrow-wide">
      <section className="page-head">
        <p className="crumb">
          <a href={home}>Home</a> / Slack
        </p>
        <h1>Slack</h1>
        <p className="lede">
          Rheo reads the lab's project channels so results discussed there reach the record, lets people log work with{' '}
          <code>/rheo</code>, and posts updates and slides back to a channel.
        </p>
        <p className="demo-note small">
          Demo: this is a made-up Slack workspace for the synthetic lab. In a real lab, a Slack admin installs the Rheo
          app once, and Rheo can only read the channels the lab picks.
        </p>
      </section>
      {s.connected ? (
        <Connected lab={lab} files={files} state={state} dispatch={dispatch} viewer={viewer} pi={pi} channelId={channelId} />
      ) : (
        <ConnectCard dispatch={dispatch} />
      )}
    </div>
  );
}

function ConnectCard({ dispatch, initial = ['marsh-lab', 'hydrogel', 'sweat-patch'], onDone }) {
  const [picked, setPicked] = useState(initial);
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <section className="card" aria-labelledby="sc-h">
      <h2 id="sc-h">Which channels can Rheo read?</h2>
      <p className="muted">
        Rheo only reads, never posts unless someone asks it to. Messages about results, methods or ideas become
        suggestions that a person confirms, like files from Teams. Pick project channels; leave social ones out.
      </p>
      <ul className="people-pick slack-pick">
        {SLACK_CHANNELS.map((c) => (
          <li key={c.id}>
            <label className={`person ${picked.includes(c.id) ? 'on' : ''}`}>
              <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggle(c.id)} />
              <span className="person-text">
                <strong>{c.name}</strong>
                <span className="muted small">{c.about}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="form-foot">
        {onDone ? (
          <button className="btn quiet" onClick={onDone}>
            Cancel
          </button>
        ) : (
          <span className="muted small">Usually the head of the lab sets this up once for everyone.</span>
        )}
        <button
          className="btn primary"
          disabled={!picked.length}
          onClick={() => {
            dispatch({ type: 'slack', value: { connected: true, channels: picked } });
            onDone?.();
          }}
        >
          {onDone ? 'Save channels' : 'Connect Slack'}
        </button>
      </div>
    </section>
  );
}

function Connected({ lab, files, state, dispatch, viewer, pi, channelId }) {
  const s = slackState(state);
  const [editing, setEditing] = useState(false);
  const channel = channelById(channelId) ? channelId : s.channels[0] || 'marsh-lab';
  const found = files.filter((f) => f.source === 'slack');
  const toReview = found.filter((f) => f.match === 'suggested' && f.invention);
  const confirmed = found.filter((f) => f.match === 'confirmed');
  const logged = (state.logs || []).filter((e) => e.via === 'slack');

  if (editing) return <ConnectCard dispatch={dispatch} initial={s.channels} onDone={() => setEditing(false)} />;

  return (
    <>
      <section className="card slack-status" aria-labelledby="ss-h">
        <div className="card-head">
          <h2 id="ss-h">
            Connected <span className="pill ok">Read-only</span>
          </h2>
          <div className="sug-actions">
            <button className="btn small" onClick={() => setEditing(true)}>
              Change channels
            </button>
            <button
              className="btn small quiet"
              onClick={() => {
                if (confirm('Disconnect Slack? Messages Rheo found stop showing as records. Entries logged with /rheo stay.'))
                  dispatch({ type: 'slack', value: { connected: false } });
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
        <ul className="stat-row">
          <li>
            <span className="stat-n tnum">{s.channels.length}</span>
            <span className="muted small">channels read: {s.channels.map((c) => channelById(c)?.name).join(', ')}</span>
          </li>
          <li>
            <span className="stat-n tnum">{toReview.length}</span>
            <span className="muted small">messages suggested as records, waiting for someone to confirm</span>
          </li>
          <li>
            <span className="stat-n tnum">{confirmed.length}</span>
            <span className="muted small">confirmed in the record</span>
          </li>
          <li>
            <span className="stat-n tnum">{logged.length}</span>
            <span className="muted small">entries logged with /rheo</span>
          </li>
        </ul>
        {toReview.length > 0 && (
          <p className="small">
            {pi ? (
              <>
                Confirm them from each invention's page, for example the{' '}
                <a href="#/invention/inv1">siRNA hydrogel</a>.
              </>
            ) : (
              <>
                Yours show up under <a href="#/me">Is this yours?</a> on your home page.
              </>
            )}
          </p>
        )}
      </section>

      <section className="block" aria-labelledby="ch-h">
        <div className="section-head">
          <h2 id="ch-h">Channels</h2>
        </div>
        <div className="slack-frame">
          <nav className="slack-side" aria-label="Channels">
            {SLACK_CHANNELS.map((c) => (
              <a key={c.id} href={`#/slack/${c.id}`} aria-current={c.id === channel ? 'page' : undefined}>
                {c.name}
                {!s.channels.includes(c.id) && <span className="muted small"> (not read)</span>}
              </a>
            ))}
          </nav>
          <Channel key={channel} lab={lab} files={files} state={state} dispatch={dispatch} viewer={viewer} pi={pi} channel={channel} />
        </div>
      </section>
    </>
  );
}

function Channel({ lab, files, state, dispatch, viewer, pi, channel }) {
  const s = slackState(state);
  const [text, setText] = useState('');
  const list = useRef(null);
  const msgs = channelMessages(state, channel, viewer.id);
  const read = s.channels.includes(channel);
  const fileFor = (id) => files.find((f) => f.id === id);
  const name = (id) => (id === 'rheo' ? 'Rheo' : lab.members.find((m) => m.id === id)?.name ?? 'Someone');
  const initials = (id) => (id === 'rheo' ? 'R' : name(id).split(' ').map((p) => p[0]).join(''));

  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [msgs.length]);

  const post = (posts) => dispatch({ type: 'slackPost', posts });
  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const base = { channel, date: lab.lab.today, time: nowTime() };
    const mine = { ...base, id: newId('sp'), owner: viewer.id, text: t };
    if (/^\/rheo\b/i.test(t)) {
      // The command itself is never shown to the channel.
      mine.ephemeral = true;
      mine.visibleTo = viewer.id;
      const r = parseRheo(t, { lab, viewer, channel, pi });
      if (r.entry) {
        dispatch({ type: 'addLog', entry: r.entry });
        const inv = lab.inventions.find((i) => i.id === r.entry.invention);
        post([
          mine,
          {
            ...base,
            id: newId('sp'),
            owner: 'rheo',
            ephemeral: r.entry.visibility !== 'lab',
            visibleTo: r.entry.visibility !== 'lab' ? viewer.id : undefined,
            text: `Logged to ${inv ? inv.short : 'other lab work'} for ${viewer.name.split(' ')[0]}: ${did(r.entry)}${r.entry.outcome ? ` (${outcomeLabel(r.entry.outcome).toLowerCase()})` : ''}.${
              r.entry.visibility === 'private' ? ' Only you can see it.' : r.entry.visibility === 'pi' ? ' Only you and the head of the lab can see it.' : ''
            }`,
            entryId: r.entry.id,
          },
        ]);
      } else {
        post([mine, { ...base, id: newId('sp'), owner: 'rheo', ephemeral: true, visibleTo: viewer.id, text: r.help ? HELP : r.error }]);
      }
    } else {
      post([mine]);
    }
    setText('');
  };

  return (
    <div className="slack-channel">
      <div className="slack-head">
        <strong>{channelById(channel).name}</strong>
        <span className="muted small">
          {channelById(channel).about}
          {read ? '. Rheo reads this channel.' : ". Rheo doesn't read this channel."}
        </span>
      </div>
      <ol className="slack-msgs" ref={list} aria-live="polite">
        {msgs.map((m) => {
          const f = fileFor(m.id);
          return (
            <li key={m.id} className={`slack-msg ${m.owner === 'rheo' ? 'bot' : ''}`}>
              <span className="slack-av" aria-hidden="true">
                {initials(m.owner)}
              </span>
              <div>
                <p className="slack-meta">
                  <strong>{name(m.owner)}</strong>
                  {m.owner === 'rheo' && <span className="app-tag">App</span>}
                  {m.onBehalf && <span className="muted small"> for {name(m.onBehalf)}</span>}
                  <span className="muted small">
                    {formatDate(m.date, { month: 'short', day: 'numeric' })}, {m.time}
                  </span>
                  {m.ephemeral && <span className="muted small"> · Only visible to you</span>}
                </p>
                <p className="slack-text">{m.text}</p>
                {m.entryId && (
                  <p className="small">
                    <a href={`#/entry/${m.entryId}`}>Open in Rheo</a> · <a href={`#/entry/${m.entryId}`}>Add details</a>
                  </p>
                )}
                {m.link && (
                  <p className="small">
                    <a href={m.link}>{m.linkLabel || 'Open in Rheo'}</a>
                  </p>
                )}
                {read && f && f.match !== 'none' && (
                  <p className={`slack-rheo small ${f.match}`}>
                    {f.match === 'confirmed'
                      ? `In the ${lab.inventions.find((i) => i.id === f.invention)?.short} record`
                      : f.match === 'rejected'
                        ? 'Marked not related'
                        : `Rheo suggests this for the ${lab.inventions.find((i) => i.id === f.invention)?.short} record`}
                    {f.match === 'suggested' && (pi || m.owner === viewer.id) && (
                      <>
                        {' '}
                        <button className="link small" onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'confirmed' })}>
                          Confirm
                        </button>{' '}
                        <button className="link small" onClick={() => dispatch({ type: 'match', ids: [f.id], value: 'rejected' })}>
                          Not related
                        </button>
                      </>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <form className="slack-compose" onSubmit={send}>
        <label className="sr-only" htmlFor="slack-input">
          Message {channelById(channel).name}
        </label>
        <input
          id="slack-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Message ${channelById(channel).name}, or /rheo what you did`}
          autoComplete="off"
        />
        <button className="btn primary" type="submit" disabled={!text.trim()}>
          Send
        </button>
      </form>
      <p className="muted small slack-tip">
        Try <button className="link small" onClick={() => setText('/rheo Ran release assay on batch 15; result: 64% release; worked')}>/rheo Ran release assay on batch 15; result: 64% release; worked</button> or{' '}
        <button className="link small" onClick={() => setText('/rheo help')}>/rheo help</button>.
      </p>
    </div>
  );
}

// "Post to Slack" for anything Rheo makes: updates, slides, summaries.
export function PostToSlack({ lab, state, dispatch, viewer, text, link, linkLabel, defaultChannel }) {
  const s = slackState(state);
  const [channel, setChannel] = useState(defaultChannel && s.channels.includes(defaultChannel) ? defaultChannel : s.channels[0] || 'marsh-lab');
  const [posted, setPosted] = useState(null);
  if (!s.connected)
    return (
      <a className="btn" href="#/slack">
        Connect Slack to post
      </a>
    );
  return (
    <span className="post-slack">
      <label className="sr-only" htmlFor="post-ch">
        Slack channel
      </label>
      <select id="post-ch" value={channel} onChange={(e) => { setChannel(e.target.value); setPosted(null); }}>
        {SLACK_CHANNELS.filter((c) => c.id !== 'random').map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {posted === channel ? (
        <a className="btn" href={`#/slack/${channel}`}>
          Posted. See it in Slack
        </a>
      ) : (
        <button
          className="btn"
          onClick={() => {
            dispatch({
              type: 'slackPost',
              // An email-style update loses its subject line in Slack.
              posts: [{ id: newId('sp'), channel, date: lab.lab.today, time: nowTime(), owner: 'rheo', onBehalf: viewer.id, text: text.replace(/^Subject:.*\n+/, ''), link, linkLabel }],
            });
            setPosted(channel);
          }}
        >
          Post to Slack
        </button>
      )}
    </span>
  );
}
