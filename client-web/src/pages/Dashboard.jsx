import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  BugPlay, 
  LogOut, 
  Video, 
  Clock, 
  Calendar, 
  Trash2, 
  Search, 
  Key, 
  Copy, 
  Check, 
  Laptop, 
  Activity, 
  FileText, 
  X,
  Play,
  Filter
} from 'lucide-react';
import { io } from 'socket.io-client';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, recording, completed

  // API Token Modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Fetch user's sessions when the dashboard loads
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/sessions/my');
        setSessions(data);
      } catch (error) {
        console.error('Failed to fetch sessions', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  // Socket.io Live synchronization
  useEffect(() => {
    if (!user || !user.token) return;

    const socket = io('http://localhost:5000', {
      query: { token: user.token },
      reconnectionAttempts: 5,
      reconnectionDelay: 3000
    });

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to live session updates');
      setWsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Disconnected');
      setWsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket.io] Connection error:', err.message);
      setWsConnected(false);
    });

    // Listen to session events directly
    socket.on('SESSION_CREATED', (payload) => {
      setSessions((prev) => {
        if (prev.some((s) => s._id === payload._id)) return prev;
        return [payload, ...prev];
      });
    });

    socket.on('SESSION_COMPLETED', (payload) => {
      setSessions((prev) =>
        prev.map((s) => (s._id === payload._id ? { ...s, ...payload } : s))
      );
    });

    socket.on('SESSION_DELETED', (payload) => {
      setSessions((prev) => prev.filter((s) => s._id !== payload.sessionId));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Handle session deletion
  const handleDelete = async (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to permanently delete this session and all its logs?')) return;

    try {
      await axios.delete(`http://localhost:5000/api/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s._id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // Copy token handler
  const handleCopyToken = () => {
    if (!user?.token) return;
    navigator.clipboard.writeText(user.token).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  // Convert seconds to MM:SS format
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Filter sessions based on search & status
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'recording').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-[#0b0f19] bg-grid-glow text-slate-100 p-6 md:p-10 font-sans relative">
      
      {/* Glassmorphic Navbar */}
      <nav className="glass-panel sticky top-4 z-40 max-w-6xl mx-auto flex items-center justify-between px-6 py-4 rounded-2xl shadow-xl mb-12">
        <div className="flex items-center space-x-3 text-indigo-400">
          <BugPlay size={30} className="stroke-[2.5]" />
          <h1 className="text-xl font-extrabold text-white tracking-tight">Jam<span className="text-indigo-400">.dev</span> Clone</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowTokenModal(true)}
            className="hidden sm:flex items-center space-x-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300"
          >
            <Key size={14} />
            <span>Connection Token</span>
          </button>
          
          <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
          
          <span className="text-xs text-slate-400 font-medium">Hi, <span className="text-slate-200 font-semibold">{user?.username}</span></span>
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-rose-400 hover:text-rose-300 transition-colors text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-rose-500/5"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto relative z-10">
        
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Reports</p>
              <h3 className="text-2xl font-bold text-white mt-1">{totalSessions}</h3>
            </div>
            <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/15">
              <FileText size={20} />
            </div>
          </div>
          
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Live Recordings</p>
              <div className="flex items-center mt-1 space-x-2">
                <h3 className="text-2xl font-bold text-white">{activeSessions}</h3>
                {activeSessions > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>}
              </div>
            </div>
            <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/15">
              <Activity size={20} />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Completed Runs</p>
              <h3 className="text-2xl font-bold text-white mt-1">{completedSessions}</h3>
            </div>
            <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15">
              <Video size={20} />
            </div>
          </div>
        </section>

        {/* Filter Controls Row */}
        <section className="glass-panel p-4.5 rounded-2xl shadow-md mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search session title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500/50 transition-all text-slate-100 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 border border-slate-800 px-3 py-2.5 rounded-xl bg-slate-950/20">
              <Filter size={12} />
              <span>Status:</span>
            </div>
            <div className="flex bg-slate-950/60 p-1 border border-slate-800 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'recording', label: 'Live' },
                { id: 'completed', label: 'Completed' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    statusFilter === tab.id 
                      ? 'bg-indigo-500 text-white shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Live Sync Status indicator */}
            <div className="flex items-center space-x-2 bg-slate-950/40 border border-slate-800 rounded-xl px-4.5 py-2 text-xs text-slate-400 select-none">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="font-semibold hidden sm:inline">{wsConnected ? 'Sync Connected' : 'Sync Disconnected'}</span>
            </div>
          </div>
        </section>

        {/* Small Screen connection token button */}
        <div className="mb-6 block sm:hidden">
          <button 
            onClick={() => setShowTokenModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 shadow"
          >
            <Key size={14} />
            <span>View Extension Connection Token</span>
          </button>
        </div>

        {/* Sessions Render */}
        {loading ? (
          /* Premium Shimmer Skeleton Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-slate-800/80 flex flex-col h-[270px]">
                <div className="h-40 animate-shimmer"></div>
                <div className="p-5 flex-1 space-y-3">
                  <div className="h-4 bg-slate-800 rounded-md w-3/4 animate-shimmer"></div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-3 bg-slate-800 rounded-md w-1/3 animate-shimmer"></div>
                    <div className="h-3 bg-slate-800 rounded-md w-1/4 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="glass-panel border border-slate-800/60 rounded-3xl p-16 text-center shadow-2xl max-w-lg mx-auto mt-8">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow">
              <Video size={28} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No bug reports match</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              Make sure you have configured the Chrome Extension. Get started by recording a bug session!
            </p>
            <button 
              onClick={() => setShowTokenModal(true)}
              className="bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white text-xs font-bold px-4.5 py-2.5 rounded-xl transition-all shadow"
            >
              Configure Chrome Extension
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <Link
                to={`/session/${session.publicId}`}
                key={session._id}
                className="group glass-panel glass-panel-hover rounded-2xl overflow-hidden shadow-lg border border-slate-800/80 flex flex-col h-[270px]"
              >
                {/* Visual Preview Frame */}
                <div className="h-38 bg-slate-950/80 relative overflow-hidden flex items-center justify-center border-b border-slate-800/60 select-none">
                  {session.status === 'recording' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/5">
                      <div className="w-4 h-4 bg-rose-500 rounded-full animate-recording flex items-center justify-center mb-3">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest animate-pulse">Recording live</span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent"></div>
                      <BugPlay size={36} className="text-slate-800 group-hover:scale-110 group-hover:text-indigo-500/30 transition-all duration-300" />
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                          <Play size={16} className="fill-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Card details panel */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate flex-1 mr-2">{session.title}</h3>
                      <button
                        onClick={(e) => handleDelete(e, session._id)}
                        className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors shrink-0"
                        title="Delete recording"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Metadata tags */}
                    {session.browserInfo && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="flex items-center space-x-1 text-[10px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-md border border-slate-700/50">
                          <Laptop size={10} className="text-slate-400" />
                          <span>{session.browserInfo.os || 'OS'}</span>
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded-md border border-slate-700/50">
                          {session.browserInfo.browser || 'Browser'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/40 text-[11px] text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <Calendar size={11} className="text-indigo-400/80" />
                      <span>{new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 font-mono">
                      <Clock size={11} className="text-indigo-400/80" />
                      <span>{session.status === 'recording' ? 'Live' : formatDuration(session.duration)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Connection Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800 bg-slate-900/30">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Key size={16} />
                <h3 className="font-bold text-white">Chrome Extension Connection</h3>
              </div>
              <button 
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Paste your authentication connection token into the Chrome extension to automatically associate your recorded bug reports with this account.
              </p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Your Private Token</label>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1.5">
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.token || ''}
                    className="flex-1 bg-transparent px-3 text-xs font-mono focus:outline-none select-all text-slate-200"
                  />
                  <button
                    onClick={handleCopyToken}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg transition-all"
                    title="Copy to clipboard"
                  >
                    {tokenCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white">How to connect:</h4>
                <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Copy your token using the button above.</li>
                  <li>Click the **"Jam.dev Clone Extension"** icon in your browser toolbar.</li>
                  <li>Paste the token into the configuration input field.</li>
                  <li>Save, open any page, and click **Start Recording**!</li>
                </ol>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-900/30 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowTokenModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
