import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Video, Clock, Calendar, Trash2, Search,
  Key, Copy, Check, Laptop, Activity, FileText, X, Play, Wifi, WifiOff, Zap, RefreshCw
} from 'lucide-react';
import { io } from 'socket.io-client';

const DASH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800;14..32,900&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { background: #09090b; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(34,211,238,0.25); }

  @keyframes pulse-dot {
    0%,100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.5); }
    50%      { box-shadow: 0 0 0 6px rgba(248,113,113,0); }
  }
  @keyframes shimmer-dash {
    from { background-position: -600px 0; }
    to   { background-position: 600px 0; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cursor-blink {
    0%,100% { opacity: 1; } 50% { opacity: 0; }
  }

  .dash-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
  .dash-card:hover {
    border-color: rgba(34,211,238,0.2) !important;
    box-shadow: 0 0 0 1px rgba(34,211,238,0.06), 0 12px 32px -8px rgba(0,0,0,0.6) !important;
    transform: translateY(-2px);
  }
  .dash-card:hover .card-play-overlay { opacity: 1 !important; }
  .dash-card:hover .card-thumb-icon { color: #22d3ee !important; transform: scale(1.08); }

  .filter-tab { transition: all 0.15s; }
  .filter-tab:hover { color: #f4f4f5 !important; }

  .delete-btn { transition: all 0.15s; }
  .delete-btn:hover { background: rgba(248,113,113,0.1) !important; color: #f87171 !important; }

  .stat-card { transition: border-color 0.2s; }
  .stat-card:hover { border-color: rgba(34,211,238,0.15) !important; }

  .nav-btn { transition: all 0.15s; }
  .nav-btn:hover { background: rgba(255,255,255,0.07) !important; color: #f4f4f5 !important; }
`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/sessions/my')
      .then(({ data }) => setSessions(data))
      .catch(e => console.error('Failed to fetch sessions', e))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    const socket = io('http://localhost:5000', {
      query: { token: user.token },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });
    socket.on('connect', () => setWsConnected(true));
    socket.on('disconnect', () => setWsConnected(false));
    socket.on('connect_error', () => setWsConnected(false));
    socket.on('SESSION_CREATED', p => setSessions(prev => prev.some(s => s._id === p._id) ? prev : [p, ...prev]));
    socket.on('SESSION_COMPLETED', p => setSessions(prev => prev.map(s => s._id === p._id ? { ...s, ...p } : s)));
    socket.on('SESSION_DELETED', p => setSessions(prev => prev.filter(s => s._id !== p.sessionId)));
    return () => socket.disconnect();
  }, [user]);

  const handleDelete = async (e, sessionId) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Permanently delete this session and all its logs?')) return;
    setDeletingId(sessionId);
    try {
      await axios.delete(`http://localhost:5000/api/sessions/${sessionId}`);
      setSessions(s => s.filter(x => x._id !== sessionId));
    } catch { alert('Failed to delete session. Please try again.'); }
    finally { setDeletingId(null); }
  };

  const handleCopyToken = () => {
    if (!user?.token) return;
    navigator.clipboard.writeText(user.token).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  const formatDuration = (s) => {
    if (!s) return '—';
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'recording').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  // ── colour helpers
  const T = {
    bg: '#09090b',
    surface: '#111113',
    surface2: '#161618',
    border: 'rgba(255,255,255,0.07)',
    cyan: '#22d3ee',
    amber: '#fbbf24',
    green: '#4ade80',
    rose: '#f87171',
    text: '#f4f4f5',
    sub: '#a1a1aa',
    muted: '#52525b',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'Inter', system-ui, sans-serif", WebkitFontSmoothing: 'antialiased', color: T.text }}>
      <style>{DASH_STYLES}</style>

      {/* ════ NAVBAR ════ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(18px)', borderBottom: `1px solid ${T.border}`, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(251,191,36,0.1))', border: '1px solid rgba(34,211,238,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.cyan }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
              <polygon points="11,10.5 14,12 11,13.5" fill="currentColor" />
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.4px', color: T.text }}>
            Debug<span style={{ background: 'linear-gradient(135deg, #22d3ee, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Snap</span>
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Live sync indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: T.surface, border: `1px solid ${wsConnected ? 'rgba(74,222,128,0.2)' : T.border}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: wsConnected ? T.green : T.muted }}>
            {wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
            <span>{wsConnected ? 'Live Sync' : 'Offline'}</span>
          </div>

          <div style={{ width: 1, height: 18, background: T.border }} />

          <button onClick={() => setShowTokenModal(true)} className="nav-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', color: T.cyan, fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            <Key size={12} /><span>Extension Token</span>
          </button>

          <span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>
            Hi, <span style={{ color: T.sub, fontWeight: 700 }}>{user?.username}</span>
          </span>

          <button onClick={logout} className="nav-btn" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            <LogOut size={12} /><span>Logout</span>
          </button>
        </div>
      </nav>

      {/* ════ PAGE CONTENT ════ */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Reports', value: totalSessions, icon: FileText, color: T.cyan, glow: 'rgba(34,211,238,0.1)' },
            { label: 'Live Streams', value: activeSessions, icon: Activity, color: T.rose, glow: 'rgba(248,113,113,0.1)' },
            { label: 'Completed Runs', value: completedSessions, icon: Video, color: T.green, glow: 'rgba(74,222,128,0.1)' },
          ].map(({ label, value, icon: Icon, color, glow }) => (
            <div key={label} className="stat-card" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0, lineHeight: 1, letterSpacing: '-1px' }}>{value}</h3>
                  {label === 'Live Streams' && value > 0 && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.rose, display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
                  )}
                </div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: glow, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                <Icon size={18} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '10px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted }} />
            <input
              type="text"
              placeholder="Search by report title…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, color: T.text, outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = 'rgba(34,211,238,0.4)'}
              onBlur={e => e.target.style.borderColor = T.border}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ id: 'all', label: 'All' }, { id: 'recording', label: 'Live' }, { id: 'completed', label: 'Done' }].map(tab => (
              <button key={tab.id} className="filter-tab" onClick={() => setStatusFilter(tab.id)}
                style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', background: statusFilter === tab.id ? T.surface : 'transparent', color: statusFilter === tab.id ? T.cyan : T.muted, boxShadow: statusFilter === tab.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none', transition: 'all 0.15s' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Session Grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', height: 240 }}>
                <div style={{ height: 130, background: `linear-gradient(90deg, ${T.surface} 25%, #1a1a1e 50%, ${T.surface} 75%)`, backgroundSize: '600px 100%', animation: 'shimmer-dash 1.4s infinite' }} />
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, borderRadius: 6, background: `linear-gradient(90deg, ${T.surface} 25%, #1a1a1e 50%, ${T.surface} 75%)`, backgroundSize: '600px 100%', animation: 'shimmer-dash 1.4s infinite', width: '70%' }} />
                  <div style={{ height: 10, borderRadius: 6, background: `linear-gradient(90deg, ${T.surface} 25%, #1a1a1e 50%, ${T.surface} 75%)`, backgroundSize: '600px 100%', animation: 'shimmer-dash 1.4s infinite', width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, maxWidth: 420, margin: '0 auto' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.cyan, margin: '0 auto 16px' }}>
              <Video size={22} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>No reports found</h3>
            <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, margin: '0 0 20px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
              Start recording a session using the Chrome extension to see bug reports appear here.
            </p>
            <button onClick={() => setShowTokenModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: T.cyan, border: 'none', color: '#09090b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Zap size={12} /> Connect Extension
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
            {filteredSessions.map(session => (
              <Link to={`/session/${session.publicId}`} key={session._id} style={{ textDecoration: 'none' }}>
                <div className="dash-card" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', height: 250, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>

                  {/* Thumbnail */}
                  <div style={{ height: 130, background: T.bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
                    {session.status === 'recording' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: T.rose, animation: 'pulse-dot 1.5s infinite' }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: T.rose, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Live Recording</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        <svg className="card-thumb-icon" style={{ color: '#27272a', transition: 'all 0.25s', position: 'relative', zIndex: 1, width: 28, height: 28 }} viewBox="0 0 24 24" fill="none">
                          <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
                          <polygon points="11,10.5 14,12 11,13.5" fill="currentColor" />
                        </svg>
                        {/* Play overlay */}
                        <div className="card-play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(9,9,11,0.7)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(34,211,238,0.35)' }}>
                            <Play size={15} style={{ fill: '#09090b', color: '#09090b', marginLeft: 2 }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, color: T.sub, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {session.title}
                        </h3>
                        <button className="delete-btn" onClick={e => handleDelete(e, session._id)}
                          disabled={deletingId === session._id}
                          style={{ color: T.muted, background: 'transparent', border: 'none', padding: '3px 5px', borderRadius: 6, cursor: deletingId === session._id ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: deletingId === session._id ? 0.7 : 1 }}
                          title="Delete recording">
                          {deletingId === session._id ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                        </button>
                      </div>

                      {session.browserInfo && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, padding: '2px 8px', borderRadius: 99 }}>
                            <Laptop size={8} style={{ color: T.cyan }} />{session.browserInfo.os || 'OS'}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: T.muted, background: T.bg, border: `1px solid ${T.border}`, padding: '2px 8px', borderRadius: 99 }}>
                            {session.browserInfo.browser || 'Browser'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.muted }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={9} />
                        {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        {session.status === 'recording' ? (
                          <span style={{ color: T.rose, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.rose, display: 'inline-block', animation: 'pulse-dot 1.5s infinite' }} />
                            Recording
                          </span>
                        ) : (
                          <><Clock size={9} />{formatDuration(session.duration)}</>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ════ EXTENSION TOKEN MODAL ════ */}
      {showTokenModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)' }}
          onClick={e => e.target === e.currentTarget && setShowTokenModal(false)}>
          <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 48px 100px -20px rgba(0,0,0,0.9)', position: 'relative' }}>
            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #22d3ee 40%, #fbbf24 70%, transparent)' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: `1px solid rgba(255,255,255,0.07)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22d3ee' }}>
                <Key size={14} />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5', margin: 0 }}>Chrome Extension Setup</h3>
              </div>
              <button onClick={() => setShowTokenModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#52525b', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#f4f4f5'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                <X size={13} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: '#52525b', lineHeight: 1.7, margin: 0 }}>
                Connect the browser extension by pasting your authorization token. This maps all your bug reports directly to your profile.
              </p>

              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                  Your Private Token
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#09090b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '4px 4px 4px 12px', gap: 8 }}>
                  <input type="text" readOnly value={user?.token || ''} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#22d3ee', outline: 'none' }} />
                  <button onClick={handleCopyToken} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, background: tokenCopied ? 'rgba(74,222,128,0.12)' : '#22d3ee', border: 'none', color: tokenCopied ? '#4ade80' : '#09090b', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', flexShrink: 0 }}>
                    {tokenCopied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              </div>

              <div style={{ background: '#09090b', border: `1px solid rgba(255,255,255,0.07)`, borderRadius: 10, padding: '14px 16px' }}>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={11} style={{ color: '#22d3ee' }} /> Connection steps
                </h4>
                <ol style={{ fontSize: 12, color: '#52525b', paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
                  <li>Copy your token using the button above.</li>
                  <li>Click the <strong style={{ color: '#a1a1aa' }}>DebugSnap Extension</strong> icon in your browser toolbar.</li>
                  <li>The extension auto-reads your token from the dashboard.</li>
                  <li>Navigate to any page and click <strong style={{ color: '#a1a1aa' }}>Start Recording</strong>!</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: `1px solid rgba(255,255,255,0.06)`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTokenModal(false)} style={{ padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)`, color: '#a1a1aa', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
