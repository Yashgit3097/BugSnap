import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Check, Laptop, Calendar, Share2, AlertTriangle } from 'lucide-react';

// Modular Subcomponents Imports
import VideoPlayer from '../components/session-replay/VideoPlayer';
import ConsolePanel from '../components/session-replay/ConsolePanel';
import NetworkPanel from '../components/session-replay/NetworkPanel';
import ActionsPanel from '../components/session-replay/ActionsPanel';

// ─── Design Tokens ────────────────────────────────────────────────────
const DT = {
  bg: '#000000',
  border: 'rgba(255, 255, 255, 0.06)',
  textDim: '#8e8e93',
  textSub: '#d4d4d8',
  text: '#f4f4f5',
  accent: '#22d3ee',
  green: '#4ade80',
  orange: '#fb923c',
  tag: 'rgba(255, 255, 255, 0.04)',
};

const SessionReplay = () => {
  const { publicId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  // Tabs states
  const [activeTab, setActiveTab] = useState('network'); // Default tab is Network
  const [selectedNetworkReq, setSelectedNetworkReq] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('headers'); // Headers, Payload, Preview, Response
  const [shareCopied, setShareCopied] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [duration, setDuration] = useState(0);

  const videoRef = useRef(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/sessions/public/${publicId}`)
      .then(r => {
        console.log('Fetched session data:', r.data);
        setData(r.data);
        if (r.data?.session?.duration) {
          setDuration(r.data.session.duration);
        }
      })
      .catch(e => console.error('Failed to fetch session', e))
      .finally(() => setLoading(false));
  }, [publicId]);

  const formatTime = (ms) => {
    if (!ms || isNaN(ms) || !isFinite(ms)) return "00:00.0";
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

  const session = data?.session;
  const logs = data?.logs || [];
  const networkRequests = data?.networkRequests || [];
  const actions = data?.actions || [];

  const filteredLogs = logs.filter(l => l.message.toLowerCase().includes(consoleFilter.toLowerCase()));
  const filteredNetwork = networkRequests.filter(r => r.url.toLowerCase().includes(networkFilter.toLowerCase()));

  // Timeline Synchronization index calculations
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

  // Loading page
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(6,182,212,0.1)', borderTopColor: '#22d3ee', animation: 'spin 0.85s linear infinite', margin: '0 auto 16px', boxShadow: '0 0 15px rgba(6,182,212,0.2)' }} />
          <p style={{ color: '#71717a', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>Initializing Dashboard…</p>
        </div>
      </div>
    );
  }

  // Not found page
  if (!data || !data.session) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ padding: 20, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 16, color: '#ef4444' }}><AlertTriangle size={32} /></div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f4f4f5', marginBottom: 8 }}>Session Not Found</h2>
          <p style={{ color: '#71717a', fontSize: 13 }}>This recording link is invalid or may have been deleted.</p>
        </div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#22d3ee', color: '#000', fontWeight: 700, fontSize: 12, padding: '10px 20px', borderRadius: 10, textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / 1000 / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#000000', color: DT.text, fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif", WebkitFontSmoothing: 'antialiased' }}>

      {/* Global CSS styles for split Network layouts and tabs */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        .cyber-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .cyber-scroll::-webkit-scrollbar-track { background: transparent; }
        .cyber-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 99px; }
        .cyber-scroll::-webkit-scrollbar-thumb:hover { background: rgba(34, 211, 238, 0.3); }

        .cyber-glass {
          background: rgba(10, 10, 15, 0.65);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.01);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .tab-btn {
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-btn:hover {
          color: ${DT.text} !important;
        }
        .tab-btn.active {
          color: ${DT.accent} !important;
        }
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 12px;
          right: 12px;
          height: 2px;
          background: ${DT.accent};
          border-radius: 99px;
          box-shadow: 0 0 8px ${DT.accent}, 0 0 15px ${DT.accent};
        }

        .metric-pill {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.25s;
        }
        .metric-pill:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .devtools-table-row {
          display: flex;
          align-items: center;
          height: 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          background: transparent;
          border-left: 2px solid transparent;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: ${DT.textSub};
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: background 0.15s ease;
        }
        .devtools-table-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .devtools-table-row.active {
          background: rgba(34, 211, 238, 0.05);
          border-left-color: ${DT.accent};
        }
        .devtools-table-row.selected {
          background: rgba(34, 211, 238, 0.1) !important;
          border-left-color: ${DT.accent} !important;
        }

        .devtools-section-header {
          width: 100%;
          text-align: left;
          background: rgba(255, 255, 255, 0.01);
          border: none;
          border-bottom: 1px solid ${DT.border};
          color: ${DT.textSub};
          font-weight: 700;
          font-size: 10px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          outline: none;
        }
        .devtools-section-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .devtools-headers-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 4px 12px;
          padding: 8px 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .devtools-header-row {
          display: contents;
        }
        .devtools-key {
          color: ${DT.textDim};
          font-weight: 500;
          text-align: left;
        }
        .devtools-val {
          color: ${DT.textSub};
          word-break: break-all;
          white-space: pre-wrap;
        }

        .devtools-subtab-btn {
          font-size: 10px;
          height: 24px;
          padding: 0 10px;
          border: none;
          background: transparent;
          color: ${DT.textDim};
          cursor: pointer;
          position: relative;
          font-family: inherit;
          font-weight: 500;
          outline: none;
          transition: all 0.15s;
        }
        .devtools-subtab-btn:hover {
          color: ${DT.text};
        }
        .devtools-subtab-btn.active {
          color: ${DT.accent};
        }
        .devtools-subtab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 4px;
          right: 4px;
          height: 1.5px;
          background: ${DT.accent};
          box-shadow: 0 0 6px ${DT.accent};
        }

        @keyframes hlFlash1 {
          0%   { background-color: rgba(34, 211, 238, 0.16); }
          100% { background-color: transparent; }
        }
        @keyframes hlFlash2 {
          0%   { background-color: rgba(34, 211, 238, 0.16); }
          100% { background-color: transparent; }
        }
        @keyframes hlFlashAction1 {
          0%   { background-color: rgba(251, 146, 60, 0.16); }
          100% { background-color: transparent; }
        }
        @keyframes hlFlashAction2 {
          0%   { background-color: rgba(251, 146, 60, 0.16); }
          100% { background-color: transparent; }
        }
      `}</style>

      {/* Background gradients */}
      <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', background: 'radial-gradient(circle at 50% -20%, rgba(34, 211, 238, 0.04) 0%, transparent 65%), #030305' }} />

      {/* ════ TOP NAVBAR ════ */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, flexShrink: 0, background: 'rgba(5, 5, 8, 0.5)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${DT.border}`, zIndex: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${DT.border}`, color: DT.textDim, textDecoration: 'none', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = DT.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = DT.textDim; }}>
            <ArrowLeft size={14} />
          </Link>
          <div style={{ width: 1, height: 16, background: DT.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(16,185,129,0.06))', border: '1px solid rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: DT.accent }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2.5" />
                <polygon points="11,10.5 14,12 11,13.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: 13, fontWeight: 700, color: DT.text, margin: 0, lineHeight: 1.2, letterSpacing: '-0.2px' }}>{session.title}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span style={{ fontSize: 10, color: DT.textDim, display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                  <Calendar size={9} />{new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                {session.browserInfo && (
                  <>
                    <span style={{ color: DT.border }}>·</span>
                    <span style={{ fontSize: 10, color: DT.textDim, display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                      <Laptop size={9} />{session.browserInfo.browser} ({session.browserInfo.os})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[
            { label: `${logs.length} logs`, color: DT.accent },
            { label: `${networkRequests.length} requests`, color: DT.green },
            { label: `${actions.length} actions`, color: DT.orange },
          ].map(({ label, color }) => (
            <div key={label} className="metric-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontSize: 10, color: DT.textSub, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
              {label}
            </div>
          ))}
          <div style={{ width: 1, height: 16, background: DT.border }} />
          <button onClick={handleShareClick} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, background: shareCopied ? 'rgba(16,185,129,0.15)' : DT.accent, border: shareCopied ? '1px solid rgba(16,185,129,0.3)' : 'none', color: shareCopied ? DT.green : '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none', transition: 'all 0.25s', fontFamily: 'inherit', boxShadow: shareCopied ? 'none' : `0 0 12px rgba(34,211,238,0.3)` }}
            onMouseEnter={e => { if (!shareCopied) { e.currentTarget.style.boxShadow = `0 0 20px rgba(34,211,238,0.5)`; e.currentTarget.style.background = '#67e8f9'; } }}
            onMouseLeave={e => { if (!shareCopied) { e.currentTarget.style.boxShadow = `0 0 12px rgba(34,211,238,0.3)`; e.currentTarget.style.background = DT.accent; } }}>
            {shareCopied ? <><Check size={13} /> Copied URL!</> : <><Share2 size={13} /> Share</>}
          </button>
        </div>
      </header>

      {/* ════ 2-COLUMN LAYOUT SHELL (45% / 55% SPLIT) ════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: 16, gap: 16 }}>

        {/* COLUMN 1: VIDEO PLAYER PANEL */}
        <VideoPlayer
          session={session}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          duration={duration}
          setDuration={setDuration}
          videoRef={videoRef}
          logs={logs}
          actions={actions}
        />

        {/* COLUMN 2: DEVTOOLS TABS PANEL */}
        <div className="cyber-glass" style={{ width: '55%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top Panel Tab switcher */}
          <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', background: 'rgba(5, 5, 8, 0.4)', borderBottom: `1px solid ${DT.border}`, flexShrink: 0, paddingLeft: 4 }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              {[
                { id: 'console', label: 'Console', count: logs.length },
                { id: 'network', label: 'Network', count: networkRequests.length },
                { id: 'actions', label: 'Actions', count: actions.length },
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); }}
                    className={`tab-btn ${isActive ? 'active' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '0 16px',
                      height: 38,
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? DT.accent : DT.textDim,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  >
                    {tab.label}
                    <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: isActive ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.03)', color: isActive ? DT.accent : DT.textDim, border: `1px solid ${isActive ? 'rgba(34,211,238,0.15)' : 'transparent'}` }}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 14, fontSize: 10, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace", userSelect: 'none' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: DT.accent, display: 'inline-block', boxShadow: `0 0 6px ${DT.accent}` }} />
              DevTools active
            </div>
          </div>

          {/* Conditional Sub-panels */}
          {activeTab === 'console' && (
            <ConsolePanel
              logs={logs}
              currentTime={currentTime}
              consoleFilter={consoleFilter}
              setConsoleFilter={setConsoleFilter}
              activeLogIndex={activeLogIndex}
            />
          )}

          {activeTab === 'network' && (
            <NetworkPanel
              networkRequests={networkRequests}
              currentTime={currentTime}
              networkFilter={networkFilter}
              setNetworkFilter={setNetworkFilter}
              selectedNetworkReq={selectedNetworkReq}
              setSelectedNetworkReq={setSelectedNetworkReq}
              activeSubTab={activeSubTab}
              setActiveSubTab={setActiveSubTab}
              activeNetIndex={activeNetIndex}
              duration={duration}
              progressPercent={progressPercent}
            />
          )}

          {activeTab === 'actions' && (
            <ActionsPanel
              actions={actions}
              currentTime={currentTime}
              activeActIndex={activeActIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionReplay;
