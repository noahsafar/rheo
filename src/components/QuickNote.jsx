import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LOG_TYPES } from '../data/workspace.js';
import { newId } from '../lib/workspace.js';

// The "+" button on every screen. One tap opens a note; type or talk, pick nothing, save.
// Notes become log entries, so they land in the lab record like anything logged on My Work.

const PROMPTS = [
  { id: 'did', label: 'What I did' },
  { id: 'results', label: 'Results' },
  { id: 'process', label: 'Process used' },
];

const MAX_RECORDING_S = 120;

const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
const canRecord = typeof window !== 'undefined' && !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

// A rough first guess at what kind of entry this is, so people don't have to choose.
export function guessType(text) {
  const t = text.toLowerCase();
  if (/\b(idea|what if|could we|we could|hypothes[ie]s|might work)\b/.test(t)) return 'idea';
  if (/\b(changed|switched|modified|new protocol|instead of|now using|updated the (method|protocol))\b/.test(t))
    return 'protocol';
  if (/\b(results?|showed|measured|ran|assay|yield|observed|data|replicate|batch|sample|process used)\b/.test(t))
    return 'experiment';
  return 'note';
}

// First line or sentence becomes the record's name; the full note is kept as its details.
export function titleFrom(text) {
  const firstLine = text.trim().split('\n').find((l) => l.trim()) || '';
  const clean = firstLine.replace(/^(what i did|results|process used)\s*:\s*/i, '').trim();
  const sentence = clean.split(/(?<=[.!?])\s/)[0];
  return sentence.length > 90 ? sentence.slice(0, 87).trimEnd() + '…' : sentence;
}

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
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const close = () => {
    setOpen(false);
    fab.current?.focus();
  };

  return (
    <>
      <button
        ref={fab}
        className="qn-fab"
        aria-label="Add a quick note"
        title="Add a quick note"
        onClick={() => setOpen(true)}
      >
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
          <NoteForm
            lab={lab}
            viewer={viewer}
            inventions={inventions}
            onCancel={close}
            onSave={(entry, message) => {
              dispatch({ type: 'addLog', entry });
              setToast(message);
              close();
            }}
          />
        )}
      </dialog>
      <div className="qn-toast" role="status" aria-live="polite">
        {toast && <span>{toast}</span>}
      </div>
    </>
  );
}

function NoteForm({ lab, viewer, inventions, onCancel, onSave }) {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [invention, setInvention] = useState(inventions[0]?.id || '');
  const [typeChoice, setTypeChoice] = useState(null); // null = use the guess
  const [audio, setAudio] = useState(null); // { url, seconds }
  const [mic, setMic] = useState('idle'); // idle | listening | recording
  const [micError, setMicError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const box = useRef(null);
  const recog = useRef(null);
  const recorder = useRef(null);
  const timer = useRef(null);
  const cursorAtEnd = useRef(false);

  const type = typeChoice || guessType(text);
  const typeLabel = LOG_TYPES.find((t) => t.id === type)?.label;
  const canSave = text.trim().length > 0 || !!audio;

  useEffect(() => {
    box.current?.focus();
    return () => stopAll();
  }, []);

  const stopAll = () => {
    recog.current?.stop();
    if (recorder.current?.state === 'recording') recorder.current.stop();
    clearInterval(timer.current);
  };

  const addPrompt = (label) => {
    const prefix = text && !text.endsWith('\n') ? '\n' : '';
    const next = `${text}${prefix}${label}: `;
    cursorAtEnd.current = true;
    setText(next);
    box.current?.focus();
  };

  // After a heading is added, put the cursor right after it, before the next keystroke lands.
  useLayoutEffect(() => {
    if (!cursorAtEnd.current || !box.current) return;
    cursorAtEnd.current = false;
    box.current.setSelectionRange(text.length, text.length);
  }, [text]);

  // Dictation: words appear in the box as you speak.
  const startDictation = () => {
    setMicError(null);
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
        setText((t) => {
          const sep = t && !/[\s\n]$/.test(t) ? ' ' : '';
          const chunk = finalText.trim();
          return t + sep + chunk.charAt(0).toUpperCase() + chunk.slice(1);
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
    const body = text.trim();
    const title =
      titleFrom(body) || `Voice note, ${new Date(lab.lab.today + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const entry = {
      id: newId('log'),
      owner: viewer.id,
      created: new Date().toISOString(),
      date: lab.lab.today,
      title,
      body: body && body !== title ? body : '',
      type,
      invention,
      attachment: '',
      audio: audio?.url,
      audioSeconds: audio?.seconds,
      quick: true,
    };
    const inv = inventions.find((i) => i.id === invention);
    onSave(entry, inv ? `Note added to the ${inv.short} record.` : 'Note added to your lab record.');
  };

  const micSupported = !!SpeechRecognition || canRecord;
  const micLabel =
    mic === 'listening'
      ? 'Stop'
      : mic === 'recording'
        ? `Stop (${fmtSeconds(elapsed)})`
        : SpeechRecognition
          ? 'Speak'
          : 'Record voice note';

  return (
    <form
      className="qn-form"
      onSubmit={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(e);
      }}
    >
      <div className="qn-head">
        <h2 id="qn-h">Quick note</h2>
        <button type="button" className="btn quiet small" onClick={onCancel} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="qn-prompts" role="group" aria-label="Add a heading to your note">
        {PROMPTS.map((p) => (
          <button key={p.id} type="button" className="qn-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => addPrompt(p.label)}>
            + {p.label}
          </button>
        ))}
      </div>

      <label className="sr-only" htmlFor="qn-text">
        Note
      </label>
      <textarea
        id="qn-text"
        ref={box}
        className="qn-text"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you do, what happened, how did you do it? Rough is fine."
      />
      {interim && (
        <p className="qn-interim muted small" aria-live="polite">
          {interim}…
        </p>
      )}

      <div className="qn-voice">
        {micSupported ? (
          <button
            type="button"
            className={`btn ${mic !== 'idle' ? 'qn-live' : ''}`}
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
      {micError && <p className="warn-text small">{micError}</p>}

      <div className="field-row qn-meta">
        <label className="field">
          <span>Project</span>
          <select value={invention} onChange={(e) => setInvention(e.target.value)}>
            {inventions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.short}
              </option>
            ))}
            <option value="">Other lab work</option>
          </select>
        </label>
        <label className="field">
          <span>Saved as{typeChoice ? '' : ' (Rheo guessed)'}</span>
          <select value={type} onChange={(e) => setTypeChoice(e.target.value)}>
            {LOG_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {type === 'idea' && (
        <p className="hint small">A dated idea with your name on it can become the record of conception for a patent.</p>
      )}

      <div className="form-foot">
        <span className="muted small">Dated today, under your name{typeLabel ? `, as ${typeLabel.toLowerCase()}` : ''}.</span>
        <button type="submit" className="btn primary" disabled={!canSave}>
          Save note
        </button>
      </div>
    </form>
  );
}

const fmtSeconds = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
