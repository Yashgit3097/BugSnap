import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, Video, Clock, Calendar, Trash2, Search,
  Key, Copy, Check, Laptop, Activity, FileText, X, Play, Filter, Wifi, WifiOff, Zap
} from 'lucide-react';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

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
    socket.on('SESSION_CREATED',   p => setSessions(prev => prev.some(s => s._id === p._id) ? prev : [p, ...prev]));
    socket.on('SESSION_COMPLETED', p => setSessions(prev => prev.map(s => s._id === p._id ? { ...s, ...p } : s)));
    socket.on('SESSION_DELETED',   p => setSessions(prev => prev.filter(s => s._id !== p.sessionId)));
    return () => socket.disconnect();
  }, [user]);

  const handleDelete = async (e, sessionId) => {
    e.preventDefault(); e.stopPropagation();
    if (!window.confirm('Permanently delete this session and all its logs?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/sessions/${sessionId}`);
      setSessions(s => s.filter(x => x._id !== sessionId));
    } catch { alert('Failed to delete session. Please try again.'); }
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
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  };

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  const totalSessions     = sessions.length;
  const activeSessions    = sessions.filter(s => s.status === 'recording').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", WebkitFontSmoothing: 'antialiased', color: '#cdd6f4' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(137,180,250,0.15); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(137,180,250,0.3); }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes recPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(243,139,168,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(243,139,168,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .dash-card-link { text-decoration: none; }
        .dash-card-link:hover .session-card { border-color: rgba(137,180,250,0.25) !important; box-shadow: 0 0 0 1px rgba(137,180,250,0.1), 0 8px 32px -8px rgba(0,0,0,0.5) !important; }
        .dash-card-link:hover .session-thumb-icon { transform: scale(1.08); color: #89b4fa !important; }
        .dash-card-link:hover .play-overlay { opacity: 1 !important; }
        .stat-card:hover { border-color: rgba(137,180,250,0.2) !important; }
        .filter-btn:hover { color: #cdd6f4 !important; }
        .delete-btn:hover { background: rgba(243,139,168,0.12) !important; color: #f38ba8 !important; }
      `}</style>

      {/* ════ NAVBAR ════ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 40, background: '#14141f', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#89b4fa' }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
              <polygon points="11,10.5 14,12 11,13.5" fill="currentColor"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#cdd6f4', letterSpacing: '-0.3px' }}>
            Debug<span style={{ background: 'linear-gradient(135deg,#89b4fa,#cba6f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Snap</span>
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowTokenModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(137,180,250,0.08)', border: '1px solid rgba(137,180,250,0.15)', color: '#89b4fa', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(137,180,250,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(137,180,250,0.08)'}>
            <Key size={12} /><span>Extension Token</span>
          </button>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.07)' }} />

          <span style={{ fontSize: 12, color: '#6c7086', fontWeight: 500 }}>
            Hi, <span style={{ color: '#a6adc8', fontWeight: 700 }}>{user?.username}</span>
          </span>

          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(243,139,168,0.15)', color: '#f38ba8', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(243,139,168,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={12} /><span>Logout</span>
          </button>
        </div>
      </nav>

      {/* ════ PAGE CONTENT ════ */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Reports',  value: totalSessions,     icon: FileText,  color: '#89b4fa', glow: 'rgba(137,180,250,0.12)' },
            { label: 'Live Streams',   value: activeSessions,    icon: Activity,  color: '#f38ba8', glow: 'rgba(243,139,168,0.12)' },
            { label: 'Completed Runs', value: completedSessions, icon: Video,     color: '#a6e3a1', glow: 'rgba(166,227,161,0.12)' },
          ].map(({ label, value, icon: Icon, color, glow }) => (
            <div key={label} className="stat-card" style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.2s' }}>
              <div>
                <p style={{ fontSize: 10, color: '#6c7086', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 28, fontWeight: 800, color: '#cdd6f4', margin: 0, lineHeight: 1 }}>{value}</h3>
                  {label === 'Live Streams' && value > 0 && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f38ba8', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  )}
                </div>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: glow, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                <Icon size={18} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6c7086' }} />
            <input type="text" placeholder="Search by report title…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', height: 34, paddingLeft: 30, paddingRight: 12, background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, color: '#cdd6f4', outline: 'none', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = 'rgba(137,180,250,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
          </div>

          {/* Filter tabs */}
          <div style={{ display: 'flex', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 3, gap: 2 }}>
            {[{ id: 'all', label: 'All' }, { id: 'recording', label: 'Live' }, { id: 'completed', label: 'Done' }].map(tab => (
              <button key={tab.id} className="filter-btn" onClick={() => setStatusFilter(tab.id)}
                style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s', background: statusFilter === tab.id ? '#252535' : 'transparent', color: statusFilter === tab.id ? '#89b4fa' : '#6c7086', boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* WS status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#1e1e2e', border: `1px solid ${wsConnected ? 'rgba(166,227,161,0.2)' : 'rgba(243,139,168,0.15)'}`, borderRadius: 8, fontSize: 11, fontWeight: 600, color: wsConnected ? '#a6e3a1' : '#f38ba8' }}>
            {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span>{wsConnected ? 'Live Sync' : 'Offline'}</span>
          </div>
        </div>

        {/* ── Session Grid ── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', height: 240 }}>
                <div style={{ height: 130, background: `linear-gradient(90deg, #1e1e2e 25%, #252535 50%, #1e1e2e 75%)`, backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite' }} />
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, borderRadius: 6, background: `linear-gradient(90deg, #1e1e2e 25%, #252535 50%, #1e1e2e 75%)`, backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite', width: '70%' }} />
                  <div style={{ height: 10, borderRadius: 6, background: `linear-gradient(90deg, #1e1e2e 25%, #252535 50%, #1e1e2e 75%)`, backgroundSize: '800px 100%', animation: 'shimmer 1.4s infinite', width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#14141f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, maxWidth: 420, margin: '0 auto' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(137,180,250,0.08)', border: '1px solid rgba(137,180,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#89b4fa', margin: '0 auto 16px' }}>
              <Video size={22} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#cdd6f4', margin: '0 0 8px' }}>No reports found</h3>
            <p style={{ fontSize: 12, color: '#6c7086', lineHeight: 1.7, margin: '0 0 20px', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
              Start recording a session using the Chrome extension to see bug reports appear here.
            </p>
            <button onClick={() => setShowTokenModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Zap size={12} /> Connect Extension
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {filteredSessions.map(session => (
              <Link to={`/session/${session.publicId}`} key={session._id} className="dash-card-link">
                <div className="session-card" style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', height: 250, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s', boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)' }}>

                  {/* Thumbnail */}
                  <div style={{ height: 130, background: '#1e1e2e', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    {session.status === 'recording' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#f38ba8', animation: 'recPulse 1.5s infinite' }} />
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#f38ba8', textTransform: 'uppercase', letterSpacing: '0.1em', animation: 'pulse 1.5s infinite' }}>Live Recording</span>
                      </div>
                    ) : (
                      <>
                        {/* Grid bg pattern */}
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(137,180,250,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(137,180,250,0.04) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        <svg className="session-thumb-icon" style={{ color: '#313149', transition: 'all 0.25s', position: 'relative', zIndex: 1, width: 28, height: 28 }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
                          <polygon points="11,10.5 14,12 11,13.5" fill="currentColor"/>
                        </svg>
                        {/* Play overlay */}
                        <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,26,0.65)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                            <Play size={15} style={{ fill: 'white', color: 'white', marginLeft: 2 }} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, color: '#a6adc8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {session.title}
                        </h3>
                        <button className="delete-btn" onClick={e => handleDelete(e, session._id)}
                          style={{ color: '#6c7086', background: 'transparent', border: 'none', padding: '3px 5px', borderRadius: 6, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                          title="Delete recording">
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {session.browserInfo && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: '#6c7086', background: '#252535', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99 }}>
                            <Laptop size={8} style={{ color: '#89b4fa' }} />{session.browserInfo.os || 'OS'}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, color: '#6c7086', background: '#252535', border: '1px solid rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99 }}>
                            {session.browserInfo.browser || 'Browser'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, color: '#6c7086' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={9} style={{ color: '#6c7086' }} />
                        {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontWeight: 600 }}>
                        {session.status === 'recording' ? (
                          <span style={{ color: '#f38ba8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#f38ba8', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                            Recording
                          </span>
                        ) : (
                          <>
                            <Clock size={9} />
                            {formatDuration(session.duration)}
                          </>
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

      {/* ════ TOKEN MODAL ════ */}
      {showTokenModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(7,8,12,0.8)', backdropFilter: 'blur(12px)' }}
          onClick={e => e.target === e.currentTarget && setShowTokenModal(false)}>
          <div style={{ background: '#14141f', border: '1px solid rgba(137,180,250,0.2)', borderRadius: 20, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.7), 0 0 40px -10px rgba(99,102,241,0.15)', position: 'relative' }}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(137,180,250,0.5), rgba(203,166,247,0.5), transparent)' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#89b4fa' }}>
                <Key size={14} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#cdd6f4', margin: 0 }}>Chrome Extension Setup</h3>
              </div>
              <button onClick={() => setShowTokenModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, color: '#6c7086', cursor: 'pointer', padding: '4px 7px', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#cdd6f4'}
                onMouseLeave={e => e.currentTarget.style.color = '#6c7086'}>
                <X size={13} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 12, color: '#6c7086', lineHeight: 1.7, margin: 0 }}>
                Connect the browser extension by pasting your authorization token. This maps all your bug reports directly to your profile.
              </p>

              <div>
                <label style={{ fontSize: 9, fontWeight: 700, color: '#4b5060', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>
                  Your Private Token
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '4px 4px 4px 12px', gap: 8 }}>
                  <input type="text" readOnly value={user?.token || ''} style={{ flex: 1, background: 'transparent', border: 'none', fontSize: 11, fontFamily: "'JetBrains Mono','Fira Code',monospace", color: '#89b4fa', outline: 'none' }} />
                  <button onClick={handleCopyToken} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, background: tokenCopied ? 'rgba(166,227,161,0.12)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: tokenCopied ? '#a6e3a1' : 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', flexShrink: 0 }}>
                    {tokenCopied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              </div>

              <div style={{ background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' }}>
                <h4 style={{ fontSize: 11, fontWeight: 700, color: '#a6adc8', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={11} style={{ color: '#89b4fa' }} /> Connection steps
                </h4>
                <ol style={{ fontSize: 11, color: '#6c7086', paddingLeft: 18, margin: 0, lineHeight: 1.9 }}>
                  <li>Copy your token using the button above.</li>
                  <li>Click the <strong style={{ color: '#a6adc8' }}>DebugSnap Extension</strong> icon in your browser toolbar.</li>
                  <li>The extension auto-reads your token from the dashboard.</li>
                  <li>Navigate to any page and click <strong style={{ color: '#a6adc8' }}>Start Recording</strong>!</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTokenModal(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a6adc8', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
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
