import { useEffect, useRef } from 'react';
import { MousePointer2, CornerDownRight } from 'lucide-react';

const DT = {
  accent:   '#22d3ee',
  border:   'rgba(255, 255, 255, 0.06)',
  textDim:  '#8e8e93',
  textSub:  '#d4d4d8',
  text:     '#f4f4f5',
  green:    '#4ade80',
  orange:   '#fb923c',
};

const ActionsPanel = ({ actions, currentTime, activeActIndex }) => {
  const actionsContainerRef = useRef(null);
  const activeActRef = useRef(null);

  const formatTime = (ms) => {
    if (!ms || isNaN(ms) || !isFinite(ms)) return "00:00.0";
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const t = Math.floor((ms % 1000) / 100);
    return `${m}:${sec}.${t}`;
  };

  // Scroll active item into view inside component
  useEffect(() => {
    if (activeActRef.current) {
      activeActRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeActIndex]);

  const animSuffix = (currentTime % 2000 > 1000) ? '2' : '1';

  return (
    <div ref={actionsContainerRef} className="cyber-scroll" style={{ flex: 1, overflowY: 'auto', background: 'transparent' }}>
      {actions.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: DT.textDim, gap: 8 }}>
          <MousePointer2 size={18} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: 11, fontFamily: 'monospace' }}>No user interactions captured.</span>
        </div>
      ) : (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {actions.map((act, i) => {
            const isActive = i === activeActIndex;
            return (
              <div 
                key={act._id || i} 
                ref={isActive ? activeActRef : null}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, transition: 'all 0.3s ease' }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 12, background: isActive ? DT.orange : DT.textDim, boxShadow: isActive ? `0 0 6px ${DT.orange}` : 'none' }} />
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: isActive ? `1px solid rgba(251,146,60,0.2)` : `1px solid ${DT.border}`, borderRadius: 8, padding: '8px 12px', transition: 'all 0.25s', animation: isActive ? `hlFlashAction${animSuffix} 1.5s ease-out forwards` : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? DT.orange : DT.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'JetBrains Mono', monospace" }}>
                      {act.type}
                    </span>
                    <span style={{ fontSize: 9, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{formatTime(act.time)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: DT.textSub }}>
                    <span style={{ color: DT.textDim }}>Target: </span>
                    <code style={{ fontSize: 10, color: DT.accent, background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.1)', padding: '1px 5px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {act.element}
                    </code>
                  </div>
                  {act.value && act.value !== '***' && (
                    <div style={{ fontSize: 10, color: DT.textDim, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CornerDownRight size={8} />
                      Input: <span style={{ color: DT.green }}>"{act.value}"</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActionsPanel;
