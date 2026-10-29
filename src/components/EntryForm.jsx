import { useEffect, useRef, useState } from 'react';
import { LOG_TYPES } from '../data/workspace.js';
import { OUTCOMES, DURATIONS, guessType, did as didOf, result as resultOf } from '../lib/entries.js';
import { isPI } from '../lib/workspace.js';
import { newId } from '../lib/workspace.js';

// One work entry. Only "What did you do?" is required; the rest can wait or be filled in later.
// Used by the + button, the Log work card and the Edit button on an entry.

const MAX_RECORDING_S = 120;
const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const canRecord = typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

const FIELD_NAMES = { did: 'What I did', result: 'Result', process: 'Process used' };

export default function EntryForm({ lab, viewer, inventions, initial, onSave, onCancel, submitLabel = 'Save entry', autoFocus = true, heading }) {
  const editing = !!initial;
  const [f, setF] = useState(() => ({
    did: initial ? didOf(initial) : '',
    result: initial ? resultOf(initial) : '',
    outcome: initial?.outcome || '',
    process: initial?.process || '',
    duration: initial?.duration || '',
    date: initial?.date || lab.lab.today,
    invention: initial ? initial.invention || '' : inventions[0]?.id || '',
    visibility: initial ? (initial.visibility || 'pi') === 'pi' && isPI(viewer.id) ? 'private' : initial.visibility || 'pi' : 'lab',
  }));
  const [typeChoice, setTypeChoice] = useState(initial?.type || null); // null = Rheo's guess
  const [more, setMore] = useState(!!(initial && (initial.process || initial.duration)));
  const [audio, setAudio] = useState(initial?.audio ? { url: initial.audio, seconds: initial.audioSeconds } : null);
  const [target, setTarget] = useState('did'); // which box the voice goes into
  const [mic, setMic] = useState('idle'); // idle | listening | recording
  const [interim, setInterim] = useState('');
  const [micError, setMicError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const didBox = useRef(null);
  const recog = useRef(null);
  const recorder = useRef(null);
  const timer = useRef(null);

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const type = typeChoice || guessType(`${f.did} ${f.result} ${f.process}`);
  const canSave = f.did.trim().length > 0 || !!audio;
  const inventionList = initial?.invention && !inventions.some((i) => i.id === initial.invention)
    ? [...inventions, lab.inventions.find((i) => i.id === initial.invention)].filter(Boolean)
    : inventions;

  useEffect(() => {
    // Wait a frame: inside the + dialog, the box only becomes focusable once the dialog has opened.
    const raf = autoFocus ? requestAnimationFrame(() => didBox.current?.focus()) : null;
    return () => {
      cancelAnimationFrame(raf);
      stopAll();
    };
  }, []);

  const stopAll = () => {
    recog.current?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    clearInterval(timer.current);
  };

  // Dictation: words appear in whichever box you were last in.
  const startDictation = () => {
    setMicError(null);
    const into = target;
    const r = new SpeechRecognition();
    r.continuous = true;
    r.interimResults = true;
    r.lang = navigator.language || 'en-US';
    r.onresult = (e) => {
      let finalText = '';
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += piece;
        else pending += piece;
      }
      if (finalText) {
        setF((x) => {
          const t = x[into];
          const sep = t && !/\s$/.test(t) ? ' ' : '';
          const chunk = finalText.trim();
          return { ...x, [into]: t + sep + chunk.charAt(0).toUpperCase() + chunk.slice(1) };
        });
      }
      setInterim(pending);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicError('Microphone access is blocked. Allow it in your browser settings, or type instead.');
      } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setMicError("Couldn't hear that. Try again, or type instead.");
      }
    };
    r.onend = () => {
      setMic('idle');
      setInterim('');
    };
    recog.current = r;
    r.start();
    setMic('listening');
  };

  // Fallback for browsers without dictation: keep the voice note itself.
  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { audioBitsPerSecond: 24000 });
      const chunks = [];
      const started = Date.now();
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const seconds = Math.round((Date.now() - started) / 1000);
        const reader = new FileReader();
        // Stored as a data URL so the demo can keep it without a server.
        reader.onload = () => setAudio({ url: reader.result, seconds });
        reader.readAsDataURL(blob);
        setMic('idle');
      };
      recorder.current = rec;
      rec.start();
      setElapsed(0);
      timer.current = setInterval(() => {
        const s = Math.round((Date.now() - started) / 1000);
        setElapsed(s);
        if (s >= MAX_RECORDING_S) rec.stop();
      }, 500);
      setMic('recording');
    } catch {
      setMicError('Microphone access is blocked. Allow it in your browser settings, or type instead.');
    }
  };

  const toggleMic = () => {
    if (mic === 'listening') return recog.current?.stop();
    if (mic === 'recording') return recorder.current?.stop();
    if (SpeechRecognition) startDictation();
    else if (canRecord) startRecording();
  };

  const save = (e) => {
    e?.preventDefault();
    if (!canSave) return;
    stopAll();
    const whatIDid =
      f.did.trim() ||
      `Voice note, ${new Date(f.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const entry = {
      ...(initial || {}),
      id: initial?.id || newId('log'),
      owner: initial?.owner || viewer.id,
      created: initial?.created || new Date().toISOString(),
      did: whatIDid,
      result: f.result.trim(),
      outcome: f.outcome,
      process: f.process.trim(),
      duration: f.duration.trim(),
      date: f.date,
      invention: f.invention,
      type,
      visibility: f.visibility,
      audio: audio?.url,
      audioSeconds: audio?.seconds,
    };
    // Older entries used title/body; once saved in the new shape, drop them.
    delete entry.title;
    delete entry.body;
    onSave(entry);
  };

  const micSupported = !!SpeechRecognition || canRecord;
  const micLabel =
    mic === 'listening'
      ? 'Stop'
      : mic === 'recording'
        ? `Stop (${fmtSeconds(elapsed)})`
        : SpeechRecognition
          ? `Speak into "${FIELD_NAMES[target]}"`
          : 'Record voice note';
  const focusAs = (k) => () => mic === 'idle' && setTarget(k);

  return (
    <form
      className="entry-form"
      onSubmit={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(e);
      }}
    >
      {heading}
      <label className="field first">
        <span>
          What did you do? <span className="req">Required</span>
        </span>
        <textarea
          ref={didBox}
          rows={2}
          value={f.did}
          onChange={set('did')}
          onFocus={focusAs('did')}
          placeholder="Dissolved 16% w/v triblock in cold PBS"
        />
      </label>

      <div className="voice-row">
        {micSupported ? (
          <button
            type="button"
            className={`btn small ${mic !== 'idle' ? 'qn-live' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleMic}
            aria-pressed={mic !== 'idle'}
            disabled={!!audio && !SpeechRecognition && mic === 'idle'}
          >
            <MicIcon />
            {micLabel}
          </button>
        ) : (
          <span className="muted small">Voice isn't available in this browser. Typing works everywhere.</span>
        )}
        {mic === 'listening' && <span className="muted small">Listening. Words appear as you talk.</span>}
        {audio && (
          <span className="qn-audio">
            <audio controls src={audio.url} aria-label="Your voice note" />
            <button type="button" className="link small" onClick={() => setAudio(null)}>
              Remove
            </button>
          </span>
        )}
      </div>
      {interim && <p className="qn-interim muted small">{interim}…</p>}
      {micError && <p className="warn-text small">{micError}</p>}

      <p className="optional-note muted small">Everything below is optional. Add it now or later.</p>

      <label className="field">
        <span>Result</span>
        <textarea
          rows={2}
          value={f.result}
          onChange={set('result')}
          onFocus={focusAs('result')}
          placeholder="Clear solution, gels at 34 °C"
        />
      </label>

      <fieldset className="type-pick outcome-pick">
        <legend className="field-legend">Did it work?</legend>
        {OUTCOMES.map((o) => (
          <label key={o.id} className={`${f.outcome === o.id ? 'on' : ''} oc-${o.id}`}>
            <input
              type="radio"
              name="outcome"
              value={o.id}
              checked={f.outcome === o.id}
              onChange={set('outcome')}
              onClick={() => f.outcome === o.id && setF((x) => ({ ...x, outcome: '' }))}
            />
            {o.label}
          </label>
        ))}
      </fieldset>

      {!more ? (
        <button type="button" className="link small more-toggle" onClick={() => setMore(true)}>
          + Add process used, time it took, type of work
        </button>
      ) : (
        <>
          <label className="field">
            <span>Process used</span>
            <textarea
              rows={2}
              value={f.process}
              onChange={set('process')}
              onFocus={focusAs('process')}
              placeholder="Cold dissolution overnight at 4 °C"
            />
          </label>
          <div className="field">
            <span id="dur-l">How long it took</span>
            <div className="dur-row">
              <div className="chips" role="group" aria-labelledby="dur-l">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`qn-chip ${f.duration === d ? 'on' : ''}`}
                    aria-pressed={f.duration === d}
                    onClick={() => setF((x) => ({ ...x, duration: x.duration === d ? '' : d }))}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <input
                className="dur-input"
                aria-labelledby="dur-l"
                value={f.duration}
                onChange={set('duration')}
                placeholder="or type, e.g. 3 h"
              />
            </div>
          </div>
          <label className="field">
            <span>Type of work{typeChoice ? '' : ' (Rheo guessed)'}</span>
            <select value={type} onChange={(e) => setTypeChoice(e.target.value)}>
              {LOG_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          {type === 'idea' && (
            <p className="hint small">A dated idea with your name on it can become the record of conception for a patent.</p>
          )}
        </>
      )}

      <div className="field-row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={f.date} max={lab.lab.today} onChange={set('date')} />
        </label>
        <label className="field">
          <span>Project</span>
          <select value={f.invention} onChange={set('invention')}>
            {inventionList.map((i) => (
              <option key={i.id} value={i.id}>
                {i.short}
              </option>
            ))}
            <option value="">Other lab work</option>
          </select>
        </label>
      </div>

      <fieldset className="type-pick vis-pick">
        <legend className="field-legend">Who can see this</legend>
        {visOptions(lab, viewer).map((o) => (
          <label key={o.id} className={f.visibility === o.id ? 'on' : ''}>
            <input type="radio" name="visibility" value={o.id} checked={f.visibility === o.id} onChange={set('visibility')} />
            {o.label}
          </label>
        ))}
      </fieldset>
      {f.visibility === 'private' && (
        <p className="hint small">Only you will see this, and it won't count toward the lab record until you share it.</p>
      )}

      <div className="form-foot">
        {onCancel ? (
          <button type="button" className="btn quiet" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <span className="muted small">{editing ? '' : 'Saved under your name.'}</span>
        )}
        <button type="submit" className="btn primary" disabled={!canSave}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function visOptions(lab, viewer) {
  const piFirst = lab.lab.pi.split(' ')[0];
  // For the head of the lab, "me and the head of the lab" is just "me".
  if (isPI(viewer.id))
    return [
      { id: 'lab', label: 'Everyone in the lab' },
      { id: 'private', label: 'Only me' },
    ];
  return [
    { id: 'lab', label: 'Everyone in the lab' },
    { id: 'pi', label: `Only me and ${piFirst} (head of lab)` },
    { id: 'private', label: 'Only me' },
  ];
}

const fmtSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
