import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Terminal, Network, Shield, X, Mail, Lock, User,
  AlertCircle, RefreshCw, ArrowUpRight, Cpu, Activity,
  GitBranch, Radio
} from 'lucide-react';

/* ─────────────────────────────────────────────
   DESIGN SYSTEM
   Primary bg:   #09090b  (zinc-950)
   Surface:      #111113
   Border:       rgba(255,255,255,0.07)
   Accent cyan:  #22d3ee  (cyan-400)
   Accent amber: #fbbf24  (amber-400)
   Text:         #f4f4f5  (zinc-100)
   Muted text:   #71717a  (zinc-500)
───────────────────────────────────────────── */

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,300;1,14..32,400&family=JetBrains+Mono:wght@400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cyan:   #22d3ee;
    --amber:  #fbbf24;
    --rose:   #f87171;
    --green:  #4ade80;
    --surface:#111113;
    --border: rgba(255,255,255,0.07);
    --bg:     #09090b;
    --text:   #f4f4f5;
    --muted:  #52525b;
    --sub:    #a1a1aa;
  }

  body { background: var(--bg); }

  /* ── scroll bar ── */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }

  /* ── animations ── */
  @keyframes grain {
    0%, 100% { transform: translate(0, 0); }
    10% { transform: translate(-2%, -3%); }
    20% { transform: translate(3%, 2%); }
    30% { transform: translate(-1%, 4%); }
    40% { transform: translate(4%, -1%); }
    50% { transform: translate(-3%, 3%); }
    60% { transform: translate(2%, -4%); }
    70% { transform: translate(-4%, 1%); }
    80% { transform: translate(3%, -2%); }
    90% { transform: translate(-2%, 4%); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.93); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes cursor-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes orbit {
    from { transform: rotate(0deg) translateX(90px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(90px) rotate(-360deg); }
  }
  @keyframes orbit2 {
    from { transform: rotate(180deg) translateX(120px) rotate(-180deg); }
    to   { transform: rotate(540deg) translateX(120px) rotate(-540deg); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(34,211,238,0.35); }
    70%  { box-shadow: 0 0 0 16px rgba(34,211,238,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
  }
  @keyframes shimmer {
    from { background-position: -400px 0; }
    to   { background-position: 400px 0; }
  }
  @keyframes log-slide {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .anim-fade-up    { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-up-2  { animation: fadeUp 0.7s 0.12s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-up-3  { animation: fadeUp 0.7s 0.24s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-fade-up-4  { animation: fadeUp 0.7s 0.36s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-slide-r    { animation: slideRight 0.65s 0.1s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-scale-in   { animation: scaleIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .anim-log        { animation: log-slide 0.3s cubic-bezier(0.22,1,0.36,1) both; }

  /* ── nav ── */
  .nav {
    position: sticky;
    top: 0;
    z-index: 40;
    background: rgba(9,9,11,0.82);
    backdrop-filter: blur(18px) saturate(180%);
    border-bottom: 1px solid var(--border);
    padding: 0 2rem;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  /* ── logo ── */
  .logo-mark {
    width: 34px; height: 34px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(34,211,238,0.15), rgba(251,191,36,0.1));
    border: 1px solid rgba(34,211,238,0.25);
    display: flex; align-items: center; justify-content: center;
    color: var(--cyan);
    flex-shrink: 0;
  }
  .logo-name {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.4px;
    color: var(--text);
  }
  .logo-name span {
    background: linear-gradient(135deg, var(--cyan), var(--amber));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* ── buttons ── */
  .btn-ghost {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--sub);
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 8px;
    transition: color 0.15s, background 0.15s;
    font-family: 'Inter', sans-serif;
  }
  .btn-ghost:hover { color: var(--text); background: rgba(255,255,255,0.05); }

  .btn-primary {
    padding: 8px 20px;
    font-size: 13px;
    font-weight: 700;
    color: #09090b;
    background: var(--cyan);
    border: none;
    border-radius: 9px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.2px;
    box-shadow: 0 0 0 0 rgba(34,211,238,0.4);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px -4px rgba(34,211,238,0.35);
  }
  .btn-primary:active { transform: translateY(0) scale(0.98); }

  .btn-outline {
    padding: 10px 24px;
    font-size: 14px;
    font-weight: 600;
    color: var(--sub);
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-outline:hover {
    color: var(--text);
    border-color: rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.04);
  }

  .btn-cta {
    padding: 13px 32px;
    font-size: 15px;
    font-weight: 700;
    color: #09090b;
    background: linear-gradient(135deg, var(--cyan) 0%, #06b6d4 100%);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    font-family: 'Inter', sans-serif;
    letter-spacing: -0.3px;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 40px -8px rgba(34,211,238,0.4);
  }
  .btn-cta:active { transform: translateY(0) scale(0.98); }

  /* ── cards ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
  }
  .card:hover {
    border-color: rgba(34,211,238,0.2);
    box-shadow: 0 0 0 1px rgba(34,211,238,0.05), 0 20px 40px -16px rgba(0,0,0,0.6);
    transform: translateY(-2px);
  }

  /* ── badge ── */
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid;
  }
  .badge-cyan {
    background: rgba(34,211,238,0.08);
    border-color: rgba(34,211,238,0.2);
    color: var(--cyan);
  }
  .badge-amber {
    background: rgba(251,191,36,0.08);
    border-color: rgba(251,191,36,0.2);
    color: var(--amber);
  }

  /* ── noise overlay ── */
  .noise::after {
    content: '';
    position: fixed; inset: -200%;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-size: 200px 200px;
    opacity: 0.018;
    pointer-events: none;
    z-index: 999;
    animation: grain 8s steps(10) infinite;
  }

  /* ── hero code block ── */
  .code-block {
    background: #0d0d0f;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    overflow: hidden;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    line-height: 1.7;
    box-shadow: 0 32px 80px -16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset;
  }
  .code-bar {
    background: #141416;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 10px 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .code-dot { width: 10px; height: 10px; border-radius: 50%; }

  /* ── feature icon ── */
  .feat-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* ── modal backdrop ── */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 50;
    background: rgba(0,0,0,0.75);
    backdrop-filter: blur(20px);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
    animation: fadeIn 0.2s ease both;
  }
  .modal-panel {
    width: 100%; max-width: 420px;
    background: #111113;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 48px 100px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04) inset;
    animation: scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
    position: relative;
  }

  /* ── form inputs ── */
  .field-wrap { position: relative; }
  .field-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: var(--muted); pointer-events: none;
  }
  .field-input {
    width: 100%;
    padding: 11px 14px 11px 42px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    font-size: 14px;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .field-input:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 3px rgba(34,211,238,0.1);
  }
  .field-input::placeholder { color: var(--muted); }

  /* ── tabs ── */
  .tab-bar {
    display: flex;
    padding: 6px;
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid var(--border);
  }
  .tab-btn {
    flex: 1; padding: 9px;
    font-size: 13px; font-weight: 600;
    font-family: 'Inter', sans-serif;
    border: none; background: transparent;
    color: var(--muted); cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
  }
  .tab-btn.active {
    background: rgba(255,255,255,0.08);
    color: var(--text);
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
  .tab-btn:not(.active):hover { color: var(--sub); }

  /* ── submit button ── */
  .submit-btn {
    width: 100%;
    padding: 12px;
    background: var(--cyan);
    color: #09090b;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    border: none; border-radius: 10px; cursor: pointer;
    transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    letter-spacing: -0.2px;
  }
  .submit-btn:hover:not(:disabled) {
    background: #38bdf8;
    box-shadow: 0 8px 24px -4px rgba(34,211,238,0.3);
    transform: translateY(-1px);
  }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── terminal log items ── */
  .log-item { animation: log-slide 0.25s cubic-bezier(0.22,1,0.36,1) both; }

  /* ── stat pill ── */
  .stat-pill {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 4px 12px;
    font-size: 11px; font-weight: 600;
    color: var(--sub);
    display: inline-flex; align-items: center; gap: 6px;
  }

  /* ── glow orb ── */
  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
  }
`;

// ─── Syntax-highlighted code lines for hero preview ────────────────────────
const CODE_LINES = [
  { tokens: [{ t: '// DebugSnap captures everything automatically', c: '#52525b' }] },
  { tokens: [] },
  { tokens: [{ t: 'const ', c: '#22d3ee' }, { t: 'session', c: '#f4f4f5' }, { t: ' = await ', c: '#a1a1aa' }, { t: 'debugsnap', c: '#fbbf24' }, { t: '.start()', c: '#f4f4f5' }] },
  { tokens: [] },
  { tokens: [{ t: 'session', c: '#f4f4f5' }, { t: '.on(', c: '#a1a1aa' }, { t: "'error'", c: '#4ade80' }, { t: ', (e) => {', c: '#a1a1aa' }] },
  { tokens: [{ t: '  report', c: '#f4f4f5' }, { t: '.push({', c: '#a1a1aa' }] },
  { tokens: [{ t: '    console', c: '#f4f4f5' }, { t: ': ', c: '#a1a1aa' }, { t: 'e.logs', c: '#22d3ee' }, { t: ',', c: '#a1a1aa' }] },
  { tokens: [{ t: '    network', c: '#f4f4f5' }, { t: ': ', c: '#a1a1aa' }, { t: 'e.requests', c: '#22d3ee' }, { t: ',', c: '#a1a1aa' }] },
  { tokens: [{ t: '    screen', c: '#f4f4f5' }, { t: ': ', c: '#a1a1aa' }, { t: 'e.recording', c: '#22d3ee' }] },
  { tokens: [{ t: '  })', c: '#a1a1aa' }] },
  { tokens: [{ t: '})', c: '#a1a1aa' }] },
  { tokens: [] },
  { tokens: [{ t: '// share a link — devs get everything they need', c: '#52525b' }] },
  { tokens: [{ t: 'const ', c: '#22d3ee' }, { t: 'link', c: '#f4f4f5' }, { t: ' = session', c: '#a1a1aa' }, { t: '.share()', c: '#fbbf24' }] },
];

// ─── Feature cards data ─────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <Terminal size={20} />,
    color: '#22d3ee',
    bg: 'rgba(34,211,238,0.08)',
    border: 'rgba(34,211,238,0.18)',
    title: 'Console Capture',
    desc: 'Every console.log, warning, and uncaught exception — timestamped and synced frame-perfect with your screen recording.',
    stat: '< 1ms overhead',
  },
  {
    icon: <Network size={20} />,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.18)',
    title: 'Network Inspector',
    desc: 'Full request/response bodies, headers, status codes, and latency for every fetch and XHR call made during the session.',
    stat: 'All XHR + fetch',
  },
  {
    icon: <Cpu size={20} />,
    color: '#a78bfa',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.18)',
    title: 'Environment Snapshot',
    desc: "OS, browser version, screen dimensions, device pixel ratio, timezone — the context devs need to actually reproduce bugs.",
    stat: '20+ data points',
  },
  {
    icon: <GitBranch size={20} />,
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.18)',
    title: 'Instant Shareable Link',
    desc: 'One link. No account needed for the recipient. Works behind corporate firewalls. Expired automatically after 30 days.',
    stat: 'No login to view',
  },
  {
    icon: <Shield size={20} />,
    color: '#fb923c',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.18)',
    title: 'Privacy Controls',
    desc: 'Mask sensitive fields before recording starts. Block specific endpoints. Full GDPR-compliant data handling out of the box.',
    stat: 'SOC 2 ready',
  },
  {
    icon: <Activity size={20} />,
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.18)',
    title: 'Live Streaming',
    desc: 'Watch sessions unfold in real time via WebSocket. Perfect for support teams debugging production issues alongside users.',
    stat: 'Real-time WebSocket',
  },
];

// ─── Main Component ─────────────────────────────────────────────────────────
export default function Intro({ defaultTab = null }) {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => { if (user) navigate('/'); }, [user, navigate]);

  // ── Auth modal state ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(!!defaultTab);
  const [authTab, setAuthTab] = useState(defaultTab === 'register' ? 'register' : 'login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (defaultTab) { setAuthTab(defaultTab === 'register' ? 'register' : 'login'); setModalOpen(true); }
  }, [defaultTab]);

  const closeModal = useCallback(() => {
    setModalOpen(false); setAuthError('');
    setLoginEmail(''); setLoginPassword('');
    setRegUsername(''); setRegEmail(''); setRegPassword('');
    navigate('/', { replace: true });
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    try { await login(loginEmail, loginPassword); closeModal(); navigate('/'); }
    catch (err) { setAuthError(err); }
    finally { setAuthLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    try { await register(regUsername, regEmail, regPassword); closeModal(); navigate('/'); }
    catch (err) { setAuthError(err); }
    finally { setAuthLoading(false); }
  };

  // ── Playground state ──────────────────────────────────────────────────────
  const terminalRef = useRef(null);
  const INITIAL_LOGS = [
    { id: 1, type: 'sys', text: 'DebugSnap v2.4.1 — session started', ts: '09:41:00' },
    { id: 2, type: 'sys', text: 'Recording http://shop.local · tab #3', ts: '09:41:00' },
    { id: 3, type: 'log', text: 'Cart initialized · items: 0', ts: '09:41:01' },
  ];
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [cartCount, setCartCount] = useState(0);
  const [checkoutState, setCheckout] = useState('idle'); // idle | pending | fail

  const addLog = useCallback((type, text) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, text, ts }]);
  }, []);

  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [logs]);

  const onAddToCart = () => {
    const n = cartCount + 1;
    setCartCount(n);
    addLog('event', `click · "Add to Cart" · item_id="pro-headphones"`);
    addLog('log', `cart.add() → totalItems: ${n}`);
  };

  const onCheckout = () => {
    if (checkoutState === 'pending') return;
    setCheckout('pending');
    addLog('event', `click · "Checkout" · items=${cartCount}`);
    addLog('net-tx', `POST /api/v2/checkout → PENDING…`);
    setTimeout(() => {
      setCheckout('fail');
      addLog('net-rx', `POST /api/v2/checkout ← 503 Service Unavailable (1247ms)`);
      addLog('error', `Unhandled rejection · PaymentGatewayError: upstream timeout`);
    }, 1300);
  };

  const onReset = () => {
    setLogs(INITIAL_LOGS); setCartCount(0); setCheckout('idle');
  };

  // ── Log row config ────────────────────────────────────────────────────────
  const logMeta = (type) => {
    if (type === 'error') return { label: 'ERR', color: '#f87171', dim: 'rgba(248,113,113,0.1)' };
    if (type === 'net-rx') return { label: 'NET←', color: '#f87171', dim: 'rgba(248,113,113,0.07)' };
    if (type === 'net-tx') return { label: 'NET→', color: '#fbbf24', dim: 'rgba(251,191,36,0.07)' };
    if (type === 'event') return { label: 'EVT', color: '#a78bfa', dim: 'rgba(167,139,250,0.07)' };
    if (type === 'sys') return { label: 'SYS', color: '#22d3ee', dim: 'rgba(34,211,238,0.07)' };
    return { label: 'LOG', color: '#71717a', dim: 'transparent' };
  };

  return (
    <>
      <style>{STYLES}</style>

      <div className="noise" style={{ fontFamily: "'Inter', system-ui, sans-serif", color: '#f4f4f5', background: '#09090b', minHeight: '100vh', overflowX: 'hidden' }}>

        {/* background orbs */}
        <div className="orb" style={{ width: 600, height: 600, top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)' }} />
        <div className="orb" style={{ width: 500, height: 500, bottom: '10%', right: '-10%', background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 70%)' }} />

        {/* ══════════════════════ NAV ══════════════════════ */}
        <nav className="nav">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-mark">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                <polygon points="11,10.5 14,12 11,13.5" fill="currentColor" />
              </svg>
            </div>
            <span className="logo-name">Debug<span>Snap</span></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button className="btn-ghost" onClick={() => { setAuthTab('login'); setModalOpen(true); }}>Sign in</button>
            <button className="btn-primary" onClick={() => { setAuthTab('register'); setModalOpen(true); }}>
              Get started
            </button>
          </div>
        </nav>

        {/* ══════════════════════ HERO ══════════════════════ */}
        <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px 120px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

          {/* ── Left: Copy ── */}
          <div>
            <div className="anim-fade-up" style={{ marginBottom: 24 }}>
              <span className="badge badge-cyan">
                <Radio size={10} />
                Now with live session streaming
              </span>
            </div>

            <h1 className="anim-fade-up-2" style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', color: '#f4f4f5', marginBottom: 20 }}>
              Stop explaining bugs.<br />
              <span style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Show them.
              </span>
            </h1>

            <p className="anim-fade-up-3" style={{ fontSize: 16, lineHeight: 1.7, color: '#71717a', maxWidth: 420, marginBottom: 36 }}>
              DebugSnap records screen, console, and network traffic together. Share one link — developers see exactly what broke, and why.
            </p>

            <div className="anim-fade-up-4" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn-cta" onClick={() => { setAuthTab('register'); setModalOpen(true); }}>
                Start for free
                <ArrowUpRight size={16} />
              </button>
              <button className="btn-outline" onClick={() => document.getElementById('playground')?.scrollIntoView({ behavior: 'smooth' })}>
                See it live
              </button>
            </div>

            <div className="anim-fade-up-4" style={{ marginTop: 40, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['Zero config setup', 'Works with any framework', 'No SDK required'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#52525b', fontWeight: 500 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', flexShrink: 0 }} />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Code preview ── */}
          <div className="anim-slide-r" style={{ position: 'relative' }}>
            {/* floating stat pills */}
            <div style={{ position: 'absolute', top: -16, right: -8, zIndex: 2 }}>
              <div className="stat-pill">
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse-ring 2s infinite' }} />
                Live session active
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: -41, zIndex: 2 }}>
              <div className="stat-pill">
                <span style={{ color: '#f87171', fontWeight: 700 }}>2</span> errors captured
              </div>
            </div>

            <div className="code-block">
              <div className="code-bar">
                <div className="code-dot" style={{ background: '#f87171' }} />
                <div className="code-dot" style={{ background: '#fbbf24' }} />
                <div className="code-dot" style={{ background: '#4ade80' }} />
                <span style={{ marginLeft: 8, color: '#3f3f46', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>session.js — DebugSnap</span>
              </div>
              <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {CODE_LINES.map((line, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ width: 28, color: '#3f3f46', fontSize: 11, userSelect: 'none', flexShrink: 0, textAlign: 'right', paddingRight: 16 }}>{i + 1}</span>
                    <span>
                      {line.tokens.map((tok, j) => (
                        <span key={j} style={{ color: tok.c }}>{tok.t}</span>
                      ))}
                      {i === 13 && (
                        <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#22d3ee', marginLeft: 1, verticalAlign: 'text-bottom', animation: 'cursor-blink 1.1s step-end infinite' }} />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════ PLAYGROUND ══════════════════════ */}
        <section id="playground" style={{ maxWidth: 1100, margin: '0 auto 120px', padding: '0 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ marginBottom: 12 }}>
              <span className="badge badge-amber">Interactive demo</span>
            </div>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1.2px', color: '#f4f4f5', marginBottom: 12 }}>
              Break something. Watch it get captured.
            </h2>
            <p style={{ fontSize: 15, color: '#52525b', maxWidth: 420, margin: '0 auto' }}>
              Click the buttons in the mock app on the left — see DebugSnap log every detail on the right.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: 20 }}>

            {/* ── Mock App ── */}
            <div style={{ background: '#0d0d10', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 440 }}>
              {/* browser chrome */}
              <div style={{ background: '#141416', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['#f87171', '#fbbf24', '#4ade80'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.4 }} />)}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 12px', fontSize: 11, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>
                  shop.local/product/pro-headphones
                </div>
              </div>

              <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* product card */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, marginBottom: 20, flex: 1 }}>
                  <div style={{ width: '100%', height: 120, background: 'linear-gradient(135deg, rgba(34,211,238,0.07), rgba(251,191,36,0.05))', borderRadius: 8, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 36 }}>🎧</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#d4d4d8', marginBottom: 4 }}>Pro Noise-Cancelling Headphones</div>
                  <div style={{ fontSize: 11, color: '#52525b', marginBottom: 12 }}>SKU: PRO-NC-X1 · In stock</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>$349.00</span>
                    {cartCount > 0 && (
                      <span style={{ fontSize: 11, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee', padding: '2px 10px', borderRadius: 99, fontWeight: 600 }}>
                        {cartCount} in cart
                      </span>
                    )}
                  </div>
                </div>

                {/* action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={onAddToCart}
                    style={{ padding: '10px 0', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', color: '#22d3ee', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,211,238,0.16)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,211,238,0.1)'}
                  >
                    + Add to Cart
                  </button>
                  <button
                    onClick={onCheckout}
                    disabled={checkoutState === 'pending' || cartCount === 0}
                    style={{
                      padding: '10px 0',
                      background: checkoutState === 'fail' ? 'rgba(248,113,113,0.1)' : checkoutState === 'pending' ? 'rgba(255,255,255,0.04)' : 'rgba(251,191,36,0.1)',
                      border: `1px solid ${checkoutState === 'fail' ? 'rgba(248,113,113,0.25)' : checkoutState === 'pending' ? 'rgba(255,255,255,0.08)' : 'rgba(251,191,36,0.25)'}`,
                      color: checkoutState === 'fail' ? '#f87171' : checkoutState === 'pending' ? '#52525b' : '#fbbf24',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: checkoutState === 'pending' || cartCount === 0 ? 'not-allowed' : 'pointer',
                      fontFamily: "'Inter', sans-serif",
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}
                  >
                    {checkoutState === 'pending' ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</> :
                      checkoutState === 'fail' ? '⚠ Checkout Failed (simulated)' :
                        cartCount === 0 ? 'Add items first' : 'Checkout — will trigger 503'}
                  </button>
                  <button
                    onClick={onReset}
                    style={{ padding: '6px 0', background: 'transparent', border: 'none', color: '#3f3f46', fontSize: 11, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#71717a'}
                    onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}
                  >
                    ↺ Reset demo
                  </button>
                </div>
              </div>
            </div>

            {/* ── DebugSnap Console ── */}
            <div style={{ background: '#0a0a0c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 440 }}>
              {/* console header */}
              <div style={{ background: '#0f0f11', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', animation: logs.some(l => l.type === 'error') ? 'pulse-ring 1.5s infinite' : 'none' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#d4d4d8', fontFamily: "'JetBrains Mono', monospace" }}>DebugSnap Console</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>clicks: <strong style={{ color: '#a1a1aa' }}>{logs.filter(l => l.type === 'event').length}</strong></span>
                  <span>errors: <strong style={{ color: logs.some(l => l.type === 'error') ? '#f87171' : '#a1a1aa' }}>{logs.filter(l => l.type === 'error').length}</strong></span>
                </div>
              </div>

              {/* log stream */}
              <div ref={terminalRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.6 }}>
                {logs.map((log) => {
                  const m = logMeta(log.type);
                  return (
                    <div key={log.id} className="log-item" style={{ display: 'flex', gap: 10, padding: '3px 16px', background: m.dim, borderLeft: log.type === 'error' || log.type === 'net-rx' ? `2px solid ${m.color}30` : '2px solid transparent' }}>
                      <span style={{ color: '#3f3f46', flexShrink: 0, userSelect: 'none' }}>{log.ts}</span>
                      <span style={{ background: `${m.color}18`, color: m.color, padding: '0 5px', borderRadius: 4, fontSize: 10, fontWeight: 700, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{m.label}</span>
                      <span style={{ color: log.type === 'error' ? '#fca5a5' : log.type === 'net-rx' ? '#fca5a5' : log.type === 'net-tx' ? '#fde68a' : log.type === 'event' ? '#c4b5fd' : log.type === 'sys' ? '#67e8f9' : '#71717a', wordBreak: 'break-all' }}>{log.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* footer status */}
              <div style={{ background: '#0f0f11', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#3f3f46', fontFamily: "'JetBrains Mono', monospace" }}>{logs.length} events recorded</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#22d3ee', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', animation: 'cursor-blink 1.5s step-end infinite' }} />
                  recording
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════ FEATURES ══════════════════════ */}
        <section style={{ maxWidth: 1100, margin: '0 auto 120px', padding: '0 32px' }}>
          <div style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1.2px', color: '#f4f4f5', marginBottom: 12 }}>
              Built for how developers<br />actually debug.
            </h2>
            <p style={{ fontSize: 15, color: '#52525b', maxWidth: 380 }}>
              Not just a screen recorder. Every piece of context you'd normally have to ask for, automatic.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: '32px 28px',
                  background: '#0d0d10',
                  borderRight: (i + 1) % 3 !== 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition: 'background 0.2s',
                  cursor: 'default',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#111113'}
                onMouseLeave={e => e.currentTarget.style.background = '#0d0d10'}
              >
                <div className="feat-icon" style={{ background: f.bg, border: `1px solid ${f.border}`, color: f.color, marginBottom: 20 }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#52525b', lineHeight: 1.65, marginBottom: 16 }}>{f.desc}</div>
                <div style={{ fontSize: 11, color: f.color, fontWeight: 600, background: f.bg, border: `1px solid ${f.border}`, padding: '2px 10px', borderRadius: 99, display: 'inline-block' }}>
                  {f.stat}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════ CTA BAND ══════════════════════ */}
        <section style={{ maxWidth: 1100, margin: '0 auto 100px', padding: '0 32px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(251,191,36,0.04) 100%)', border: '1px solid rgba(34,211,238,0.12)', borderRadius: 20, padding: '64px 56px', position: 'relative', overflow: 'hidden' }}>
            <div className="orb" style={{ width: 400, height: 400, top: '-50%', left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-1px', color: '#f4f4f5', marginBottom: 10 }}>
                  Two minutes from sign up to first bug report.
                </h2>
                <p style={{ fontSize: 14, color: '#52525b', maxWidth: 380 }}>
                  Install the Chrome extension, paste your token, and every bug you hit is automatically packaged for your dev team.
                </p>
              </div>
              <button className="btn-cta" onClick={() => { setAuthTab('register'); setModalOpen(true); }} style={{ flexShrink: 0 }}>
                Create free account
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════ FOOTER ══════════════════════ */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '40px 32px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-mark" style={{ width: 26, height: 26, borderRadius: 7 }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <path d="M5 3H3v2M21 3h-2v2M3 19v2h2M19 21h2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                  <polygon points="11,10.5 14,12 11,13.5" fill="currentColor" />
                </svg>
              </div>
              <span style={{ fontSize: 13, color: '#3f3f46' }}>© {new Date().getFullYear()} DebugSnap, Inc.</span>
            </div>
            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#3f3f46' }}>
              {['Privacy', 'Terms', 'Docs', 'Status'].map(l => (
                <a key={l} href="#" style={{ color: '#3f3f46', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#a1a1aa'}
                  onMouseLeave={e => e.currentTarget.style.color = '#3f3f46'}>{l}</a>
              ))}
            </div>
          </div>
        </footer>

        {/* ══════════════════════ AUTH MODAL ══════════════════════ */}
        {modalOpen && (
          <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal-panel">

              {/* top accent */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent 0%, #22d3ee 40%, #fbbf24 70%, transparent 100%)' }} />

              {/* close */}
              <button
                onClick={closeModal}
                style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#52525b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', zIndex: 2 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f4f4f5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#52525b'; }}
              >
                <X size={14} />
              </button>

              {/* tabs */}
              <div className="tab-bar">
                <button className={`tab-btn${authTab === 'login' ? ' active' : ''}`} onClick={() => { setAuthTab('login'); setAuthError(''); }}>Sign in</button>
                <button className={`tab-btn${authTab === 'register' ? ' active' : ''}`} onClick={() => { setAuthTab('register'); setAuthError(''); }}>Create account</button>
              </div>

              <div style={{ padding: '28px 28px 24px' }}>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: '#f4f4f5', marginBottom: 4 }}>
                    {authTab === 'login' ? 'Welcome back' : 'Get started free'}
                  </h3>
                  <p style={{ fontSize: 13, color: '#52525b' }}>
                    {authTab === 'login' ? 'Enter your credentials to continue' : 'No credit card required'}
                  </p>
                </div>

                {authError && (
                  <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertCircle size={14} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: '#fca5a5' }}>{authError}</span>
                  </div>
                )}

                {authTab === 'login' ? (
                  <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6, letterSpacing: '0.02em' }}>Email</label>
                      <div className="field-wrap">
                        <Mail size={15} className="field-icon" />
                        <input className="field-input" type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@company.com" />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6 }}>Password</label>
                      <div className="field-wrap">
                        <Lock size={15} className="field-icon" />
                        <input className="field-input" type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" />
                      </div>
                    </div>
                    <button type="submit" className="submit-btn" disabled={authLoading} style={{ marginTop: 6 }}>
                      {authLoading ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing in…</> : 'Sign in →'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6 }}>Username</label>
                      <div className="field-wrap">
                        <User size={15} className="field-icon" />
                        <input className="field-input" type="text" required value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="yourname" />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6 }}>Email</label>
                      <div className="field-wrap">
                        <Mail size={15} className="field-icon" />
                        <input className="field-input" type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="you@company.com" />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#71717a', marginBottom: 6 }}>Password</label>
                      <div className="field-wrap">
                        <Lock size={15} className="field-icon" />
                        <input className="field-input" type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="min. 8 characters" />
                      </div>
                    </div>
                    <button type="submit" className="submit-btn" disabled={authLoading} style={{ marginTop: 6 }}>
                      {authLoading ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Creating account…</> : 'Create account →'}
                    </button>
                  </form>
                )}

                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 12, color: '#3f3f46' }}>
                  By continuing you agree to our <a href="#" style={{ color: '#52525b', textDecoration: 'underline', textUnderlineOffset: 2 }}>Terms</a> and <a href="#" style={{ color: '#52525b', textDecoration: 'underline', textUnderlineOffset: 2 }}>Privacy Policy</a>.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
