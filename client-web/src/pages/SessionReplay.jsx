import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import {
  BugPlay,
  Terminal,
  Network,
  MousePointer2,
  Share2,
  ArrowLeft,
  Check,
  Server,
  FileCode,
  CornerDownRight,
  Laptop,
  Cpu,
  Monitor,
  Calendar,
  Search,
  AlertTriangle,
  Info
} from 'lucide-react';

// List of known serializer types for Console logs
const KNOWN_TYPES = ['null', 'undefined', 'number', 'boolean', 'string', 'error', 'array', 'object', 'function', 'symbol'];

/**
 * Normalizes any raw Javascript value or wrapped structure into a standardized shape:
 * { type: string, value: any, stack?: string }
 * This allows recursive rendering of nested structures regardless of their serialization level.
 */
const normalizeArg = (val) => {
  if (val === null) return { type: 'null', value: null };
  if (val === undefined) return { type: 'undefined', value: undefined };

  // If it's already a wrapped structure matching our schema, return it
  if (
    typeof val === 'object' &&
    val !== null &&
    'type' in val &&
    'value' in val &&
    KNOWN_TYPES.includes(val.type)
  ) {
    return val;
  }

  // Detect and wrap raw Javascript types
  if (typeof val === 'number') return { type: 'number', value: val };
  if (typeof val === 'boolean') return { type: 'boolean', value: val };
  if (typeof val === 'string') return { type: 'string', value: val };
  if (Array.isArray(val)) return { type: 'array', value: val };

  // Support native error objects or error-like payloads
  if (val instanceof Error || (typeof val === 'object' && ('stack' in val || 'message' in val))) {
    return { type: 'error', value: val.message || String(val), stack: val.stack };
  }

  if (typeof val === 'object') return { type: 'object', value: val };

  return { type: 'string', value: String(val) };
};

/**
 * Returns a brief, flat preview description of an element for rendering inside collapsed parents.
 */
const renderFlatPreview = (val) => {
  const norm = normalizeArg(val);
  if (norm.type === 'null') return 'null';
  if (norm.type === 'undefined') return 'undefined';
  if (norm.type === 'number') return String(norm.value);
  if (norm.type === 'boolean') return String(norm.value);
  if (norm.type === 'string') return `"${norm.value}"`;
  if (norm.type === 'error') return 'Error';
  if (norm.type === 'array') return `Array(${norm.value?.length || 0})`;
  if (norm.type === 'object') return '{...}';
  return String(norm.value);
};

/**
 * Renders a single console log argument. Handles recursive expansion for
 * arrays and objects, with specific colors matching browser DevTools in Light Mode.
 */
