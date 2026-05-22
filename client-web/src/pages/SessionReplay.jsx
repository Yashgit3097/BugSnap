import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Terminal, Network, MousePointer2, Share2, ArrowLeft, Check,
  Server, FileCode, CornerDownRight, Laptop, Cpu, Monitor, Calendar,
  Search, AlertTriangle, Info, Clock, ExternalLink
} from 'lucide-react';

// ─── Design tokens — matches Intro.jsx / Dashboard.jsx ──────────────────────
const DT = {
  bg:       '#09090b',              // zinc-950 main bg
  bgAlt:    '#0d0d10',              // alternate row
  bgActive: '#131318',              // highlighted row bg
  bgHover:  '#111113',              // hover state
  surface:  '#111113',              // toolbar / header
  border:   'rgba(255,255,255,0.07)',
  text:     '#f4f4f5',              // zinc-100
  textDim:  '#52525b',              // zinc-600 muted / timestamps
  textSub:  '#a1a1aa',              // zinc-400 secondary
  accent:   '#22d3ee',              // cyan-400 — primary
  accentHL: 'rgba(34,211,238,0.09)',
  green:    '#4ade80',              // success / POST
  red:      '#f87171',              // error / DELETE
  yellow:   '#fbbf24',              // warn / PATCH PUT — amber
  purple:   '#c4b5fd',              // object keys — violet-300
  cyan:     '#67e8f9',              // strings — cyan-300
  orange:   '#fb923c',              // actions accent
  borderHL: '#22d3ee',              // active row left border
  tag:      'rgba(255,255,255,0.06)',
};

// ─── Console Data Normalizer ───────────────────────────────────────────────────
const KNOWN_TYPES = ['null', 'undefined', 'number', 'boolean', 'string', 'error', 'array', 'object', 'function', 'symbol'];

const normalizeArg = (val) => {
  if (val === null) return { type: 'null', value: null };
  if (val === undefined) return { type: 'undefined', value: undefined };
  if (typeof val === 'object' && val !== null && 'type' in val && 'value' in val && KNOWN_TYPES.includes(val.type)) return val;
  if (typeof val === 'number') return { type: 'number', value: val };
  if (typeof val === 'boolean') return { type: 'boolean', value: val };
  if (typeof val === 'string') return { type: 'string', value: val };
  if (Array.isArray(val)) return { type: 'array', value: val };
  if (val instanceof Error || (typeof val === 'object' && ('stack' in val || 'message' in val))) {
    return { type: 'error', value: val.message || String(val), stack: val.stack };
  }
  if (typeof val === 'object') return { type: 'object', value: val };
  return { type: 'string', value: String(val) };
};

const renderFlatPreview = (val) => {
  const n = normalizeArg(val);
  if (n.type === 'null') return 'null';
  if (n.type === 'undefined') return 'undefined';
  if (n.type === 'number') return String(n.value);
  if (n.type === 'boolean') return String(n.value);
  if (n.type === 'string') return `"${n.value}"`;
  if (n.type === 'error') return 'Error';
  if (n.type === 'array') return `Array(${n.value?.length || 0})`;
  if (n.type === 'object') return '{…}';
  return String(n.value);
};

/**
 * ConsoleArg — Dark DevTools-style recursive expand/collapse.
 * Expand/collapse mechanism completely unchanged.
 */
