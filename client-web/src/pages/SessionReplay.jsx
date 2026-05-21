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
  Clock,
  Search,
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';

const ConsoleArg = ({ arg, isTopLevel = false }) => {
  const [expanded, setExpanded] = useState(false);

  if (!arg) return <span className="text-slate-500 font-mono">null</span>;

  const { type, value } = arg;

  if (type === 'null') {
    return <span className="text-slate-500 font-mono">null</span>;
  }
  if (type === 'undefined') {
    return <span className="text-slate-500 font-mono">undefined</span>;
  }
  if (type === 'number') {
    return <span className="text-sky-400 font-mono font-medium">{String(value)}</span>;
  }
  if (type === 'boolean') {
    return <span className="text-violet-400 font-mono font-medium">{String(value)}</span>;
  }
  if (type === 'string') {
    return isTopLevel ? (
      <span className="text-slate-200 font-mono whitespace-pre-wrap">{String(value)}</span>
    ) : (
      <span className="text-amber-300 font-mono">"{String(value)}"</span>
    );
  }
  if (type === 'error') {
    return (
      <div className="text-rose-400 font-mono text-xs whitespace-pre-wrap">
        <div>{value}</div>
        {arg.stack && (
          <pre className="text-[10px] text-rose-500/80 mt-1.5 pl-3 border-l border-rose-950/60 overflow-x-auto leading-relaxed select-text">
            {arg.stack}
          </pre>
        )}
      </div>
    );
  }

  // Handle Arrays
  if (type === 'array') {
    const items = Array.isArray(value) ? value : [];

    const renderPreview = () => {
      const previews = items.slice(0, 4).map((item, idx) => (
        <ConsoleArg key={idx} arg={item} isTopLevel={false} />
      ));
      return (
        <span className="text-slate-400 font-mono cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => setExpanded(!expanded)}>
          <span className="text-[10px] text-slate-500 mr-1.5">{expanded ? '▼' : '▶'}</span>
          <span className="text-indigo-400/90 font-semibold">Array({items.length})</span> [
          {previews.reduce((acc, x, i) => i === 0 ? [x] : [...acc, <span key={`c-${i}`} className="text-slate-600">, </span>, x], [])}
          {items.length > 4 && <span className="text-slate-500">, ...</span>}
          ]
        </span>
      );
    };

    return (
      <div className="font-mono">
        {renderPreview()}
        {expanded && (
          <div className="pl-5 border-l border-slate-800/85 mt-1.5 space-y-1">
            {items.map((item, index) => (
              <div key={index} className="flex items-start text-xs">
                <span className="text-slate-500 mr-2 select-none shrink-0">{index}:</span>
                <ConsoleArg arg={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle Objects
  if (type === 'object') {
    const keys = value ? Object.keys(value) : [];

    const renderPreview = () => {
      const previews = keys.slice(0, 3).map((key) => (
        <span key={key} className="inline-flex items-center">
          <span className="text-indigo-400 mr-1">{key}</span>: <ConsoleArg arg={value[key]} />
        </span>
      ));
      return (
        <span className="text-slate-400 font-mono cursor-pointer select-none hover:text-slate-300 transition-colors" onClick={() => setExpanded(!expanded)}>
          <span className="text-[10px] text-slate-500 mr-1.5">{expanded ? '▼' : '▶'}</span>
          <span className="text-indigo-400/90 font-semibold">Object</span> {'{'}
          {previews.reduce((acc, x, i) => i === 0 ? [x] : [...acc, <span key={`c-${i}`} className="text-slate-600">, </span>, x], [])}
          {keys.length > 3 && <span className="text-slate-500">, ...</span>}
          {'}'}
        </span>
      );
    };

    return (
      <div className="font-mono">
        {renderPreview()}
        {expanded && (
          <div className="pl-5 border-l border-slate-800/85 mt-1.5 space-y-1">
            {keys.map((key) => (
              <div key={key} className="flex items-start text-xs">
                <span className="text-indigo-400 mr-2 select-none shrink-0">{key}:</span>
                <ConsoleArg arg={value[key]} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return <span className="text-slate-200 font-mono">{String(value || arg)}</span>;
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

  // Helper to safely display JSON payloads
  const renderJSONPayload = (val) => {
    if (!val) return <span className="text-slate-500 italic text-[11px]">Empty</span>;
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return <pre className="text-[11px] text-indigo-300 font-mono overflow-x-auto p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 break-all whitespace-pre-wrap leading-relaxed">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      return <pre className="text-[11px] text-slate-300 font-mono overflow-x-auto p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 break-all whitespace-pre-wrap leading-relaxed">{String(val)}</pre>;
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
      <div className="min-h-screen bg-[#0b0f19] text-slate-300 flex flex-col justify-center items-center font-sans space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <span className="text-sm font-semibold tracking-wider uppercase text-slate-400">Loading session replay data...</span>
      </div>
    );
  }

  if (!data || !data.session) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-300 flex flex-col justify-center items-center font-sans space-y-6">
        <div className="p-4.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
          <AlertTriangle size={32} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-1">Session Not Found</h2>
          <p className="text-slate-400 text-sm">The requested bug report link may have expired or been deleted.</p>
        </div>
        <Link to="/" className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col h-screen overflow-hidden font-sans relative">

      {/* Sleek Top Control Bar */}
      <header className="glass-panel px-6 py-4.5 flex justify-between items-center shrink-0 shadow-xl border-b border-slate-800/80 z-20">
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800" title="Back to dashboard">
            <ArrowLeft size={16} />
          </Link>

          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <BugPlay size={20} className="text-indigo-400" />
              <h1 className="text-sm font-bold text-white tracking-tight">{session.title}</h1>
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
            className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg"
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
      <div className="flex-1 flex min-h-0 bg-[#0b0f19] z-10">

        {/* Left Panel: Video Replay Frame */}
        <div className="w-1/2 p-6 flex flex-col min-h-0 justify-between select-none">
          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">

            {/* Player header banner */}
            <div className="bg-slate-900/60 px-5 py-3 border-b border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
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
            <div className="flex-1 bg-slate-950 relative flex items-center justify-center">
              <video
                ref={videoRef}
                src={session.videoUrl}
                controls
                onTimeUpdate={handleTimeUpdate}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Synchronized HUD Time overlay */}
            <div className="absolute top-14 right-4 bg-slate-950/90 border border-slate-800/80 px-3 py-1.5 rounded-xl font-mono text-xs text-indigo-400 font-bold shadow-lg shadow-black/40">
              HUD Tracker: {formatVideoTime(currentTime)}
            </div>
          </div>

          {/* User Environment Specifications Info Card */}
          {session.browserInfo && (
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 shadow-lg mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/15">
                  <Laptop size={16} />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Environment Info</h4>
                  <p className="text-xs font-semibold text-white mt-0.5">{session.browserInfo.os || 'OS'} Client Device</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                  <Cpu size={12} className="text-indigo-400" />
                  <span>Browser: <span className="text-slate-200 font-semibold">{session.browserInfo.browser || 'N/A'}</span></span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
                  <Monitor size={12} className="text-indigo-400" />
                  <span>Screen: <span className="text-slate-200 font-semibold">{session.browserInfo.screen || 'N/A'}</span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Integrated Web DevTools */}
        <div className="w-1/2 flex flex-col min-h-0 border-l border-slate-900 bg-slate-950/30">

          {/* Glassmorphic Tabs Select header */}
          <div className="bg-slate-950/80 border-b border-slate-800/80 flex items-center px-4 shrink-0 justify-between">
            <div className="flex items-center space-x-1 py-2">
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
                    className={`flex items-center space-x-2 text-xs font-bold px-4 py-2.5 rounded-xl transition-all ${isActive
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isActive ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500'}`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-wider select-none pr-2 font-mono">
              Live Console sync
            </div>
          </div>

          {/* Active Tab Panel Frame */}
          <div className="flex-1 flex flex-col min-h-0 p-5">

            {/* CONSOLE LOGGER PANEL */}
            {activeTab === 'console' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
                {/* Search / Filter logs */}
                <div className="bg-slate-950/60 px-4 py-2.5 border-b border-slate-800/60 flex items-center relative">
                  <Search size={12} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Filter console list messages..."
                    value={consoleFilter}
                    onChange={(e) => setConsoleFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/50"
                  />
                </div>
                {/* Scrolling logger body */}
                <div
                  ref={consoleContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-slate-950/20"
                >
                  {visibleLogs.length === 0 ? (
                    <div className="text-slate-600 text-xs font-mono text-center mt-12 py-6">
                      {consoleFilter ? 'No matching logs found.' : 'No console messages output up to this timestamp.'}
                    </div>
                  ) : (
                    visibleLogs.map((log, index) => {
                      const isErr = log.type === 'error';
                      const isWarn = log.type === 'warn';
                      return (
                        <div
                          key={log._id || index}
                          className={`font-mono text-xs p-3 rounded-xl border leading-relaxed flex items-start space-x-3 ${isErr
                              ? 'bg-rose-500/5 border-rose-500/10 text-rose-300'
                              : isWarn
                                ? 'bg-amber-500/5 border-amber-500/10 text-amber-300'
                                : 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                            }`}
                        >
                          <span className="text-slate-500 shrink-0 select-none text-[10px] mt-0.5">[{formatVideoTime(log.time)}]</span>
                          <span className={`font-bold shrink-0 select-none text-[9px] uppercase px-1.5 py-0.5 rounded ${isErr ? 'bg-rose-500/10 text-rose-400' : isWarn ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-400'
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
              <div className="flex-1 flex min-h-0 bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner relative">

                {/* Left pane: Requests list */}
                <div className={`flex-1 flex flex-col min-h-0 ${selectedNetworkReq ? 'hidden md:flex md:max-w-xs border-r border-slate-800' : ''}`}>
                  <div className="bg-slate-950/60 px-4 py-2.5 border-b border-slate-800 flex items-center relative">
                    <Search size={12} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Filter API paths..."
                      value={networkFilter}
                      onChange={(e) => setNetworkFilter(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div
                    ref={networkContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950/20 divide-y divide-slate-800/40"
                  >
                    {visibleNetwork.length === 0 ? (
                      <div className="text-slate-600 text-xs font-mono text-center mt-12">
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
                            className={`w-full text-left p-3.5 flex flex-col space-y-2 transition-all text-xs font-mono border-l-3 ${isSelected
                                ? 'bg-indigo-500/5 border-indigo-500 text-indigo-300'
                                : 'hover:bg-slate-800/35 border-transparent text-slate-300'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`font-extrabold ${req.method === 'POST' ? 'text-emerald-400' : 'text-sky-400'}`}>
                                  {req.method}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isSuccess ? 'bg-emerald-500/10 text-emerald-400' : isErr ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                  {req.status === 0 ? 'FAIL' : req.status}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-500 font-semibold">[{formatVideoTime(req.time)}]</span>
                            </div>
                            <div className="truncate text-slate-400 text-[11px]" title={req.url}>
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
                  <div className="flex-1 flex flex-col min-h-0 bg-slate-950/60 animate-in fade-in slide-in-from-right-4 duration-200">
                    {/* Drawer top details toolbar */}
                    <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-850 flex items-center justify-between shrink-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold font-mono ${selectedNetworkReq.method === 'POST' ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {selectedNetworkReq.method}
                        </span>
                        <span className="text-[11px] text-slate-300 font-mono truncate max-w-xs" title={selectedNetworkReq.url}>
                          {selectedNetworkReq.url.replace(/^https?:\/\/[^/]+/, '') || selectedNetworkReq.url}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedNetworkReq(null)}
                        className="text-slate-400 hover:text-white px-2.5 py-1 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-[10px] font-semibold border border-slate-800 transition-colors"
                      >
                        Close
                      </button>
                    </div>

                    {/* Stats and Payloads */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">

                      {/* Meta information tags */}
                      <div className="grid grid-cols-3 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center font-mono select-text">
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Status</div>
                          <div className={`text-xs font-bold ${selectedNetworkReq.status >= 200 && selectedNetworkReq.status < 300 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {selectedNetworkReq.status || 'Failed'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Latency</div>
                          <div className="text-xs font-bold text-slate-300">{selectedNetworkReq.duration ? `${selectedNetworkReq.duration}ms` : 'N/A'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Offset</div>
                          <div className="text-xs font-bold text-slate-300">{formatVideoTime(selectedNetworkReq.time)}</div>
                        </div>
                      </div>

                      {/* Request Headers */}
                      {selectedNetworkReq.requestHeaders && Object.keys(selectedNetworkReq.requestHeaders).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <FileCode size={11} className="text-indigo-400" />
                            <span>Request Headers</span>
                          </div>
                          <div>{renderJSONPayload(selectedNetworkReq.requestHeaders)}</div>
                        </div>
                      )}

                      {/* Request Body Payload */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <FileCode size={11} className="text-indigo-400" />
                          <span>Request Payload Body</span>
                        </div>
                        <div>{renderJSONPayload(selectedNetworkReq.requestBody)}</div>
                      </div>

                      {/* Response Headers */}
                      {selectedNetworkReq.responseHeaders && Object.keys(selectedNetworkReq.responseHeaders).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <Server size={11} className="text-indigo-400" />
                            <span>Response Headers</span>
                          </div>
                          <div>{renderJSONPayload(selectedNetworkReq.responseHeaders)}</div>
                        </div>
                      )}

                      {/* Response Body Payload */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <Server size={11} className="text-indigo-400" />
                          <span>Response Payload Body</span>
                        </div>
                        <div>{renderJSONPayload(selectedNetworkReq.responseBody)}</div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="hidden md:flex flex-1 items-center justify-center text-slate-500 text-xs font-mono p-6 text-center select-none">
                    <div className="space-y-2">
                      <Info size={20} className="mx-auto text-slate-600" />
                      <p>Select any network API request to inspect headers and body payloads.</p>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ACTIONS PANEL */}
            {activeTab === 'actions' && (
              <div
                ref={actionsContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-slate-900 border border-slate-800/80 rounded-2xl shadow-inner"
              >
                {visibleActions.length === 0 ? (
                  <div className="text-slate-600 text-xs font-mono text-center mt-12 select-none">
                    No user clicks or keystrokes recorded up to this point.
                  </div>
                ) : (
                  <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {visibleActions.map((act, index) => (
                      <div key={act._id || index} className="flex items-start space-x-4 relative pl-6">
                        {/* Dot Bullet */}
                        <div className="absolute left-[9px] top-[7px] w-2 h-2 rounded-full border border-indigo-500 bg-[#0b0f19] z-10 shrink-0"></div>

                        <div className="bg-slate-950/50 border border-slate-800/80 p-3.5 rounded-xl flex-1 text-xs font-mono flex flex-col space-y-1.5 shadow-sm hover:border-indigo-500/25 transition-colors">
                          <div className="flex justify-between items-center text-[9px]">
                            <span className="font-bold text-indigo-400 uppercase tracking-wider">{act.type} interaction</span>
                            <span className="text-slate-500">[{formatVideoTime(act.time)}]</span>
                          </div>
                          <div className="text-slate-300">
                            Target Element: <code className="text-indigo-300 bg-indigo-950/20 px-2 py-0.5 rounded border border-indigo-950/40 text-[10px]">{act.element}</code>
                          </div>
                          {act.value && act.value !== '***' && (
                            <div className="text-slate-400 text-[10px] flex items-center mt-1">
                              <CornerDownRight size={10} className="text-slate-600 mr-1.5" />
                              <span>Entered Text: <span className="text-slate-300 italic">"{act.value}"</span></span>
                            </div>
                          )}
                          <div className="text-[9px] text-slate-500 mt-1 italic">
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
