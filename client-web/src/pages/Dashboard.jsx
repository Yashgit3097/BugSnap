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

/**
 * Dashboard Component
 * Renders the main user workspace showing all recorded sessions, live recording states,
 * and handles connecting the Chrome extension using an API authentication token.
 */
const Dashboard = () => {
  // Authentication context for current logged-in user
  const { user, logout } = useAuth();
  
  // State variables for sessions and UI loaders
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  
  // Search text query and status filters ('all', 'recording', 'completed')
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Control state for the API Token popup modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  // 1. Fetch the user's recorded sessions from the server when page mounts
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

  // 2. Setup Socket.io client to listen for real-time creation, completion, or deletion of sessions
  useEffect(() => {
    if (!user || !user.token) return;

    // Connect to the backend socket room authenticated with the JWT token
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

    // When a new session starts recording in the extension
    socket.on('SESSION_CREATED', (payload) => {
      setSessions((prev) => {
        // Prevent duplicate logs in state
        if (prev.some((s) => s._id === payload._id)) return prev;
        return [payload, ...prev];
      });
    });

    // When a session is completed and uploaded
    socket.on('SESSION_COMPLETED', (payload) => {
      setSessions((prev) =>
        prev.map((s) => (s._id === payload._id ? { ...s, ...payload } : s))
      );
    });

    // When a session is deleted from another window
    socket.on('SESSION_DELETED', (payload) => {
      setSessions((prev) => prev.filter((s) => s._id !== payload.sessionId));
    });

    // Cleanup socket on unmount
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // 3. Request delete endpoint and update state on confirmation
  const handleDelete = async (e, sessionId) => {
    e.preventDefault();
    e.stopPropagation(); // Avoid triggering Link component routing

    if (!window.confirm('Are you sure you want to permanently delete this session and all its logs?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/sessions/${sessionId}`);
      setSessions(sessions.filter((s) => s._id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  // 4. Clipboard helper to copy user JWT token
  const handleCopyToken = () => {
    if (!user?.token) return;
    navigator.clipboard.writeText(user.token).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  };

  // Helper: Format elapsed duration (seconds -> MM:SS)
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Filter list matching search query & tab selection
  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Derived metrics counts
  const totalSessions = sessions.length;
  const activeSessions = sessions.filter(s => s.status === 'recording').length;
  const completedSessions = sessions.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 bg-grid-glow text-slate-800 p-6 md:p-10 font-sans relative">
      
      {/* Light Glassmorphic Header Navigation Bar */}
      <nav className="glass-panel sticky top-4 z-40 max-w-6xl mx-auto flex items-center justify-between px-6 py-4 rounded-2xl shadow-md mb-12">
        <div className="flex items-center space-x-3 text-indigo-600">
          <BugPlay size={28} className="stroke-[2.5]" />
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Jam<span className="text-indigo-600">.dev</span> Debugger
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowTokenModal(true)}
            className="hidden sm:flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
          >
            <Key size={13} />
            <span>Extension Token</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
          
          <span className="text-xs text-slate-500 font-medium">
            Hi, <span className="text-slate-800 font-bold">{user?.username}</span>
          </span>
          
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-rose-600 hover:text-rose-700 transition-colors text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-rose-50"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto relative z-10">
        
        {/* Statistics Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Bug Reports</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{totalSessions}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <FileText size={18} />
            </div>
          </div>
          
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Live Streams</p>
              <div className="flex items-center mt-1 space-x-2">
                <h3 className="text-2xl font-extrabold text-slate-800">{activeSessions}</h3>
                {activeSessions > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>}
              </div>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Activity size={18} />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Completed Runs</p>
              <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{completedSessions}</h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Video size={18} />
            </div>
          </div>
        </section>

        {/* Searching & Filters Section */}
        <section className="glass-panel p-4 rounded-2xl shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder="Search by report title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400 transition-colors text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 border border-slate-200 px-3 py-2 rounded-xl bg-white">
              <Filter size={11} />
              <span>Filter:</span>
            </div>
            <div className="flex bg-slate-100 p-0.5 border border-slate-200 rounded-xl">
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
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Live Socket.io status badge */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 select-none">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="font-semibold hidden sm:inline">{wsConnected ? 'Live Sync' : 'Offline'}</span>
            </div>
          </div>
        </section>

        {/* Small Screen connection token button */}
        <div className="mb-6 block sm:hidden">
          <button 
            onClick={() => setShowTokenModal(true)}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2.5 rounded-xl text-xs font-bold transition-colors"
          >
            <Key size={13} />
            <span>Connection Token</span>
          </button>
        </div>

        {/* Reports Grid */}
        {loading ? (
          /* Skeletons load effect */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel rounded-2xl overflow-hidden border border-slate-200 flex flex-col h-[260px] shadow-sm">
                <div className="h-36 animate-shimmer"></div>
                <div className="p-4 flex-1 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-3/4 animate-shimmer"></div>
                  <div className="flex justify-between items-center pt-3">
                    <div className="h-3 bg-slate-200 rounded w-1/3 animate-shimmer"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/4 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="glass-panel border border-slate-200 rounded-2xl p-12 text-center shadow-sm max-w-md mx-auto mt-8 bg-white">
            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Video size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">No reports found</h3>
            <p className="text-slate-500 text-xs max-w-xs mx-auto mb-5 leading-relaxed">
              Start recording screen, console events, and clicks using the Chrome extension to see bug logs populate here.
            </p>
            <button 
              onClick={() => setShowTokenModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm"
            >
              How to Connect Extension
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <Link
                to={`/session/${session.publicId}`}
                key={session._id}
                className="group glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col h-[260px] shadow-sm bg-white"
              >
                {/* Visual Video Status Frame */}
                <div className="h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-200/60 select-none">
                  {session.status === 'recording' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/5">
                      <div className="w-4.5 h-4.5 bg-rose-600 rounded-full animate-recording flex items-center justify-center mb-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest animate-pulse">Live Recording</span>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent"></div>
                      <BugPlay size={32} className="text-slate-300 group-hover:scale-105 group-hover:text-indigo-200 transition-all duration-300" />
                      <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[1px]">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow shadow-indigo-200 transform translate-y-1.5 group-hover:translate-y-0 transition-transform duration-300">
                          <Play size={14} className="fill-white ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Card Title & Meta details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xs font-bold text-slate-850 group-hover:text-indigo-600 transition-colors truncate flex-1 mr-2">
                        {session.title}
                      </h3>
                      <button
                        onClick={(e) => handleDelete(e, session._id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors shrink-0"
                        title="Delete recording"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Metadata tags */}
                    {session.browserInfo && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="flex items-center space-x-1 text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200/50">
                          <Laptop size={9} className="text-slate-400" />
                          <span>{session.browserInfo.os || 'OS'}</span>
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded border border-slate-200/50">
                          {session.browserInfo.browser || 'Browser'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 text-[10px] text-slate-500">
                    <div className="flex items-center space-x-1">
                      <Calendar size={11} className="text-slate-400" />
                      <span>{new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center space-x-1 font-mono font-medium">
                      <Clock size={11} className="text-slate-400" />
                      <span>{session.status === 'recording' ? 'Recording' : formatDuration(session.duration)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Extension Setup Connection Modal Popup */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 bg-white animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header bar */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2 text-indigo-600">
                <Key size={15} />
                <h3 className="font-bold text-slate-900 text-sm">Chrome Extension Setup</h3>
              </div>
              <button 
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            
            {/* Token Content */}
            <div className="p-6 space-y-4.5">
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect the browser extension by pasting your authorization token. This maps all your bugs directly to your profile workspace.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Private Token</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                  <input 
                    type="text" 
                    readOnly 
                    value={user?.token || ''}
                    className="flex-1 bg-transparent px-2.5 text-xs font-mono text-slate-800 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyToken}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors shadow-sm"
                    title="Copy token"
                  >
                    {tokenCopied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800">Connection instructions:</h4>
                <ol className="text-xs text-slate-500 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Copy your token using the button above.</li>
                  <li>Click the **Jam.dev Extension** icon in your browser toolbar.</li>
                  <li>Paste the token into the text input and click **Save**.</li>
                  <li>Open any web tab and click **🎬 Start Recording**!</li>
                </ol>
              </div>
            </div>

            {/* Modal footer control */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowTokenModal(false)}
                className="bg-slate-250 hover:bg-slate-300 text-slate-700 border border-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-all"
              >
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