const ConsoleArg = ({ arg: rawArg, isTopLevel = false }) => {
  const [expanded, setExpanded] = useState(false);
  const arg = normalizeArg(rawArg);
  if (!arg) return <span style={{ color: DT.textDim, fontFamily: 'monospace' }}>null</span>;
  const { type, value } = arg;

  if (type === 'null') return <span style={{ color: DT.textDim, fontFamily: 'monospace' }}>null</span>;
  if (type === 'undefined') return <span style={{ color: DT.textDim, fontFamily: 'monospace' }}>undefined</span>;
  if (type === 'number') return <span style={{ color: DT.accent, fontFamily: 'monospace' }}>{String(value)}</span>;
  if (type === 'boolean') return <span style={{ color: DT.accent, fontFamily: 'monospace' }}>{String(value)}</span>;
  if (type === 'string') {
    return isTopLevel
      ? <span style={{ color: DT.text, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{String(value)}</span>
      : <span style={{ color: DT.cyan, fontFamily: 'monospace' }}>"{String(value)}"</span>;
  }
  if (type === 'error') {
    return (
      <div style={{ color: DT.red, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>
        <div style={{ fontWeight: 600 }}>{value}</div>
        {arg.stack && (
          <pre style={{ fontSize: 10, color: '#f38ba880', marginTop: 4, paddingLeft: 12, borderLeft: `2px solid ${DT.red}`, overflow: 'auto', userSelect: 'text' }}>
            {arg.stack}
          </pre>
        )}
      </div>
    );
  }

  if (type === 'array') {
    const items = Array.isArray(value) ? value : [];
    const toggle = (e) => { e.stopPropagation(); setExpanded(x => !x); };
    const previews = items.slice(0, 5).map((item, idx) => {
      const n = normalizeArg(item);
      if (n.type === 'null') return <span key={idx} style={{ color: DT.textDim, fontFamily: 'monospace' }}>null</span>;
      if (n.type === 'undefined') return <span key={idx} style={{ color: DT.textDim, fontFamily: 'monospace' }}>undefined</span>;
      if (n.type === 'number') return <span key={idx} style={{ color: DT.accent, fontFamily: 'monospace' }}>{String(n.value)}</span>;
      if (n.type === 'boolean') return <span key={idx} style={{ color: DT.accent, fontFamily: 'monospace' }}>{String(n.value)}</span>;
      if (n.type === 'string') return <span key={idx} style={{ color: DT.cyan, fontFamily: 'monospace' }}>"{String(n.value)}"</span>;
      return <span key={idx} style={{ color: DT.textSub, fontFamily: 'monospace' }}>{renderFlatPreview(item)}</span>;
    });
    return (
      <div style={{ fontFamily: 'monospace', display: 'inline-block' }}>
        <span onClick={toggle} style={{ cursor: 'pointer', userSelect: 'none', color: DT.text }}>
          <span style={{ fontSize: 9, color: DT.textDim, marginRight: 4 }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ color: DT.textSub, fontStyle: 'italic', marginRight: 2 }}>Array({items.length})</span>
          <span style={{ color: DT.textDim }}>[</span>
          {previews.reduce((acc, x, i) => i === 0 ? [x] : [...acc, <span key={`s${i}`} style={{ color: DT.textDim }}>, </span>, x], [])}
          {items.length > 5 && <span style={{ color: DT.textDim }}>, …</span>}
          <span style={{ color: DT.textDim }}>]</span>
        </span>
        {expanded && (
          <div style={{ paddingLeft: 16, borderLeft: `1px solid ${DT.border}`, marginTop: 2, marginLeft: 8 }}>
            {items.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'flex-start', fontSize: 12, marginBottom: 1 }}>
                <span style={{ color: DT.textDim, marginRight: 8, userSelect: 'none', flexShrink: 0, minWidth: 24, textAlign: 'right' }}>{index}:</span>
                <ConsoleArg arg={item} />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: 12 }}>
              <span style={{ color: DT.textDim, marginRight: 8, userSelect: 'none', minWidth: 24, textAlign: 'right' }}>length:</span>
              <span style={{ color: DT.accent, fontFamily: 'monospace' }}>{items.length}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'object') {
    const keys = value ? Object.keys(value) : [];
    const toggle = (e) => { e.stopPropagation(); setExpanded(x => !x); };
    const previews = keys.slice(0, 4).map((key) => {
      const item = value[key];
      const n = normalizeArg(item);
      let pv;
      if (n.type === 'null') pv = <span style={{ color: DT.textDim }}>null</span>;
      else if (n.type === 'undefined') pv = <span style={{ color: DT.textDim }}>undefined</span>;
      else if (n.type === 'number' || n.type === 'boolean') pv = <span style={{ color: DT.accent }}>{String(n.value)}</span>;
      else if (n.type === 'string') pv = <span style={{ color: DT.cyan }}>"{String(n.value)}"</span>;
      else if (n.type === 'array') pv = <span style={{ color: DT.textSub }}>Array({n.value?.length || 0})</span>;
      else if (n.type === 'object') pv = <span style={{ color: DT.textSub }}>{'{ … }'}</span>;
      else pv = <span style={{ color: DT.textSub }}>{renderFlatPreview(item)}</span>;
      return (
        <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ color: DT.purple }}>{key}</span>
          <span style={{ color: DT.textDim }}>: </span>
          {pv}
        </span>
      );
    });
    return (
      <div style={{ fontFamily: 'monospace', display: 'inline-block' }}>
        <span onClick={toggle} style={{ cursor: 'pointer', userSelect: 'none', color: DT.text }}>
          <span style={{ fontSize: 9, color: DT.textDim, marginRight: 4 }}>{expanded ? '▼' : '▶'}</span>
          <span style={{ color: DT.textSub, fontStyle: 'italic', marginRight: 2 }}>Object</span>
          <span style={{ color: DT.textDim }}>{'{'}</span>
          {previews.reduce((acc, x, i) => i === 0 ? [x] : [...acc, <span key={`s${i}`} style={{ color: DT.textDim }}>, </span>, x], [])}
          {keys.length > 4 && <span style={{ color: DT.textDim }}>, …</span>}
          <span style={{ color: DT.textDim }}>{'}'}</span>
        </span>
        {expanded && (
          <div style={{ paddingLeft: 16, borderLeft: `1px solid ${DT.border}`, marginTop: 2, marginLeft: 8 }}>
            {keys.map((key) => (
              <div key={key} style={{ display: 'flex', alignItems: 'flex-start', fontSize: 12, marginBottom: 1 }}>
                <span style={{ color: DT.purple, marginRight: 8, userSelect: 'none', flexShrink: 0 }}>{key}:</span>
                <ConsoleArg arg={value[key]} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span style={{ color: DT.text, fontFamily: 'monospace' }}>{String(value || rawArg)}</span>;
};

// ─── JSON Tree Viewer ─────────────────────────────────────────────────────────

/**
 * Recursive JSON node with expand/collapse, syntax highlighting,
 * and item-count preview when collapsed.
 */
const JsonNode = ({ value, keyName = null, depth = 0, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded || depth === 0);

  const toggle = (e) => { e.stopPropagation(); setExpanded(x => !x); };

  const indent = { paddingLeft: depth === 0 ? 0 : 16, borderLeft: depth > 0 ? `1px solid rgba(255,255,255,0.06)` : 'none', marginLeft: depth > 0 ? 8 : 0 };

  const KeyLabel = () => keyName !== null ? (
    <span>
      <span style={{ color: DT.purple, fontWeight: 500 }}>"{keyName}"</span>
      <span style={{ color: DT.textDim }}>: </span>
    </span>
  ) : null;

  // ── Primitives ──
  if (value === null)      return <div style={{ fontSize: 12, lineHeight: 1.8 }}><KeyLabel /><span style={{ color: DT.textDim, fontStyle: 'italic' }}>null</span></div>;
  if (value === undefined) return <div style={{ fontSize: 12, lineHeight: 1.8 }}><KeyLabel /><span style={{ color: DT.textDim, fontStyle: 'italic' }}>undefined</span></div>;
  if (typeof value === 'boolean') return <div style={{ fontSize: 12, lineHeight: 1.8 }}><KeyLabel /><span style={{ color: DT.yellow, fontWeight: 600 }}>{String(value)}</span></div>;
  if (typeof value === 'number')  return <div style={{ fontSize: 12, lineHeight: 1.8 }}><KeyLabel /><span style={{ color: DT.accent }}>{String(value)}</span></div>;
  if (typeof value === 'string')  return (
    <div style={{ fontSize: 12, lineHeight: 1.8, wordBreak: 'break-all' }}>
      <KeyLabel /><span style={{ color: DT.cyan }}>"</span><span style={{ color: DT.cyan }}>{value}</span><span style={{ color: DT.cyan }}>"</span>
    </div>
  );

  // ── Array ──
  if (Array.isArray(value)) {
    const len = value.length;
    return (
      <div style={depth > 0 ? indent : {}}>
        <div onClick={toggle} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, lineHeight: 1.8 }}>
          <span style={{ fontSize: 9, color: DT.textDim, width: 10, display: 'inline-block', textAlign: 'center', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
          <KeyLabel />
          <span style={{ color: DT.textDim }}>[</span>
          {!expanded && (
            <span style={{ color: DT.textDim, fontStyle: 'italic', fontSize: 11 }}>
              {len} {len === 1 ? 'item' : 'items'}
            </span>
          )}
          {!expanded && <span style={{ color: DT.textDim }}>]</span>}
        </div>
        {expanded && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: 4 }}>
            {value.map((item, i) => (
              <JsonNode key={i} keyName={i} value={item} depth={depth + 1} defaultExpanded={false} />
            ))}
            <div style={{ fontSize: 12, lineHeight: 1.8, color: DT.textDim }}>]</div>
          </div>
        )}
      </div>
    );
  }

  // ── Object ──
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return (
      <div style={depth > 0 ? indent : {}}>
        <div onClick={toggle} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, lineHeight: 1.8 }}>
          <span style={{ fontSize: 9, color: DT.textDim, width: 10, display: 'inline-block', textAlign: 'center', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
          <KeyLabel />
          <span style={{ color: DT.textDim }}>{'{'}</span>
          {!expanded && (
            <span style={{ color: DT.textDim, fontStyle: 'italic', fontSize: 11 }}>
              {keys.length} {keys.length === 1 ? 'key' : 'keys'}
            </span>
          )}
          {!expanded && <span style={{ color: DT.textDim }}>{'}'}</span>}
        </div>
        {expanded && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: 4 }}>
            {keys.map(k => (
              <JsonNode key={k} keyName={k} value={value[k]} depth={depth + 1} defaultExpanded={false} />
            ))}
            <div style={{ fontSize: 12, lineHeight: 1.8, color: DT.textDim }}>{'}'}</div>
          </div>
        )}
      </div>
    );
  }

  return <div style={{ fontSize: 12, lineHeight: 1.8, color: DT.text }}><KeyLabel />{String(value)}</div>;
};

