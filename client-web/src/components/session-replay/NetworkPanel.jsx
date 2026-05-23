import { useState, useEffect, useRef } from 'react';
import { Search, Network, FileCode, Server } from 'lucide-react';

const DT = {
  accent:   '#22d3ee',
  border:   'rgba(255, 255, 255, 0.06)',
  textDim:  '#8e8e93',
  textSub:  '#d4d4d8',
  text:     '#f4f4f5',
  green:    '#4ade80',
  red:      '#f87171',
  orange:   '#fb923c',
  purple:   '#c084fc',
};

const JsonNode = ({ value, keyName = null, depth = 0, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded || depth === 0);
  const toggle = (e) => { e.stopPropagation(); setExpanded(x => !x); };
  const indent = { paddingLeft: depth === 0 ? 0 : 16, borderLeft: depth > 0 ? `1px solid rgba(255,255,255,0.05)` : 'none', marginLeft: depth > 0 ? 8 : 0 };

  const KeyLabel = () => keyName !== null ? (
    <span>
      <span style={{ color: DT.purple, fontWeight: 500 }}>"{keyName}"</span>
      <span style={{ color: DT.textDim }}>: </span>
    </span>
  ) : null;

  if (value === null)      return <div style={{ fontSize: 11, lineHeight: 1.6 }}><KeyLabel /><span style={{ color: DT.textDim, fontStyle: 'italic' }}>null</span></div>;
  if (value === undefined) return <div style={{ fontSize: 11, lineHeight: 1.6 }}><KeyLabel /><span style={{ color: DT.textDim, fontStyle: 'italic' }}>undefined</span></div>;
  if (typeof value === 'boolean') return <div style={{ fontSize: 11, lineHeight: 1.6 }}><KeyLabel /><span style={{ color: DT.orange, fontWeight: 600 }}>{String(value)}</span></div>;
  if (typeof value === 'number')  return <div style={{ fontSize: 11, lineHeight: 1.6 }}><KeyLabel /><span style={{ color: '#60a5fa' }}>{String(value)}</span></div>;
  if (typeof value === 'string')  return (
    <div style={{ fontSize: 11, lineHeight: 1.6, wordBreak: 'break-all' }}>
      <KeyLabel /><span style={{ color: DT.green }}>"</span><span style={{ color: DT.green }}>{value}</span><span style={{ color: DT.green }}>"</span>
    </div>
  );

  if (Array.isArray(value)) {
    const len = value.length;
    return (
      <div style={depth > 0 ? indent : {}}>
        <div onClick={toggle} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: 1.6 }}>
          <span style={{ fontSize: 8, color: DT.textDim, width: 10, display: 'inline-block', textAlign: 'center', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
          <KeyLabel />
          <span style={{ color: DT.textDim }}>[</span>
          {!expanded && (
            <span style={{ color: DT.textDim, fontStyle: 'italic', fontSize: 10 }}>
              {len} {len === 1 ? 'item' : 'items'}
            </span>
          )}
          {!expanded && <span style={{ color: DT.textDim }}>]</span>}
        </div>
        {expanded && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: 4 }}>
            {value.map((item, i) => (
              <JsonNode key={i} keyName={i} value={item} depth={depth + 1} defaultExpanded={false} />
            ))}
            <div style={{ fontSize: 11, lineHeight: 1.6, color: DT.textDim }}>]</div>
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return (
      <div style={depth > 0 ? indent : {}}>
        <div onClick={toggle} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, lineHeight: 1.6 }}>
          <span style={{ fontSize: 8, color: DT.textDim, width: 10, display: 'inline-block', textAlign: 'center', flexShrink: 0 }}>{expanded ? '▼' : '▶'}</span>
          <KeyLabel />
          <span style={{ color: DT.textDim }}>{'{'}</span>
          {!expanded && (
            <span style={{ color: DT.textDim, fontStyle: 'italic', fontSize: 10 }}>
              {keys.length} {keys.length === 1 ? 'key' : 'keys'}
            </span>
          )}
          {!expanded && <span style={{ color: DT.textDim }}>{'}'}</span>}
        </div>
        {expanded && (
          <div style={{ paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,0.05)', marginLeft: 4 }}>
            {keys.map(k => (
              <JsonNode key={k} keyName={k} value={value[k]} depth={depth + 1} defaultExpanded={false} />
            ))}
            <div style={{ fontSize: 11, lineHeight: 1.6, color: DT.textDim }}>{'}'}</div>
          </div>
        )}
      </div>
    );
  }

  return <div style={{ fontSize: 11, lineHeight: 1.6, color: DT.text }}><KeyLabel />{String(value)}</div>;
};

