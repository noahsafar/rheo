import { useEffect, useRef, useState } from 'react';
import { driveFolders, folderCounts, LAB_SOURCES } from '../data/workspace.js';
import { connectionsFor, newId } from '../lib/workspace.js';
import { SourceIcon } from './Connect.jsx';
import { formatDate } from '../lib/record.js';

const DEFAULT_FOLDERS = ['Lab data', 'Figures', 'Drafts', 'Coursework', 'Personal'];

export default function Sources({ lab, files, state, dispatch, viewer }) {
  const first = viewer.name.split(' ')[0];
  const conn = connectionsFor(state, viewer.id);
  const pages = files.filter((f) => f.kind === 'scan' && f.owner === viewer.id);

  return (
    <div className="page narrow">
      <section className="page-head">
        <p className="crumb">
          <a href="#/me">My work</a> / My sources
        </p>
        <h1>My sources</h1>
        <p className="lede">
          Connect the places your lab work lives so it counts toward the lab record. Rheo only reads what you choose,
          and you can disconnect at any time.
        </p>
      </section>

      <GoogleDrive viewer={viewer} folders={conn.gdrive || []} dispatch={dispatch} />

      <NotebookPages lab={lab} viewer={viewer} pages={pages} dispatch={dispatch} />

      <section className="card" aria-labelledby="labtools-h">
        <h2 id="labtools-h">Connected by the lab</h2>
        <p className="muted">
          {lab.lab.pi} connected these once for everyone. Your files in them are already included; nothing to do here.
        </p>
        <ul className="source-list">
          {lab.sources
            .filter((s) => LAB_SOURCES.includes(s.id))
            .map((s) => (
              <li key={s.id}>
                <SourceIcon kind={s.kind} />
                <div>
                  <strong>{s.name}</strong>
                  <span className="muted">{s.note}</span>
                </div>
                <span className="pill ok">Connected</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function GoogleDrive({ viewer, folders, dispatch }) {
  const [step, setStep] = useState(null); // null | 'consent' | 'pick'
  const [picked, setPicked] = useState(folders);
  const available = driveFolders[viewer.id] || DEFAULT_FOLDERS;
  const total = folders.reduce((n, f) => n + (folderCounts[f] ?? 25), 0);
  const save = (value) => dispatch({ type: 'connection', member: viewer.id, source: 'gdrive', value });

  return (
    <section className="card" aria-labelledby="gdrive-h">
      <div className="card-head">
        <h2 id="gdrive-h" className="with-icon">
          <SourceIcon kind="Files" /> My Google Drive
        </h2>
        {folders.length > 0 ? <span className="pill ok">{folders.length} folders shared</span> : <span className="pill warn">Not connected</span>}
      </div>
      <p className="muted">
        Google Docs, Sheets and Slides are files in Drive, so this one connection covers them too. You choose the
        folders; Rheo never sees the rest of your Drive.
      </p>

      {folders.length > 0 && (
        <ul className="folder-list">
          {folders.map((f) => (
            <li key={f}>
              <span>{f}</span>
              <span className="muted small tnum">{folderCounts[f] ?? 25} files</span>
              <button className="link small" onClick={() => save(folders.filter((x) => x !== f))}>
                Stop sharing
              </button>
            </li>
          ))}
        </ul>
      )}
      {folders.length > 0 && (
        <p className="muted small">
          Rheo is reading {total} files. Matches to the lab's inventions show up on My work for you to confirm.
        </p>
      )}
      <div className="form-foot">
        <span />
        <button
          className={`btn ${folders.length ? '' : 'primary'}`}
          onClick={() => {
            setPicked(folders);
            setStep(folders.length ? 'pick' : 'consent');
          }}
        >
          {folders.length ? 'Choose folders' : 'Connect Google Drive'}
        </button>
      </div>

      {step && (
        <Dialog title={step === 'consent' ? 'Allow read-only access' : 'Choose folders to share'} onClose={() => setStep(null)}>
          {step === 'consent' ? (
            <>
              <p className="demo-note small">
                Demo: in the real product your Yale Google account sign-in opens here. Nothing connects in this
                prototype.
              </p>
              <p>
                Signing in as <strong>{viewer.email || 'your Yale Google account'}</strong>. Rheo is asking to:
              </p>
              <ul className="perm-list">
                <li>See and download only the Drive folders you pick next</li>
                <li>See file names, dates and who made each file</li>
              </ul>
              <p className="muted small">
                Rheo can't edit, delete or share your files, and can't see folders you don't pick.
              </p>
              <div className="form-foot">
                <button className="btn quiet" onClick={() => setStep(null)}>
                  Cancel
                </button>
                <button className="btn primary" onClick={() => setStep('pick')}>
                  Allow and choose folders
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted">Pick the folders with lab work. Leave out anything personal.</p>
              <ul className="pick-list">
                {available.map((f) => (
                  <li key={f}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={picked.includes(f)}
                        onChange={(e) => setPicked(e.target.checked ? [...picked, f] : picked.filter((x) => x !== f))}
                      />
                      <span>
                        {f}
                        <span className="muted small stack">
                          {f === 'Personal' ? 'Keep this one private' : `${folderCounts[f] ?? 25} files`}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="form-foot">
                <button className="btn quiet" onClick={() => setStep(null)}>
                  Cancel
                </button>
                <button
                  className="btn primary"
                  onClick={() => {
                    save(picked);
                    setStep(null);
                  }}
                >
                  {picked.length ? `Share ${picked.length} ${picked.length === 1 ? 'folder' : 'folders'}` : 'Share nothing'}
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </section>
  );
}

// Shrink a photo in the browser so the demo can keep it. The real product saves the full image to lab storage.
function thumbnail(file, max = 560) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('not an image'));
    };
    img.src = url;
  });
}

function NotebookPages({ lab, viewer, pages, dispatch }) {
  const input = useRef(null);
  const [queue, setQueue] = useState([]);
  const [error, setError] = useState('');
  const onInventions = lab.inventions.filter((i) => i.contributors.some((c) => c.member === viewer.id));
  const lastNotebook = pages[pages.length - 1]?.name.split(',')[0] || 'Notebook 1';
  const nextPage = (pages.reduce((n, p) => Math.max(n, parseInt(p.name.split('p. ')[1]) || 0), 0) || 0) + 1;

  const add = async (fileList) => {
    setError('');
    const items = [];
    for (const [i, file] of [...fileList].entries()) {
      try {
        items.push({
          key: newId('q'),
          thumb: await thumbnail(file),
          fileName: file.name,
          notebook: lastNotebook,
          page: String(nextPage + i),
          date: lab.lab.today,
          invention: onInventions[0]?.id || '',
          isIdea: false,
          note: '',
        });
      } catch {
        setError(`${file.name} isn't a photo Rheo can read. Try a JPEG or PNG.`);
      }
    }
    setQueue((q) => [...q, ...items]);
  };

  const update = (key, patch) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const save = (item) => {
    dispatch({
      type: 'addPage',
      page: {
        id: newId('page'),
        owner: viewer.id,
        notebook: item.notebook.trim() || 'Notebook',
        page: item.page,
        date: item.date,
        invention: item.invention,
        isIdea: item.isIdea,
        note: item.note.trim(),
        thumb: item.thumb,
        created: new Date().toISOString(),
      },
    });
    setQueue((q) => q.filter((x) => x.key !== item.key));
  };

  return (
    <section className="card" aria-labelledby="nb-h">
      <div className="card-head">
        <h2 id="nb-h" className="with-icon">
          <SourceIcon kind="Notebook" /> Paper notebook pages
        </h2>
        <span className="pill">{pages.length} saved</span>
      </div>
      <p className="muted">
        Photograph a page with your phone or add photos from your computer. Check the date and page number, then save:
        the photo goes to the lab's OneDrive, so the page stays with the lab after you leave.
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        id="nb-input"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
        <button className="btn primary" onClick={() => input.current?.click()}>
          Add notebook pages
        </button>
        <span className="muted small">or drop photos here</span>
      </div>
      {error && <p className="warn-text small" role="alert">{error}</p>}

      {queue.map((item) => (
        <div key={item.key} className="page-check">
          <img src={item.thumb} alt={`Photo of notebook page from ${item.fileName}`} />
          <div className="page-fields">
            <p className="small muted">Check these before saving. They make the page usable as a dated record.</p>
            <div className="field-row">
              <label className="field">
                <span>Notebook</span>
                <input value={item.notebook} onChange={(e) => update(item.key, { notebook: e.target.value })} />
              </label>
              <label className="field narrow-field">
                <span>Page</span>
                <input inputMode="numeric" value={item.page} onChange={(e) => update(item.key, { page: e.target.value })} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Date written on the page</span>
                <input type="date" value={item.date} max={lab.lab.today} onChange={(e) => update(item.key, { date: e.target.value })} />
              </label>
              <label className="field">
                <span>Project</span>
                <select value={item.invention} onChange={(e) => update(item.key, { invention: e.target.value })}>
                  {onInventions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.short}
                    </option>
                  ))}
                  <option value="">Other lab work</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>What's on it (optional)</span>
              <input value={item.note} onChange={(e) => update(item.key, { note: e.target.value })} placeholder="Day 7 and 14 release readings, batches 12–14" />
            </label>
            <label className="check">
              <input type="checkbox" checked={item.isIdea} onChange={(e) => update(item.key, { isIdea: e.target.checked })} />
              <span>This page records a new idea</span>
            </label>
            <div className="form-foot">
              <button className="btn quiet small" onClick={() => setQueue((q) => q.filter((x) => x.key !== item.key))}>
                Discard
              </button>
              <button className="btn primary small" onClick={() => save(item)}>
                Save page
              </button>
            </div>
          </div>
        </div>
      ))}

      {pages.length > 0 && (
        <ul className="page-grid">
          {pages
            .slice()
            .reverse()
            .map((p) => (
              <li key={p.id}>
                {p.thumb ? <img src={p.thumb} alt={`Photo of ${p.name}`} /> : <span className="no-thumb" />}
                <span className="small">{p.name}</span>
                <span className="muted small">{formatDate(p.date)}</span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    // Runs once per open, so focus isn't pulled back to the first control on every re-render.
    const prev = document.activeElement;
    ref.current?.querySelector('button, input, select, textarea')?.focus();
    const onKey = (e) => e.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, []);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog small-dialog" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="btn small quiet" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