/**
 * JsonViewer — wraps JsonNode with a copy button, line count badge,
 * and a raw/tree toggle. Falls back to plain <pre> for non-JSON.
 */
const JsonViewer = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);

  if (!value) {
    return <span style={{ color: DT.textDim, fontStyle: 'italic', fontSize: 11 }}>Empty</span>;
  }

  let parsed = null;
  let isJSON = false;
  let rawStr = '';

  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
    rawStr = JSON.stringify(parsed, null, 2);
    isJSON = typeof parsed === 'object' && parsed !== null;
  } catch {
    rawStr = String(value);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(rawStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const lineCount = rawStr.split('\n').length;

  return (
    <div style={{ background: DT.bgAlt, border: `1px solid ${DT.border}`, borderRadius: 10, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'rgba(255,255,255,0.03)', borderBottom: `1px solid ${DT.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
            {isJSON ? (Array.isArray(parsed) ? `Array · ${parsed.length} items` : `Object · ${Object.keys(parsed).length} keys`) : 'Plain text'}
          </span>
          <span style={{ fontSize: 10, color: DT.muted, fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.04)', border: `1px solid ${DT.border}`, padding: '1px 6px', borderRadius: 4 }}>
            {lineCount} lines
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isJSON && (
            <button
              onClick={() => setViewRaw(x => !x)}
              style={{ fontSize: 10, fontWeight: 600, color: viewRaw ? DT.accent : DT.textDim, background: viewRaw ? 'rgba(34,211,238,0.08)' : 'transparent', border: `1px solid ${viewRaw ? 'rgba(34,211,238,0.2)' : DT.border}`, borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            >
              {viewRaw ? 'Tree' : 'Raw'}
            </button>
          )}
          <button
            onClick={handleCopy}
            style={{ fontSize: 10, fontWeight: 600, color: copied ? DT.green : DT.textDim, background: copied ? 'rgba(74,222,128,0.08)' : 'transparent', border: `1px solid ${copied ? 'rgba(74,222,128,0.2)' : DT.border}`, borderRadius: 5, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', maxHeight: 280, overflowY: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
        {isJSON && !viewRaw ? (
          <JsonNode value={parsed} depth={0} defaultExpanded={true} />
        ) : (
          <pre style={{ fontSize: 11, color: DT.text, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {rawStr}
          </pre>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const SessionReplay = () => {
  const { publicId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState('console');
  const [selectedNetworkReq, setSelectedNetworkReq] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');

  const videoRef = useRef(null);
  const consoleContainerRef = useRef(null);
  const networkContainerRef = useRef(null);
  const actionsContainerRef = useRef(null);
  const activeLogRef = useRef(null);
  const activeNetRef = useRef(null);
  const activeActRef = useRef(null);
  useEffect(() => {
    axios.get(`http://localhost:5000/api/sessions/public/${publicId}`)
      .then(r => {
        console.log("Fetched session:", r.data);
        setData(r.data);
      })
      .catch(e => console.error('Failed to fetch session', e))
      .finally(() => setLoading(false));
  }, [publicId]);

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime * 1000);
  };

  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const t = Math.floor((ms % 1000) / 100);
    return `${m}:${sec}.${t}`;
  };

  const handleShareClick = () => {
    navigator.clipboard.writeText(`${window.location.origin}/session/${publicId}`)
      .then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); });
  };

  // renderJSONPayload now delegates to the JsonViewer component above
  const renderJSONPayload = (val) => <JsonViewer value={val} />;

  const renderConsoleLog = (log) => {
    try {
      if (log.message.startsWith('[') && log.message.endsWith(']')) {
        const args = JSON.parse(log.message);
        if (Array.isArray(args)) {
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 10px', userSelect: 'text' }}>
              {args.map((arg, idx) => <ConsoleArg key={idx} arg={arg} isTopLevel={true} />)}
            </div>
          );
        }
      }
    } catch { /* fallthrough */ }
    return <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', userSelect: 'text', color: DT.text }}>{log.message}</div>;
  };

  // Data
  const session = data?.session;
  const logs = data?.logs || [];
  const networkRequests = data?.networkRequests || [];
  const actions = data?.actions || [];

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(consoleFilter.toLowerCase()));
  const filteredNetwork = networkRequests.filter(r => r.url.toLowerCase().includes(networkFilter.toLowerCase()));

  // Active index (last item with time <= currentTime)
  const activeLogIndex = (() => {
    let b = -1;
    for (let i = 0; i < filteredLogs.length; i++) { if (filteredLogs[i].time <= currentTime) b = i; else break; }
    return b;
  })();
  const activeNetIndex = (() => {
    let b = -1;
    for (let i = 0; i < filteredNetwork.length; i++) { if (filteredNetwork[i].time <= currentTime) b = i; else break; }
    return b;
  })();
  const activeActIndex = (() => {
    let b = -1;
    for (let i = 0; i < actions.length; i++) { if (actions[i].time <= currentTime) b = i; else break; }
    return b;
  })();

  // Auto-scroll to active
  useEffect(() => {
    if (activeTab === 'console' && activeLogRef.current)
      activeLogRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeLogIndex, activeTab]);
  useEffect(() => {
    if (activeTab === 'network' && activeNetRef.current && !selectedNetworkReq)
      activeNetRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeNetIndex, activeTab, selectedNetworkReq]);
  useEffect(() => {
    if (activeTab === 'actions' && activeActRef.current)
      activeActRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeActIndex, activeTab]);

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(34,211,238,0.15)', borderTopColor: '#22d3ee', borderRightColor: '#fbbf24', animation: 'spin 0.85s linear infinite', margin: '0 auto 14px' }} />
          <p style={{ color: '#52525b', fontSize: 12, fontFamily: 'Inter,sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading session…</p>
        </div>
      </div>
    );
  }

  // ── Not Found ─────────────────────────────────────────────────────
  if (!data || !data.session) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{ padding: 20, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 16, color: '#f87171' }}><AlertTriangle size={36} /></div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f5', marginBottom: 8 }}>Session Not Found</h2>
          <p style={{ color: '#52525b', fontSize: 14 }}>This bug report may have expired or been deleted.</p>
        </div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#22d3ee', color: '#09090b', fontWeight: 700, fontSize: 13, padding: '10px 20px', borderRadius: 12, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const methodColor = (m) => {
    if (m === 'POST') return DT.green;
    if (m === 'DELETE') return DT.red;
    if (m === 'PUT' || m === 'PATCH') return DT.yellow;
    return DT.accent;
  };

  // ── Main View ─────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#09090b', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.25); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.4); }
          50%      { box-shadow: 0 0 0 4px rgba(34,211,238,0); }
        }
        @keyframes hlFlash {
          0%   { background-color: rgba(34,211,238,0.14); }
          100% { background-color: rgba(34,211,238,0.05); }
        }
        @keyframes hlFlashAction {
          0%   { background-color: rgba(34,211,238,0.16); }
          100% { background-color: rgba(34,211,238,0.05); }
        }
      `}</style>

      {/* ════ HEADER ════ */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 56, flexShrink: 0, background: 'rgba(9,9,11,0.9)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${DT.border}`, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${DT.border}`, color: DT.textDim, textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = DT.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = DT.textDim; }}>
            <ArrowLeft size={14} />
          </Link>
          <div style={{ width: 1, height: 18, background: DT.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(251,191,36,0.1))', border: '1px solid rgba(34,211,238,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.accent }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <polygon points="11,10.5 14,12 11,13.5" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 13, fontWeight: 700, color: DT.text, margin: 0, lineHeight: 1.2 }}>{session.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: DT.textDim, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar size={9} />{new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                {session.browserInfo && (
                  <span style={{ fontSize: 10, color: DT.textDim, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Laptop size={9} />{session.browserInfo.browser} · {session.browserInfo.os}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[
            { label: `${logs.length} logs`,              color: DT.accent },
            { label: `${networkRequests.length} requests`, color: DT.green },
            { label: `${actions.length} actions`,         color: DT.orange },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: DT.tag, border: `1px solid ${DT.border}`, fontSize: 10, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {label}
            </div>
          ))}
          <div style={{ width: 1, height: 18, background: DT.border }} />
          <button onClick={handleShareClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, background: shareCopied ? 'rgba(74,222,128,0.12)' : DT.accent, border: shareCopied ? '1px solid rgba(74,222,128,0.3)' : 'none', color: shareCopied ? DT.green : '#09090b', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit' }}>
            {shareCopied ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
          </button>
        </div>
      </header>

      {/* ════ BODY — fixed 50/50 columns ════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ═══ LEFT: VIDEO ═══ */}
        <div style={{ width: '50%', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#09090b', borderRight: `1px solid ${DT.border}`, overflow: 'hidden' }}>
          {/* Player titlebar */}
          <div style={{ background: DT.surface, padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${DT.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#f87171','#fbbf24','#4ade80'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.5 }} />)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: DT.accent, display: 'inline-block', animation: 'pulseGlow 2s infinite' }} />
              Session Replay
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: DT.accent, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 5, padding: '2px 8px', letterSpacing: 1 }}>
              {formatTime(currentTime)}
            </div>
          </div>

          {/* Video — fills remaining space */}
          <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <video ref={videoRef} src={session.videoUrl} controls onTimeUpdate={handleTimeUpdate}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>

          {/* Env bar */}
          {session.browserInfo && (
            <div style={{ flexShrink: 0, padding: '7px 14px', borderTop: `1px solid ${DT.border}`, background: DT.surface, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ padding: 6, borderRadius: 7, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: DT.accent }}><Laptop size={11} /></div>
                <div>
                  <div style={{ fontSize: 9, color: DT.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Environment</div>
                  <div style={{ fontSize: 11, color: DT.textSub, fontWeight: 600, marginTop: 1 }}>{session.browserInfo.os || 'OS'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: DT.textDim }}>
                  <Cpu size={10} style={{ color: DT.accent }} />
                  <span style={{ color: DT.textSub, fontWeight: 600 }}>{session.browserInfo.browser || 'N/A'}</span>
                </div>
                {session.browserInfo.screen && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: DT.textDim }}>
                    <Monitor size={10} style={{ color: DT.accent }} />
                    <span style={{ color: DT.textSub, fontWeight: 600 }}>{session.browserInfo.screen}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: DARK DEVTOOLS ═══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: DT.bg, overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', background: DT.surface, borderBottom: `1px solid ${DT.border}`, flexShrink: 0, paddingLeft: 4 }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {[
                { id: 'console', label: 'Console', count: logs.length },
                { id: 'network', label: 'Network', count: networkRequests.length },
                { id: 'actions', label: 'Actions', count: actions.length },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedNetworkReq(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 36, fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? DT.accent : DT.textDim, background: isActive ? DT.bg : 'transparent', border: 'none', borderBottom: isActive ? `2px solid ${DT.accent}` : `2px solid transparent`, cursor: 'pointer', outline: 'none', transition: 'all 0.15s', fontFamily: 'Inter,sans-serif' }}>
                    {tab.label}
                    <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: isActive ? 'rgba(34,211,238,0.12)' : DT.tag, color: isActive ? DT.accent : DT.textDim }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingRight: 12, fontSize: 10, color: DT.textDim, fontFamily: 'monospace', userSelect: 'none' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: DT.accent, display: 'inline-block', animation: 'pulseGlow 2s infinite' }} />
              {formatTime(currentTime)}
            </div>
          </div>

          {/* ─── CONSOLE PANEL ─── */}
          {activeTab === 'console' && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: DT.surface, borderBottom: `1px solid ${DT.border}`, flexShrink: 0 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: DT.textDim }} />
                  <input type="text" placeholder="Filter" value={consoleFilter} onChange={e => setConsoleFilter(e.target.value)}
                    style={{ width: '100%', height: 24, paddingLeft: 26, paddingRight: 8, background: DT.bg, border: `1px solid ${DT.border}`, borderRadius: 4, fontSize: 12, color: DT.text, outline: 'none', fontFamily: 'Inter,sans-serif' }} />
                </div>
                <div style={{ fontSize: 10, color: DT.textDim, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {activeLogIndex >= 0 ? activeLogIndex + 1 : 0} / {filteredLogs.length}
                </div>
              </div>

              {/* Log rows */}
              <div ref={consoleContainerRef} style={{ flex: 1, overflowY: 'auto', background: DT.bg }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: DT.textDim, gap: 8 }}>
                    <Terminal size={20} style={{ opacity: 0.35 }} />
                    <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{consoleFilter ? 'No matching messages.' : 'No console messages captured.'}</span>
                  </div>
                ) : (
                  filteredLogs.map((log, i) => {
                    const isErr = log.type === 'error';
                    const isWarn = log.type === 'warn';
                    const isActive = i === activeLogIndex;

                    const rowBg = isActive
                      ? (isErr ? 'rgba(248,113,113,0.1)' : isWarn ? 'rgba(251,191,36,0.08)' : DT.accentHL)
                      : (isErr ? 'rgba(248,113,113,0.05)' : isWarn ? 'rgba(251,191,36,0.04)' : (i % 2 === 0 ? DT.bg : DT.bgAlt));

                    const borderLeft = isActive
                      ? (isErr ? `3px solid ${DT.red}` : isWarn ? `3px solid ${DT.yellow}` : `3px solid ${DT.borderHL}`)
                      : '3px solid transparent';

                    return (
                      <div key={log._id || i} ref={isActive ? activeLogRef : null}
                        style={{ display: 'flex', alignItems: 'flex-start', minHeight: 22, borderLeft, background: rowBg, borderBottom: `1px solid ${DT.bgAlt}`, transition: 'background 0.35s ease', animation: isActive ? 'hlFlash 1.5s ease-out forwards' : 'none' }}>
                        {/* Timestamp */}
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: DT.textDim, padding: '4px 6px', flexShrink: 0, whiteSpace: 'nowrap', borderRight: `1px solid ${DT.border}`, minWidth: 60, textAlign: 'right' }}>
                          {formatTime(log.time)}
                        </span>
                        {/* Level */}
                        <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', padding: '4px 5px', flexShrink: 0, color: isErr ? DT.red : isWarn ? DT.yellow : DT.textDim, borderRight: `1px solid ${DT.border}`, minWidth: 40, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                          {isActive && <span style={{ width: 4, height: 4, borderRadius: '50%', background: DT.accent, display: 'inline-block', animation: 'pulseGlow 1.5s infinite', flexShrink: 0 }} />}
                          {log.type}
                        </span>
                        {/* Message */}
                        <div style={{ flex: 1, padding: '3px 8px', fontSize: 12, lineHeight: 1.6, minWidth: 0, color: isErr ? DT.red : isWarn ? DT.yellow : DT.text }}>
                          {renderConsoleLog(log)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ─── NETWORK PANEL ─── */}
          {activeTab === 'network' && (
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Request list */}
              <div style={{ display: 'flex', flexDirection: 'column', width: selectedNetworkReq ? 260 : '100%', flexShrink: 0, overflow: 'hidden', borderRight: selectedNetworkReq ? `1px solid ${DT.border}` : 'none' }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: DT.surface, borderBottom: `1px solid ${DT.border}`, flexShrink: 0 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: DT.textDim }} />
                    <input type="text" placeholder="Filter" value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}
                      style={{ width: '100%', height: 24, paddingLeft: 26, paddingRight: 8, background: DT.bg, border: `1px solid ${DT.border}`, borderRadius: 4, fontSize: 12, color: DT.text, outline: 'none', fontFamily: 'Inter,sans-serif' }} />
                  </div>
                  <div style={{ fontSize: 10, color: DT.textDim, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {activeNetIndex >= 0 ? activeNetIndex + 1 : 0} / {filteredNetwork.length}
                  </div>
                </div>

                {/* Column headers */}
                <div style={{ display: 'flex', alignItems: 'center', background: DT.surface, borderBottom: `1px solid ${DT.border}`, padding: '0 8px', height: 22, flexShrink: 0 }}>
                  {['Method', 'Status', 'Path', 'Time'].map(h => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, flex: h === 'Path' ? 1 : 'none', width: h === 'Method' ? 52 : h === 'Status' ? 46 : h === 'Time' ? 60 : 'auto', textAlign: h === 'Status' || h === 'Time' ? 'center' : 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {/* Request rows */}
                <div ref={networkContainerRef} style={{ flex: 1, overflowY: 'auto', background: DT.bg }}>
                  {filteredNetwork.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: DT.textDim, gap: 8 }}>
                      <Network size={20} style={{ opacity: 0.35 }} />
                      <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{networkFilter ? 'No matching requests.' : 'No network activity captured.'}</span>
                    </div>
                  ) : (
                    filteredNetwork.map((req, i) => {
                      const isOk = req.status >= 200 && req.status < 300;
                      const isNetErr = req.status === 0 || req.status >= 400;
                      const isSel = selectedNetworkReq?._id === req._id;
                      const isActive = i === activeNetIndex;
                      const rowBg = isSel ? DT.bgActive : isActive ? 'rgba(34,211,238,0.06)' : (i % 2 === 0 ? DT.bg : DT.bgAlt);

                      return (
                        <button key={req._id || i} ref={isActive ? activeNetRef : null} onClick={() => setSelectedNetworkReq(req)}
                          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', padding: '0 8px', height: 22, background: rowBg, border: 'none', borderBottom: `1px solid ${DT.bgAlt}`, borderLeft: isActive || isSel ? `3px solid ${DT.accent}` : '3px solid transparent', cursor: 'pointer', outline: 'none', transition: 'background 0.35s ease', animation: isActive && !isSel ? 'hlFlash 1.5s ease-out forwards' : 'none', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: methodColor(req.method), width: 52, flexShrink: 0, fontFamily: 'monospace' }}>{req.method}</span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, width: 46, flexShrink: 0, textAlign: 'center', color: isOk ? DT.green : isNetErr ? DT.red : DT.textSub }}>
                            {req.status === 0 ? 'FAIL' : req.status}
                          </span>
                          <span style={{ fontSize: 10, color: DT.textSub, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }} title={req.url}>
                            {req.url.replace(/^https?:\/\/[^/]+/, '') || req.url}
                          </span>
                          <span style={{ fontSize: 9, color: DT.textDim, fontFamily: 'monospace', width: 60, textAlign: 'right', flexShrink: 0 }}>{formatTime(req.time)}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Detail panel */}
              {selectedNetworkReq ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: DT.bg }}>
                  <div style={{ padding: '6px 12px', background: DT.surface, borderBottom: `1px solid ${DT.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: methodColor(selectedNetworkReq.method), flexShrink: 0 }}>{selectedNetworkReq.method}</span>
                      <span style={{ fontSize: 10, color: DT.textSub, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedNetworkReq.url}>
                        {selectedNetworkReq.url.replace(/^https?:\/\/[^/]+/, '') || selectedNetworkReq.url}
                      </span>
                    </div>
                    <button onClick={() => setSelectedNetworkReq(null)} style={{ background: DT.tag, border: 'none', borderRadius: 4, fontSize: 10, color: DT.textSub, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Inter,sans-serif', flexShrink: 0, marginLeft: 8 }}>✕</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Status', value: selectedNetworkReq.status || 'Failed', isStatus: true },
                        { label: 'Duration', value: selectedNetworkReq.duration ? `${selectedNetworkReq.duration}ms` : 'N/A' },
                        { label: 'At', value: formatTime(selectedNetworkReq.time) },
                      ].map(({ label, value, isStatus }) => (
                        <div key={label} style={{ background: DT.surface, border: `1px solid ${DT.border}`, borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 9, color: DT.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: isStatus ? (selectedNetworkReq.status >= 200 && selectedNetworkReq.status < 300 ? DT.green : DT.red) : DT.text }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {selectedNetworkReq.requestHeaders && Object.keys(selectedNetworkReq.requestHeaders).length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <FileCode size={10} style={{ color: DT.accent }} /> Request Headers
                        </div>
                        {renderJSONPayload(selectedNetworkReq.requestHeaders)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <FileCode size={10} style={{ color: DT.accent }} /> Request Body
                      </div>
                      {renderJSONPayload(selectedNetworkReq.requestBody)}
                    </div>
                    {selectedNetworkReq.responseHeaders && Object.keys(selectedNetworkReq.responseHeaders).length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Server size={10} style={{ color: DT.green }} /> Response Headers
                        </div>
                        {renderJSONPayload(selectedNetworkReq.responseHeaders)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Server size={10} style={{ color: DT.green }} /> Response Body
                      </div>
                      {renderJSONPayload(selectedNetworkReq.responseBody)}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.textDim, background: DT.bgAlt }}>
                  <div style={{ textAlign: 'center' }}>
                    <Info size={20} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                    <p style={{ fontSize: 12 }}>Click a request to inspect details</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── ACTIONS PANEL ─── */}
          {activeTab === 'actions' && (
            <div ref={actionsContainerRef} style={{ flex: 1, overflowY: 'auto', background: DT.bg }}>
              {actions.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: DT.textDim, gap: 8 }}>
                  <MousePointer2 size={20} style={{ opacity: 0.35 }} />
                  <span style={{ fontSize: 12, fontFamily: 'monospace' }}>No user interactions captured.</span>
                </div>
              ) : (
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {actions.map((act, i) => {
                    const isActive = i === activeActIndex;
                    return (
                      <div key={act._id || i} ref={isActive ? activeActRef : null}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.3s ease' }}>
                        {/* Timeline dot */}
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 10, background: isActive ? DT.accent : DT.textDim, border: `2px solid ${isActive ? DT.accent : DT.border}`, boxShadow: isActive ? `0 0 0 3px rgba(34,211,238,0.18)` : 'none', transition: 'all 0.3s ease' }} />
                        {/* Card — same darkness always, only border+shadow changes when active */}
                        <div style={{ flex: 1, background: DT.surface, border: isActive ? `1px solid rgba(34,211,238,0.25)` : `1px solid ${DT.border}`, borderRadius: 8, padding: '7px 11px', transition: 'all 0.3s ease', boxShadow: isActive ? `0 0 0 1px rgba(34,211,238,0.1), 0 2px 12px rgba(34,211,238,0.06)` : 'none', animation: isActive ? 'hlFlashAction 1.5s ease-out forwards' : 'none' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isActive && <span style={{ width: 4, height: 4, borderRadius: '50%', background: DT.accent, display: 'inline-block', animation: 'pulseGlow 1.5s infinite', flexShrink: 0 }} />}
                              <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? DT.accent : DT.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace' }}>
                                {act.type}
                              </span>
                            </div>
                            <span style={{ fontSize: 9, color: DT.textDim, fontFamily: 'monospace' }}>{formatTime(act.time)}</span>
                          </div>
                          <div style={{ fontSize: 11, color: DT.textSub }}>
                            <span style={{ color: DT.textDim }}>Target: </span>
                            <code style={{ fontSize: 10, color: DT.accent, background: 'rgba(34,211,238,0.08)', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                              {act.element}
                            </code>
                          </div>
                          {act.value && act.value !== '***' && (
                            <div style={{ fontSize: 10, color: DT.textDim, marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CornerDownRight size={8} />
                              Input: <span style={{ color: DT.cyan, fontStyle: 'italic' }}>"{act.value}"</span>
                            </div>
                          )}
                          <div style={{ fontSize: 9, color: DT.textDim, marginTop: 3, fontStyle: 'italic', opacity: 0.7 }}>{act.page || '/'}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SessionReplay;
