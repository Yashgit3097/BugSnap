import { useState, useEffect, useRef } from 'react';
import { Search, Terminal } from 'lucide-react';

const DT = {
  accent:   '#22d3ee',
  accentHL: 'rgba(34, 211, 238, 0.08)',
  border:   'rgba(255, 255, 255, 0.06)',
  textDim:  '#8e8e93',
  textSub:  '#d4d4d8',
  text:     '#f4f4f5',
  red:      '#f87171',
  yellow:   '#fbbf24',
  purple:   '#c084fc',
  cyan:     '#67e8f9',
};

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
          <pre style={{ fontSize: 10, color: 'rgba(248,113,113,0.5)', marginTop: 4, paddingLeft: 12, borderLeft: `2px solid ${DT.red}`, overflow: 'auto', userSelect: 'text' }}>
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

const ConsolePanel = ({ logs, currentTime, consoleFilter, setConsoleFilter, activeLogIndex }) => {
  const consoleContainerRef = useRef(null);
  const activeLogRef = useRef(null);

  const formatTime = (ms) => {
    if (!ms || isNaN(ms) || !isFinite(ms)) return "00:00.0";
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const t = Math.floor((ms % 1000) / 100);
    return `${m}:${sec}.${t}`;
  };

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(consoleFilter.toLowerCase()));

  // Auto-scroll inside component
  useEffect(() => {
    if (activeLogRef.current) {
      activeLogRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeLogIndex]);

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
    } catch { }
    return <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', userSelect: 'text', color: DT.text }}>{log.message}</div>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(5, 5, 8, 0.2)', borderBottom: `1px solid ${DT.border}`, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: DT.textDim }} />
          <input 
            type="text" 
            placeholder="Filter console..." 
            value={consoleFilter} 
            onChange={e => setConsoleFilter(e.target.value)}
            style={{ width: '100%', height: 24, paddingLeft: 26, paddingRight: 8, background: 'rgba(0, 0, 0, 0.3)', border: `1px solid ${DT.border}`, borderRadius: 6, fontSize: 11, color: DT.text, outline: 'none', fontFamily: 'inherit' }} 
          />
        </div>
        <div style={{ fontSize: 9, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
          {activeLogIndex >= 0 ? activeLogIndex + 1 : 0} / {filteredLogs.length}
        </div>
      </div>

      {/* Logs list */}
      <div ref={consoleContainerRef} className="cyber-scroll" style={{ flex: 1, overflowY: 'auto', background: 'transparent' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: DT.textDim, gap: 8 }}>
            <Terminal size={18} style={{ opacity: 0.3 }} />
            <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{consoleFilter ? 'No matching logs.' : 'No console messages captured.'}</span>
          </div>
        ) : (
          filteredLogs.map((log, i) => {
            const isErr = log.type === 'error';
            const isWarn = log.type === 'warn';
            const isActive = i === activeLogIndex;

            const rowBg = isActive
              ? (isErr ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(245,158,11,0.06)' : DT.accentHL)
              : (isErr ? 'rgba(239,68,68,0.03)' : isWarn ? 'rgba(245,158,11,0.02)' : 'transparent');

            const borderLeft = isActive
              ? (isErr ? `2px solid ${DT.red}` : isWarn ? `2px solid ${DT.yellow}` : `2px solid ${DT.accent}`)
              : '2px solid transparent';

            return (
              <div 
                key={log._id || i} 
                ref={isActive ? activeLogRef : null}
                style={{ display: 'flex', alignItems: 'flex-start', minHeight: 22, borderLeft, background: rowBg, borderBottom: `1px solid rgba(255,255,255,0.02)`, transition: 'background 0.35s ease', animation: isActive ? `hlFlash1 1.5s ease-out forwards` : 'none' }}
              >
                <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: DT.textDim, padding: '4px 6px', flexShrink: 0, whiteSpace: 'nowrap', borderRight: `1px solid ${DT.border}`, minWidth: 54, textAlign: 'right' }}>
                  {formatTime(log.time)}
                </span>
                <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase', padding: '4.5px 5px', flexShrink: 0, color: isErr ? DT.red : isWarn ? DT.yellow : DT.textDim, borderRight: `1px solid ${DT.border}`, minWidth: 42, textAlign: 'center', display: 'flex', alignItems: 'center', justify: 'center', gap: 2 }}>
                  {log.type}
                </span>
                <div style={{ flex: 1, padding: '3px 8px', fontSize: 11, lineHeight: 1.5, minWidth: 0, color: isErr ? DT.red : isWarn ? DT.yellow : DT.textSub, fontFamily: "'JetBrains Mono', monospace" }}>
                  {renderConsoleLog(log)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