const NetworkPanel = ({ 
  networkRequests, 
  currentTime, 
  networkFilter, 
  setNetworkFilter, 
  selectedNetworkReq, 
  setSelectedNetworkReq, 
  activeSubTab, 
  setActiveSubTab, 
  activeNetIndex,
  duration,
  progressPercent
}) => {
  const networkContainerRef = useRef(null);
  
  // Headers collapsible states
  const [headersCollapsed, setHeadersCollapsed] = useState({
    general: false,
    response: false,
    request: false
  });

  const formatTime = (ms) => {
    if (!ms || isNaN(ms) || !isFinite(ms)) return "00:00.0";
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const t = Math.floor((ms % 1000) / 100);
    return `${m}:${sec}.${t}`;
  };

  const methodColor = (m) => {
    if (m === 'POST') return DT.green;
    if (m === 'DELETE') return DT.red;
    if (m === 'PUT' || m === 'PATCH') return DT.orange;
    return DT.accent;
  };

  const getRequestName = (url) => {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const query = parsedUrl.search;
      const lastSegment = pathname.substring(pathname.lastIndexOf('/') + 1);
      
      if (!lastSegment && query) {
        return query.substring(0, 24);
      }
      return (lastSegment ? lastSegment : parsedUrl.host) + (query ? query.substring(0, 12) + '...' : '');
    } catch {
      const queryIdx = url.indexOf('?');
      const cleanPath = queryIdx !== -1 ? url.substring(0, queryIdx) : url;
      const query = queryIdx !== -1 ? url.substring(queryIdx) : '';
      const lastSegment = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
      return (lastSegment ? lastSegment : cleanPath) + (query ? query.substring(0, 12) + '...' : '');
    }
  };

  const filteredNetwork = networkRequests.filter(r => r.url.toLowerCase().includes(networkFilter.toLowerCase()));

  // Auto-scroll on select
  useEffect(() => {
    if (selectedNetworkReq && networkContainerRef.current) {
      // Find element and scroll
    }
  }, [selectedNetworkReq]);

  const renderDetailsBody = () => {
    if (!selectedNetworkReq) return null;

    if (activeSubTab === 'payload') {
      const queryParams = (() => {
        try {
          const parsed = new URL(selectedNetworkReq.url);
          const params = {};
          parsed.searchParams.forEach((v, k) => { params[k] = v; });
          return params;
        } catch {
          return null;
        }
      })();

      let bodyObj = null;
      try {
        bodyObj = JSON.parse(selectedNetworkReq.requestBody);
      } catch {
        bodyObj = selectedNetworkReq.requestBody;
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 14px' }}>
          {queryParams && Object.keys(queryParams).length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', marginBottom: 6 }}>
                Query String Parameters
              </div>
              <div className="devtools-headers-grid">
                {Object.entries(queryParams).map(([k, v]) => (
                  <div key={k} className="devtools-header-row">
                    <span className="devtools-key">{k}:</span>
                    <span className="devtools-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', marginBottom: 6 }}>
              Request Payload
            </div>
            {bodyObj ? (
              typeof bodyObj === 'object' ? (
                <div style={{ background: '#050508', border: `1px solid ${DT.border}`, borderRadius: 6, padding: '8px 10px' }}>
                  <JsonNode value={bodyObj} depth={0} defaultExpanded={true} />
                </div>
              ) : (
                <pre style={{ margin: 0, fontSize: 11, color: DT.textSub, background: '#050508', padding: '8px 10px', border: `1px solid ${DT.border}`, borderRadius: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {bodyObj}
                </pre>
              )
            ) : (
              <span style={{ fontSize: 11, color: DT.textDim, fontStyle: 'italic' }}>No payload data</span>
            )}
          </div>
        </div>
      );
    }

    if (activeSubTab === 'preview') {
      let responseObj = null;
      try {
        responseObj = typeof selectedNetworkReq.responseBody === 'string' 
          ? JSON.parse(selectedNetworkReq.responseBody) 
          : selectedNetworkReq.responseBody;
      } catch {
        responseObj = null;
      }

      return (
        <div className="cyber-scroll" style={{ padding: '12px 14px', overflow: 'auto', maxHeight: '100%' }}>
          {responseObj ? (
            <JsonNode value={responseObj} depth={0} defaultExpanded={true} />
          ) : selectedNetworkReq.responseBody ? (
            <pre style={{ margin: 0, fontSize: 11, color: DT.textSub, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {selectedNetworkReq.responseBody}
            </pre>
          ) : (
            <span style={{ fontSize: 11, color: DT.textDim, fontStyle: 'italic' }}>No preview available</span>
          )}
        </div>
      );
    }

    if (activeSubTab === 'response') {
      return (
        <div className="cyber-scroll" style={{ padding: '12px 14px', overflow: 'auto', height: '100%' }}>
          {selectedNetworkReq.responseBody ? (
            <pre style={{ margin: 0, fontSize: 11, color: DT.textSub, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
              {typeof selectedNetworkReq.responseBody === 'object' 
                ? JSON.stringify(selectedNetworkReq.responseBody, null, 2) 
                : selectedNetworkReq.responseBody}
            </pre>
          ) : (
            <span style={{ fontSize: 11, color: DT.textDim, fontStyle: 'italic' }}>No response payload</span>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {/* General */}
        <div>
          <button 
            onClick={() => setHeadersCollapsed(prev => ({ ...prev, general: !prev.general }))}
            className="devtools-section-header"
          >
            <span style={{ fontSize: 9, color: DT.textDim }}>{headersCollapsed.general ? '▶' : '▼'}</span>
            General
          </button>
          {!headersCollapsed.general && (
            <div className="devtools-headers-grid">
              <div className="devtools-header-row">
                <span className="devtools-key">Request URL:</span>
                <span className="devtools-val" style={{ wordBreak: 'break-all' }}>{selectedNetworkReq.url}</span>
              </div>
              <div className="devtools-header-row">
                <span className="devtools-key">Request Method:</span>
                <span className="devtools-val" style={{ color: methodColor(selectedNetworkReq.method), fontWeight: 700 }}>{selectedNetworkReq.method}</span>
              </div>
              <div className="devtools-header-row">
                <span className="devtools-key">Status Code:</span>
                <span className="devtools-val" style={{ color: selectedNetworkReq.status >= 200 && selectedNetworkReq.status < 300 ? DT.green : DT.red, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: selectedNetworkReq.status >= 200 && selectedNetworkReq.status < 300 ? DT.green : DT.red, display: 'inline-block' }} />
                  {selectedNetworkReq.status === 0 ? 'Failed' : `${selectedNetworkReq.status} ${selectedNetworkReq.status === 200 ? 'OK' : ''}`}
                </span>
              </div>
              <div className="devtools-header-row">
                <span className="devtools-key">Remote Address:</span>
                <span className="devtools-val">127.0.0.1:5000</span>
              </div>
              <div className="devtools-header-row">
                <span className="devtools-key">Referrer Policy:</span>
                <span className="devtools-val">strict-origin-when-cross-origin</span>
              </div>
            </div>
          )}
        </div>

        {/* Response Headers */}
        {selectedNetworkReq.responseHeaders && Object.keys(selectedNetworkReq.responseHeaders).length > 0 && (
          <div>
            <button 
              onClick={() => setHeadersCollapsed(prev => ({ ...prev, response: !prev.response }))}
              className="devtools-section-header"
            >
              <span style={{ fontSize: 9, color: DT.textDim }}>{headersCollapsed.response ? '▶' : '▼'}</span>
              Response Headers
            </button>
            {!headersCollapsed.response && (
              <div className="devtools-headers-grid">
                {Object.entries(selectedNetworkReq.responseHeaders).map(([k, v]) => (
                  <div key={k} className="devtools-header-row">
                    <span className="devtools-key">{k}:</span>
                    <span className="devtools-val">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Request Headers */}
        {selectedNetworkReq.requestHeaders && Object.keys(selectedNetworkReq.requestHeaders).length > 0 && (
          <div>
            <button 
              onClick={() => setHeadersCollapsed(prev => ({ ...prev, request: !prev.request }))}
              className="devtools-section-header"
            >
              <span style={{ fontSize: 9, color: DT.textDim }}>{headersCollapsed.request ? '▶' : '▼'}</span>
              Request Headers
            </button>
            {!headersCollapsed.request && (
              <div className="devtools-headers-grid">
                {Object.entries(selectedNetworkReq.requestHeaders).map(([k, v]) => (
                  <div key={k} className="devtools-header-row">
                    <span className="devtools-key">{k}:</span>
                    <span className="devtools-val">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const animSuffix = (currentTime % 2000 > 1000) ? '2' : '1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      
      {/* Chrome DevTools secondary toolbar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${DT.border}`, flexShrink: 0, flexWrap: 'wrap' }}>
        <button 
          onClick={() => setSelectedNetworkReq(null)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: DT.textDim, borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = DT.text}
          onMouseLeave={e => e.currentTarget.style.color = DT.textDim}
          title="Clear selected API inspection"
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 8, display: 'inline-block' }} />
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>
        </button>
        
        <div style={{ width: 1, height: 14, background: DT.border }} />

        <div style={{ position: 'relative', width: 140 }}>
          <Search size={10} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: DT.textDim }} />
          <input 
            type="text" 
            placeholder="Filter" 
            value={networkFilter} 
            onChange={e => setNetworkFilter(e.target.value)}
            style={{ width: '100%', height: 20, paddingLeft: 20, paddingRight: 6, background: '#050507', border: `1px solid ${DT.border}`, borderRadius: 4, fontSize: 10, color: DT.text, outline: 'none' }} 
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: DT.textDim, marginLeft: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" defaultChecked style={{ accentColor: DT.accent, cursor: 'pointer' }} />
            Preserve log
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" style={{ accentColor: DT.accent, cursor: 'pointer' }} />
            Disable cache
          </label>
        </div>

        <div style={{ width: 1, height: 14, background: DT.border, marginLeft: 4 }} />

        <select 
          style={{ background: '#050507', border: `1px solid ${DT.border}`, borderRadius: 4, color: DT.textSub, fontSize: 10, padding: '1px 4px', cursor: 'pointer', outline: 'none' }}
          defaultValue="none"
        >
          <option value="none">No throttling</option>
          <option value="3g">Slow 3G</option>
          <option value="4g">Fast 3G</option>
          <option value="offline">Offline</option>
        </select>
      </div>

      {/* DevTools timeline visualizer row */}
      <div style={{ height: 24, background: '#050508', borderBottom: `1px solid ${DT.border}`, position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ display: 'flex', width: '100%', justify: 'space-between', padding: '0 12px', fontSize: 8, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace', pointerEvents: 'none' }}>
          <span>0 ms</span>
          <span>5,000 ms</span>
          <span>10,000 ms</span>
          <span>15,000 ms</span>
          <span>20,000 ms</span>
          <span>25,000 ms</span>
          <span>30,000 ms</span>
          <span>35,000 ms</span>
        </div>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${progressPercent}%`, borderRight: `1px solid ${DT.accent}`, background: 'rgba(34, 211, 238, 0.02)', pointerEvents: 'none' }} />
        {filteredNetwork.map((req, idx) => {
          const reqPercent = duration > 0 ? (req.time / 1000 / duration) * 100 : 0;
          const isPast = req.time <= currentTime;
          return (
            <div 
              key={idx}
              style={{ 
                position: 'absolute', 
                left: `${reqPercent}%`, 
                width: 4, 
                height: 4, 
                borderRadius: '50%', 
                background: isPast ? DT.green : 'rgba(255,255,255,0.15)', 
                top: '50%', 
                transform: 'translate(-50%, -50%)', 
                boxShadow: isPast ? `0 0 6px ${DT.green}` : 'none' 
              }} 
            />
          );
        })}
      </div>

      {/* Split Screen Layout or Full Table */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Side Requests Name column */}
        <div style={{ 
          width: selectedNetworkReq ? 180 : '100%', 
          flexShrink: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          borderRight: selectedNetworkReq ? `1px solid ${DT.border}` : 'none', 
          overflow: 'hidden' 
        }}>
          {/* Table headers column list */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${DT.border}`, padding: '0 8px', height: 20, flexShrink: 0 }}>
            {selectedNetworkReq ? (
              <span style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</span>
            ) : (
              <>
                <span style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, width: 200, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, width: 64, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Method</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, width: 64, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Status</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, flex: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Path</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: DT.textDim, width: 70, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Time</span>
              </>
            )}
          </div>

          {/* List Rows */}
          <div ref={networkContainerRef} className="cyber-scroll" style={{ flex: 1, overflowY: 'auto', background: 'transparent' }}>
            {filteredNetwork.map((req, i) => {
              const isOk = req.status >= 200 && req.status < 300;
              const isNetErr = req.status === 0 || req.status >= 400;
              const isSel = selectedNetworkReq?._id === req._id;
              const isActive = req.time <= currentTime;

              const rowClass = `devtools-table-row ${isSel ? 'selected' : ''} ${isActive ? 'active' : ''}`;

              return (
                <button 
                  key={req._id || i} 
                  onClick={() => setSelectedNetworkReq(req)}
                  className={rowClass}
                  style={{ 
                    padding: '0 8px',
                    animation: isActive && isSel ? 'none' : (req.time <= currentTime && req.time > currentTime - 2000 ? `hlFlash${animSuffix} 1.5s ease-out forwards` : 'none')
                  }}
                >
                  {selectedNetworkReq ? (
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', display: 'block', color: isNetErr ? DT.red : (isSel ? DT.accent : DT.textSub) }}>
                      {getRequestName(req.url)}
                    </span>
                  ) : (
                    <>
                      <span style={{ width: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', color: isNetErr ? DT.red : DT.textSub }}>
                        {getRequestName(req.url)}
                      </span>
                      <span style={{ width: 64, color: methodColor(req.method), fontWeight: 700 }}>{req.method}</span>
                      <span style={{ width: 64, textAlign: 'center', color: isOk ? DT.green : isNetErr ? DT.red : DT.textDim, fontWeight: 600 }}>
                        {req.status === 0 ? 'FAIL' : req.status}
                      </span>
                      <span style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', opacity: 0.6 }}>
                        {req.url.replace(/^https?:\/\/[^/]+/, '') || req.url}
                      </span>
                      <span style={{ width: 70, textAlign: 'right', color: DT.textDim }}>{formatTime(req.time)}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right details inspection pane */}
        {selectedNetworkReq && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#020204', overflow: 'hidden' }}>
            {/* Sub-tabs header */}
            <div style={{ display: 'flex', alignItems: 'center', height: 25, background: 'rgba(255,255,255,0.01)', borderBottom: `1px solid ${DT.border}`, flexShrink: 0 }}>
              <button 
                onClick={() => setSelectedNetworkReq(null)}
                style={{ width: 25, height: '100%', background: 'transparent', border: 'none', borderRight: `1px solid ${DT.border}`, color: DT.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', fontSize: 11, outline: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = DT.red}
                onMouseLeave={e => e.currentTarget.style.color = DT.textDim}
              >
                ✕
              </button>

              {[
                { id: 'headers', label: 'Headers' },
                { id: 'payload', label: 'Payload' },
                { id: 'preview', label: 'Preview' },
                { id: 'response', label: 'Response' },
              ].map(st => {
                const isActive = activeSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveSubTab(st.id)}
                    className={`devtools-subtab-btn ${isActive ? 'active' : ''}`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>

            {/* Subtab body */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {renderDetailsBody()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkPanel;
