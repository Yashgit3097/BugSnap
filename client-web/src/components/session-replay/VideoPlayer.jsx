import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

const DT = {
  accent:   '#22d3ee',
  border:   'rgba(255, 255, 255, 0.06)',
  textSub:  '#d4d4d8',
  textDim:  '#8e8e93',
  text:     '#f4f4f5'
};

const VideoPlayer = ({ session, currentTime, setCurrentTime, duration, setDuration, videoRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const mouseTimeoutRef = useRef(null);

  const formatTime = (ms) => {
    if (!ms || isNaN(ms) || !isFinite(ms)) return "00:00.0";
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const t = Math.floor((ms % 1000) / 100);
    return `${m}:${sec}.${t}`;
  };

  const updateDuration = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      if (d && !isNaN(d) && isFinite(d) && d > 0) {
        setDuration(d);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime * 1000);
      const d = videoRef.current.duration;
      if (d && !isNaN(d) && isFinite(d) && d > 0 && d !== duration) {
        setDuration(d);
      }
    }
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const d = duration || videoRef.current?.duration;
    if (videoRef.current && d && !isNaN(d) && isFinite(d)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = pos * d;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime * 1000);
      
      if (videoRef.current.ended) {
        videoRef.current.pause();
      }
    }
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    if (!document.fullscreenElement) {
      videoRef.current?.parentElement?.parentElement?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      if (isCurrentlyFullscreen) {
        setShowFullscreenControls(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleMouseMove = () => {
    if (!isFullscreen) return;
    setShowFullscreenControls(true);
    if (mouseTimeoutRef.current) {
      clearTimeout(mouseTimeoutRef.current);
    }
    mouseTimeoutRef.current = setTimeout(() => {
      setShowFullscreenControls(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (mouseTimeoutRef.current) clearTimeout(mouseTimeoutRef.current);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / 1000 / duration) * 100 : 0;

  const controlsStyle = isFullscreen ? {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    background: 'rgba(5, 5, 8, 0.75)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: '14px 20px',
    opacity: showFullscreenControls ? 1 : 0,
    pointerEvents: showFullscreenControls ? 'auto' : 'none',
    transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: showFullscreenControls ? 'translateY(0)' : 'translateY(12px)',
    zIndex: 30,
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(6, 182, 212, 0.05)'
  } : {
    background: 'rgba(9, 9, 11, 0.95)',
    borderTop: `1px solid ${DT.border}`,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flexShrink: 0
  };

  return (
    <div 
      className="cyber-glass" 
      style={{ width: '45%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justify: 'space-between', borderBottom: `1px solid ${DT.border}` }}>
        <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: DT.textSub, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: DT.accent, display: 'inline-block', boxShadow: `0 0 4px ${DT.accent}` }} />
          Replay Player
        </span>
        <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: DT.accent, background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)', borderRadius: 5, padding: '2px 8px', letterSpacing: 0.5 }}>
          {formatTime(currentTime)}
        </span>
      </div>

      {/* Video Frame */}
      <div 
        onMouseMove={handleMouseMove}
        style={{ flex: 1, background: '#020204', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: isFullscreen ? 0 : 12 }}
      >
        <div style={{ flex: 1, position: 'relative', background: '#000000', borderRadius: isFullscreen ? 0 : 10, border: isFullscreen ? 'none' : `1px solid rgba(255,255,255,0.03)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={togglePlay}>
          <video 
            ref={videoRef} 
            src={session.videoUrl} 
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={updateDuration}
            onDurationChange={updateDuration}
            onCanPlay={updateDuration}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }} 
          />
            
          {/* Play/Pause center overlay button */}
          <div style={{ position: 'absolute', pointerEvents: 'none', width: 56, height: 56, borderRadius: '50%', background: 'rgba(5,5,8,0.65)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isPlaying ? 0 : 1, transform: isPlaying ? 'translate(-50%, -50%) scale(1.15)' : 'translate(-50%, -50%) scale(1)', left: '50%', top: '50%', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <Play size={20} style={{ color: DT.text, marginLeft: 3 }} fill="currentColor" />
          </div>
        </div>

        {/* Floating Controls Bar */}
        <div style={controlsStyle}>
          {/* Progress Seek Slider */}
          <div 
            style={{ height: 12, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
            onClick={handleSeek}
          >
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${progressPercent}%`, background: 'linear-gradient(90deg, #0284c7, #22d3ee)', borderRadius: 2, boxShadow: '0 0 8px rgba(34, 211, 238, 0.4)' }} />
              <div style={{ position: 'absolute', left: `calc(${progressPercent}% - 5px)`, top: -3, width: 10, height: 10, borderRadius: '50%', background: '#ffffff', boxShadow: '0 0 10px rgba(34,211,238,0.8), 0 2px 4px rgba(0,0,0,0.5)' }} />
            </div>
          </div>

          {/* Buttons row */}
          <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: DT.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', padding: 0 }}>
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }} 
                style={{ background: 'none', border: 'none', color: DT.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = DT.text}
                onMouseLeave={e => e.currentTarget.style.color = DT.textDim}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <span style={{ fontSize: 11, color: DT.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: DT.textSub }}>{formatTime(currentTime)}</span> <span style={{ opacity: 0.3 }}>/</span> {formatTime(duration * 1000)}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <select 
                value={playbackSpeed}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setPlaybackSpeed(v);
                  if (videoRef.current) videoRef.current.playbackRate = v;
                }}
                style={{
                  background: 'rgba(255,255,255,0.03)', 
                  border: `1px solid ${DT.border}`, 
                  borderRadius: 6, 
                  color: DT.textSub, 
                  fontSize: 10, 
                  fontWeight: 600, 
                  padding: '2px 4px', 
                  cursor: 'pointer', 
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none'
                }}
              >
                {[0.25, 0.5, 1, 1.25, 1.5, 2].map(s => <option key={s} value={s} style={{ background: '#09090b', color: DT.text }}>{s}x</option>)}
              </select>
              <button onClick={toggleFullscreen} style={{ background: 'none', border: 'none', color: DT.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = DT.text}
                onMouseLeave={e => e.currentTarget.style.color = DT.textDim}
              >
                {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OS Environment badges */}
      {!isFullscreen && session.browserInfo && (
        <div style={{ padding: 14, borderTop: `1px solid ${DT.border}`, background: 'rgba(255, 255, 255, 0.01)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 9, color: DT.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>System Environment</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${DT.border}`, padding: '6px 10px', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: DT.textSub, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.browserInfo.os || 'OS'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid ${DT.border}`, padding: '6px 10px', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: DT.textSub, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.browserInfo.browser || 'Browser'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