const ConsoleArg = ({ arg: rawArg, isTopLevel = false }) => {
  const [expanded, setExpanded] = useState(false);

  // Guarantee normalized form
  const arg = normalizeArg(rawArg);

  if (!arg) return <span className="text-slate-400 font-mono">null</span>;

  const { type, value } = arg;

  if (type === 'null') {
    return <span className="text-slate-400 font-mono">null</span>;
  }
  if (type === 'undefined') {
    return <span className="text-slate-400 font-mono">undefined</span>;
  }
  if (type === 'number') {
    return <span className="text-[#1c00cf] font-mono">{String(value)}</span>;
  }
  if (type === 'boolean') {
    return <span className="text-[#1c00cf] font-mono">{String(value)}</span>;
  }
  if (type === 'string') {
    return isTopLevel ? (
      <span className="text-slate-800 font-mono whitespace-pre-wrap">{String(value)}</span>
    ) : (
      <span className="text-[#c41a16] font-mono">"{String(value)}"</span>
    );
  }
  if (type === 'error') {
    return (
      <div className="text-rose-600 font-mono text-xs whitespace-pre-wrap">
        <div className="font-semibold">{value}</div>
        {arg.stack && (
          <pre className="text-[10px] text-rose-500/80 mt-1 pl-3 border-l border-rose-300 overflow-x-auto leading-relaxed select-text font-mono">
            {arg.stack}
          </pre>
        )}
      </div>
    );
  }

  // Render arrays with collapsible tree controls
  if (type === 'array') {
    const items = Array.isArray(value) ? value : [];

    const renderPreview = () => {
      const previews = items.slice(0, 5).map((item, idx) => {
        const norm = normalizeArg(item);
        if (norm.type === 'null') return <span key={idx} className="text-slate-400 font-mono">null</span>;
        if (norm.type === 'undefined') return <span key={idx} className="text-slate-400 font-mono">undefined</span>;
        if (norm.type === 'number') return <span key={idx} className="text-[#1c00cf] font-mono">{String(norm.value)}</span>;
        if (norm.type === 'boolean') return <span key={idx} className="text-[#1c00cf] font-mono">{String(norm.value)}</span>;
        if (norm.type === 'string') return <span key={idx} className="text-[#c41a16] font-mono">"{String(norm.value)}"</span>;
        if (norm.type === 'array') return <span key={idx} className="text-slate-500 font-mono">Array({norm.value?.length || 0})</span>;
        if (norm.type === 'object') return <span key={idx} className="text-slate-500 font-mono">{'{...}'}</span>;
        return <span key={idx} className="text-slate-500 font-mono">{renderFlatPreview(item)}</span>;
      });

      return (
        <span className="font-mono cursor-pointer select-none text-slate-800 hover:text-indigo-600 transition-colors" onClick={() => setExpanded(!expanded)}>
          <span className="text-[10px] text-slate-400 mr-1.5">{expanded ? '▼' : '▶'}</span>
          <span className="text-slate-550 italic mr-1">Array({items.length})</span>
          <span className="text-slate-700">[</span>
          {previews.reduce((acc, x, i) => i === 0 ? [x] : [...acc, <span key={`c-${i}`} className="text-slate-400">, </span>, x], [])}
          {items.length > 5 && <span className="text-slate-400">, ...</span>}
          <span className="text-slate-700">]</span>
        </span>
      );
    };

    return (
      <div className="font-mono inline-block">
        {renderPreview()}
        {expanded && (
          <div className="pl-4 border-l border-slate-200 mt-1 space-y-1 ml-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-start text-xs">
                <span className="text-slate-400 mr-2 select-none shrink-0 w-6 text-right">{index}:</span>
                <ConsoleArg arg={item} />
              </div>
            ))}
            <div className="flex items-start text-xs">
              <span className="text-slate-400 mr-2 select-none shrink-0 w-6 text-right">length:</span>
              <span className="text-[#1c00cf] font-mono">{items.length}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render objects with collapsible tree controls
  if (type === 'object') {
    const keys = value ? Object.keys(value) : [];

    const renderPreview = () => {
      const previews = keys.slice(0, 5).map((key) => {
        const item = value[key];
        const norm = normalizeArg(item);
        let previewVal;
        if (norm.type === 'null') previewVal = <span className="text-slate-400">null</span>;
        else if (norm.type === 'undefined') previewVal = <span className="text-slate-400">undefined</span>;
        else if (norm.type === 'number') previewVal = <span className="text-[#1c00cf]">{String(norm.value)}</span>;
        else if (norm.type === 'boolean') previewVal = <span className="text-[#1c00cf]">{String(norm.value)}</span>;
        else if (norm.type === 'string') previewVal = <span className="text-[#c41a16]">"{String(norm.value)}"</span>;
        else if (norm.type === 'array') previewVal = <span className="text-slate-500">Array({norm.value?.length || 0})</span>;
        else if (norm.type === 'object') previewVal = <span className="text-slate-500">{'{...}'}</span>;
        else previewVal = <span className="text-slate-500">{renderFlatPreview(item)}</span>;

        return (
          <span key={key} className="inline-flex items-center">
            <span className="text-[#881180] mr-1">{key}</span>: {previewVal}
          </span>
        );
      });

      return (
        <span className="font-mono cursor-pointer select-none text-slate-800 hover:text-indigo-600 transition-colors" onClick={() => setExpanded(!expanded)}>
          <span className="text-[10px] text-slate-400 mr-1.5">{expanded ? '▼' : '▶'}</span>
          <span className="text-slate-550 italic mr-1">Object</span>
          <span className="text-slate-700">{'{'}</span>
          {previews.reduce((acc, x, i) => i === 0 ? [x] : [...acc, <span key={`c-${i}`} className="text-slate-400">, </span>, x], [])}
          {keys.length > 5 && <span className="text-slate-400">, ...</span>}
          <span className="text-slate-700">{'}'}</span>
        </span>
      );
    };

    return (
      <div className="font-mono inline-block">
        {renderPreview()}
        {expanded && (
          <div className="pl-4 border-l border-slate-200 mt-1 space-y-1 ml-2">
            {keys.map((key) => (
              <div key={key} className="flex items-start text-xs">
                <span className="text-[#881180] mr-2 select-none shrink-0">{key}:</span>
                <ConsoleArg arg={value[key]} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-slate-800 font-mono">{String(value || rawArg)}</span>;
};

const SessionReplay = () => {
  const { publicId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0); // in milliseconds
  const [activeTab, setActiveTab] = useState('console'); // console, network, actions
  const [selectedNetworkReq, setSelectedNetworkReq] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [consoleFilter, setConsoleFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');

  const videoRef = useRef(null);
  const consoleContainerRef = useRef(null);
  const networkContainerRef = useRef(null);
  const actionsContainerRef = useRef(null);

  const renderConsoleLog = (log) => {
    try {
      if (log.message.startsWith('[') && log.message.endsWith(']')) {
        const parsedArgs = JSON.parse(log.message);
        if (Array.isArray(parsedArgs)) {
          return (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 select-text">
              {parsedArgs.map((arg, idx) => (
                <ConsoleArg key={idx} arg={arg} isTopLevel={true} />
              ))}
            </div>
          );
        }
      }
    } catch (e) {
      // Fallback
    }

    return <div className="break-all whitespace-pre-wrap select-text">{log.message}</div>;
  };

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/sessions/public/${publicId}`);
        setData(response.data);
        console.log('Fetched session data:', response.data);
      } catch (error) {
        console.error('Failed to fetch session', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessionData();
  }, [publicId]);

  // Update currentTime state as the video plays
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime * 1000);
    }
  };

  const formatVideoTime = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const sec = String(totalSec % 60).padStart(2, '0');
    const tenths = Math.floor((ms % 1000) / 100);
    return `${min}:${sec}.${tenths}`;
  };

  const handleShareClick = () => {
    const shareUrl = `${window.location.origin}/session/${publicId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  // Helper to safely display JSON payloads in Light Mode
  const renderJSONPayload = (val) => {
    if (!val) return <span className="text-slate-400 italic text-[11px]">Empty</span>;
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return <pre className="text-[11px] text-slate-800 font-mono overflow-x-auto p-3 bg-slate-50 rounded-xl border border-slate-200 break-all whitespace-pre-wrap leading-relaxed">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      return <pre className="text-[11px] text-slate-800 font-mono overflow-x-auto p-3 bg-slate-50 rounded-xl border border-slate-200 break-all whitespace-pre-wrap leading-relaxed">{String(val)}</pre>;
    }
  };

  const session = data?.session;
  const logs = data?.logs || [];
  const networkRequests = data?.networkRequests || [];
  const actions = data?.actions || [];

  // Filter items based on current video timestamp
  const visibleLogs = logs
    .filter((log) => log.time <= currentTime)
    .filter((log) => log.message.toLowerCase().includes(consoleFilter.toLowerCase()));

  const visibleNetwork = networkRequests
    .filter((req) => req.time <= currentTime)
    .filter((req) => req.url.toLowerCase().includes(networkFilter.toLowerCase()));

  const visibleActions = actions.filter((act) => act.time <= currentTime);

  // Auto-scroll list panels to follow playback
  useEffect(() => {
    if (activeTab === 'console' && consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [visibleLogs.length, activeTab]);

  useEffect(() => {
    if (activeTab === 'network' && networkContainerRef.current && !selectedNetworkReq) {
      networkContainerRef.current.scrollTop = networkContainerRef.current.scrollHeight;
    }
  }, [visibleNetwork.length, activeTab, selectedNetworkReq]);

  useEffect(() => {
    if (activeTab === 'actions' && actionsContainerRef.current) {
      actionsContainerRef.current.scrollTop = actionsContainerRef.current.scrollHeight;
    }
  }, [visibleActions.length, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center font-sans space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
        <span className="text-sm font-semibold tracking-wider uppercase text-slate-500">Loading session replay data...</span>
      </div>
    );
  }

  if (!data || !data.session) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center items-center font-sans space-y-6">
        <div className="p-4.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600">
          <AlertTriangle size={32} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Session Not Found</h2>
          <p className="text-slate-500 text-sm">The requested bug report link may have expired or been deleted.</p>
        </div>
        <Link to="/" className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col h-screen overflow-hidden font-sans relative">

      {/* Sleek Top Control Bar */}
      <header className="bg-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-200 z-20 shadow-sm">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-slate-500 hover:text-slate-800 p-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200" title="Back to dashboard">
            <ArrowLeft size={16} />
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <BugPlay size={20} className="text-indigo-600" />
              <h1 className="text-sm font-bold text-slate-800 tracking-tight">{session.title}</h1>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <Calendar size={10} />
                <span>{new Date(session.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleShareClick}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            {shareCopied ? (
              <>
                <Check size={13} />
                <span>Copied Replay Link!</span>
              </>
            ) : (
              <>
                <Share2 size={13} />
                <span>Share Bug Report</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Split View Viewport */}
      <div className="flex-1 flex min-h-0 bg-slate-50 z-10">

        {/* Left Panel: Video Replay Frame */}
        <div className="w-1/2 p-6 flex flex-col min-h-0 justify-between select-none">
          <div className="flex-1 bg-black border border-slate-200 rounded-3xl overflow-hidden flex flex-col shadow-lg relative">

            {/* Player header banner */}
            <div className="bg-slate-900 px-5 py-3 text-xs text-slate-300 flex items-center justify-between">
              <div className="flex items-center space-x-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Interactions Replay Screen</span>
              </div>
              <div className="flex items-center space-x-1.5 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-semibold text-slate-400">
                <Laptop size={10} className="text-indigo-400" />
                <span>{session.browserInfo?.browser || 'Chrome'} • {session.browserInfo?.os || 'OS'}</span>
              </div>
            </div>

            {/* Render video element */}
            <div className="flex-1 bg-black relative flex items-center justify-center">
              <video
                ref={videoRef}
                src={session.videoUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Synchronized HUD Time overlay */}
            <div className="absolute top-14 right-4 bg-black/80 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs text-indigo-400 font-bold shadow-lg">
              HUD Tracker: {formatVideoTime(currentTime)}
            </div>
          </div>

          {/* User Environment Specifications Info Card */}
          {session.browserInfo && (
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-200 shadow-sm mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <Laptop size={16} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Environment Info</h4>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{session.browserInfo.os || 'OS'} Client Device</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
                  <Cpu size={12} className="text-indigo-650" />
                  <span>Browser: <span className="text-slate-700 font-semibold">{session.browserInfo.browser || 'N/A'}</span></span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-mono">
                  <Monitor size={12} className="text-indigo-650" />
                  <span>Screen: <span className="text-slate-700 font-semibold">{session.browserInfo.screen || 'N/A'}</span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Integrated Web DevTools */}
        <div className="w-1/2 flex flex-col min-h-0 border-l border-slate-200 bg-white">

          {/* Glassmorphic Tabs Select header */}
          <div className="bg-slate-100 border-b border-slate-200 flex items-center px-4 shrink-0 justify-between">
            <div className="flex items-center py-0">
              {[
                { id: 'console', icon: Terminal, label: 'Console logs', count: visibleLogs.length },
                { id: 'network', icon: Network, label: 'Network', count: visibleNetwork.length },
                { id: 'actions', icon: MousePointer2, label: 'Actions', count: visibleActions.length }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setSelectedNetworkReq(null); }}
                    className={`flex items-center space-x-2 text-xs font-semibold px-4 py-3 border-r border-slate-200 transition-all focus:outline-none ${isActive
                        ? 'bg-white text-slate-800 border-b border-b-white font-bold'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    style={isActive ? { marginBottom: '-1px', borderBottom: '1px solid white' } : {}}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none pr-2 font-mono">
              Live Console sync
            </div>
          </div>

          {/* Active Tab Panel Frame */}
          <div className="flex-1 flex flex-col min-h-0 p-5 bg-white">

            {/* CONSOLE LOGGER PANEL */}
            {activeTab === 'console' && (
              <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Search / Filter logs */}
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center relative">
                  <Search size={12} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter console list messages..."
                    value={consoleFilter}
                    onChange={(e) => setConsoleFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400/50"
                  />
                </div>
                {/* Scrolling logger body */}
                <div
                  ref={consoleContainerRef}
                  className="flex-1 overflow-y-auto custom-scrollbar bg-white divide-y divide-slate-100"
                >
                  {visibleLogs.length === 0 ? (
                    <div className="text-slate-400 text-xs font-mono text-center mt-12 py-6">
                      {consoleFilter ? 'No matching logs found.' : 'No console messages output up to this timestamp.'}
                    </div>
                  ) : (
                    visibleLogs.map((log, index) => {
                      const isErr = log.type === 'error';
                      const isWarn = log.type === 'warn';
                      return (
                        <div
                          key={log._id || index}
                          className={`font-mono text-xs px-4 py-2 border-l-4 leading-relaxed flex items-start space-x-3 transition-colors hover:bg-slate-50/50 ${isErr
                              ? 'bg-rose-50/30 border-l-rose-500 text-rose-700'
                              : isWarn
                                ? 'bg-amber-50/30 border-l-amber-500 text-amber-700'
                                : 'border-l-transparent text-slate-800'
                            }`}
                        >
                          <span className="text-slate-400 shrink-0 select-none text-[10px] mt-0.5">[{formatVideoTime(log.time)}]</span>
                          <span className={`font-bold shrink-0 select-none text-[9px] uppercase px-1.5 py-0.5 rounded ${isErr ? 'bg-rose-100 text-rose-700' : isWarn ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }`}>{log.type}</span>
                          <div className="flex-1 min-w-0">{renderConsoleLog(log)}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* NETWORK INSPECTION PANEL */}
            {activeTab === 'network' && (
              <div className="flex-1 flex min-h-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative">

                {/* Left pane: Requests list */}
                <div className={`flex-1 flex flex-col min-h-0 ${selectedNetworkReq ? 'hidden md:flex md:max-w-xs border-r border-slate-200' : ''}`}>
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center relative">
                    <Search size={12} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter API paths..."
                      value={networkFilter}
                      onChange={(e) => setNetworkFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-400/50"
                    />
                  </div>

                  <div
                    ref={networkContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 bg-white"
                  >
                    {visibleNetwork.length === 0 ? (
                      <div className="text-slate-400 text-xs font-mono text-center mt-12">
                        {networkFilter ? 'No matching request logs.' : 'No network activity up to this timestamp.'}
                      </div>
                    ) : (
                      visibleNetwork.map((req, index) => {
                        const isSuccess = req.status >= 200 && req.status < 300;
                        const isErr = req.status === 0 || req.status >= 400;
                        const isSelected = selectedNetworkReq && selectedNetworkReq._id === req._id;
                        return (
                          <button
                            key={req._id || index}
                            onClick={() => setSelectedNetworkReq(req)}
                            className={`w-full text-left p-3.5 flex flex-col space-y-2 transition-all text-xs font-mono border-l-4 ${isSelected
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold'
                                : 'hover:bg-slate-50 border-transparent text-slate-700'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`font-extrabold ${req.method === 'POST' ? 'text-emerald-600' : 'text-sky-600'}`}>
                                  {req.method}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSuccess ? 'bg-emerald-50 text-emerald-700' : isErr ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {req.status === 0 ? 'FAIL' : req.status}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-semibold">[{formatVideoTime(req.time)}]</span>
                            </div>
                            <div className="truncate text-slate-500 text-[11px]" title={req.url}>
                              {req.url.replace(/^https?:\/\/[^/]+/, '') || req.url}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right details inspection panel */}
                {selectedNetworkReq ? (
                  <div className="flex-1 flex flex-col min-h-0 bg-white animate-in fade-in slide-in-from-right-4 duration-200">
                    {/* Drawer top details toolbar */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold font-mono ${selectedNetworkReq.method === 'POST' ? 'text-emerald-600' : 'text-sky-600'}`}>
                          {selectedNetworkReq.method}
                        </span>
                        <span className="text-[11px] text-slate-700 font-mono truncate max-w-xs" title={selectedNetworkReq.url}>
                          {selectedNetworkReq.url.replace(/^https?:\/\/[^/]+/, '') || selectedNetworkReq.url}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedNetworkReq(null)}
                        className="text-slate-605 hover:text-slate-800 px-2.5 py-1 rounded-xl bg-slate-200/50 hover:bg-slate-200 text-[10px] font-semibold border border-slate-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    {/* Stats and Payloads */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-white">

                      {/* Meta information tags */}
                      <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-mono select-text">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Status</div>
                          <div className={`text-xs font-bold ${selectedNetworkReq.status >= 200 && selectedNetworkReq.status < 300 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {selectedNetworkReq.status || 'Failed'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Latency</div>
                          <div className="text-xs font-bold text-slate-700">{selectedNetworkReq.duration ? `${selectedNetworkReq.duration}ms` : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Offset</div>
                          <div className="text-xs font-bold text-slate-700">{formatVideoTime(selectedNetworkReq.time)}</div>
                        </div>
                      </div>

                      {/* Request Headers */}
                      {selectedNetworkReq.requestHeaders && Object.keys(selectedNetworkReq.requestHeaders).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-555 font-bold uppercase tracking-wider">
                            <FileCode size={11} className="text-indigo-600" />
                            <span>Request Headers</span>
                          </div>
                          <div>{renderJSONPayload(selectedNetworkReq.requestHeaders)}</div>
                        </div>
                      )}

                      {/* Request Body Payload */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-555 font-bold uppercase tracking-wider">
                          <FileCode size={11} className="text-indigo-600" />
                          <span>Request Payload Body</span>
                        </div>
                        <div>{renderJSONPayload(selectedNetworkReq.requestBody)}</div>
                      </div>

                      {/* Response Headers */}
                      {selectedNetworkReq.responseHeaders && Object.keys(selectedNetworkReq.responseHeaders).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-555 font-bold uppercase tracking-wider">
                            <Server size={11} className="text-indigo-600" />
                            <span>Response Headers</span>
                          </div>
                          <div>{renderJSONPayload(selectedNetworkReq.responseHeaders)}</div>
                        </div>
                      )}

                      {/* Response Body Payload */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-555 font-bold uppercase tracking-wider">
                          <Server size={11} className="text-indigo-600" />
                          <span>Response Payload Body</span>
                        </div>
                        <div>{renderJSONPayload(selectedNetworkReq.responseBody)}</div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 text-xs font-mono p-6 text-center select-none bg-white">
                    <div className="space-y-2">
                      <Info size={20} className="mx-auto text-slate-400" />
                      <p className="text-slate-500">Select any network API request to inspect headers and body payloads.</p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ACTIONS PANEL */}
            {activeTab === 'actions' && (
              <div
                ref={actionsContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-white border border-slate-200 rounded-2xl shadow-inner"
              >
                {visibleActions.length === 0 ? (
                  <div className="text-slate-400 text-xs font-mono text-center mt-12 select-none">
                    No user clicks or keystrokes recorded up to this point.
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {visibleActions.map((act, index) => (
                      <div key={act._id || index} className="flex items-start space-x-4 relative pl-6">
                        {/* Dot Bullet */}
                        <div className="absolute left-[9px] top-[7px] w-2 h-2 rounded-full border border-indigo-500 bg-white z-10 shrink-0"></div>

                        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex-1 text-xs font-mono flex flex-col space-y-1.5 shadow-sm hover:border-indigo-150 transition-colors">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-bold text-indigo-600 uppercase tracking-wider">{act.type} interaction</span>
                            <span className="text-slate-400">[{formatVideoTime(act.time)}]</span>
                          </div>
                          <div className="text-slate-700">
                            Target Element: <code className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px]">{act.element}</code>
                          </div>
                          {act.value && act.value !== '***' && (
                            <div className="text-slate-550 text-[10px] flex items-center mt-1">
                              <CornerDownRight size={10} className="text-slate-400 mr-1.5" />
                              <span>Entered Text: <span className="text-slate-600 italic">"{act.value}"</span></span>
                            </div>
                          )}
                          <div className="text-[9px] text-slate-400 mt-1 italic">
                            Origin path: {act.page || '/'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default SessionReplay;
