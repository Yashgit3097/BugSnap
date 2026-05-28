import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

const DT = {
  accent:   '#22d3ee',
  border:   'rgba(255, 255, 255, 0.06)',
  textSub:  '#d4d4d8',
  textDim:  '#8e8e93',
  text:     '#f4f4f5'
};

const getLogPreview = (log) => {
  try {
    if (log.message.startsWith('[') && log.message.endsWith(']')) {
      const args = JSON.parse(log.message);
      if (Array.isArray(args)) {
        return args.map(arg => {
          if (typeof arg === 'string') return arg;
          if (typeof arg === 'object' && arg !== null) {
            if (arg.message) return arg.message;
            return JSON.stringify(arg);
          }
          return String(arg);
        }).join(' ');
      }
    }
  } catch (e) {}
  return log.message;
};

const TimelineMarker = ({ type, time, label, duration, onSeek }) => {
  const [isHovered, setIsHovered] = useState(false);
  if (!duration) return null;
  
  const pct = (time / (duration * 1000)) * 100;
  const leftPct = Math.max(0, Math.min(100, pct));
  
  const markerColor = type === 'error' ? '#f87171' : '#fb923c';
  const glowColor = type === 'error' ? 'rgba(248, 113, 113, 0.5)' : 'rgba(251, 146, 60, 0.5)';
  
  const formatTime = (ms) => {
    if (!ms || isNaN(ms) || !isFinite(ms)) return "00:00.0";
    const s = Math.floor(ms / 1000);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    const t = Math.floor((ms % 1000) / 100);
    return `${m}:${sec}.${t}`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: markerColor,
        boxShadow: `0 0 6px ${glowColor}`,
        border: '1px solid #000000',
        cursor: 'pointer',
        pointerEvents: 'auto',
        zIndex: isHovered ? 40 : 10,
        transition: 'transform 0.1s ease-in-out',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSeek(time);
      }}
    >
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 10, 15, 0.95)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${type === 'error' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(251, 146, 60, 0.3)'}`,
            borderRadius: 6,
            padding: '6px 10px',
            color: '#f4f4f5',
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 2, marginBottom: 2 }}>
            <span style={{ fontWeight: 700, color: markerColor, textTransform: 'uppercase', fontSize: 9 }}>
              {type === 'error' ? 'Error Log' : 'Interaction'}
            </span>
            <span style={{ color: '#8e8e93', fontSize: 9 }}>{formatTime(time)}</span>
          </div>
          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>
            {label}
          </span>
        </div>
      )}
    </div>
  );
};

const getPlayableVideoUrl = (url) => {
  if (!url) return '';
  if (url.includes('res.cloudinary.com')) {
    const parts = url.split('?');
    parts[0] = parts[0].replace(/\.webm$/i, '.mp4');
    return parts.join('?');
  }
  return url;
};

const VideoPlayer = ({ session, currentTime, setCurrentTime, duration, setDuration, videoRef, logs = [], actions = [] }) => {
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

  const handleDragUpdate = (clientX, rect) => {
    const d = duration || videoRef.current?.duration;
    if (videoRef.current && d && !isNaN(d) && isFinite(d)) {
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetTime = pos * d;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime * 1000);
      
      if (videoRef.current.ended) {
        videoRef.current.pause();
      }
    }
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    handleDragUpdate(e.clientX, rect);

    const handleMouseMove = (moveEvent) => {
      handleDragUpdate(moveEvent.clientX, rect);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMarkerSeek = (timeInMs) => {
    if (videoRef.current && duration) {
      const targetTime = timeInMs / 1000;
      videoRef.current.currentTime = targetTime;
      setCurrentTime(timeInMs);
      
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
            src={getPlayableVideoUrl(session.videoUrl)} 
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
            onMouseDown={handleMouseDown}
          >
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${progressPercent}%`, background: 'linear-gradient(90deg, #0284c7, #22d3ee)', borderRadius: 2, boxShadow: '0 0 8px rgba(34, 211, 238, 0.4)' }} />
              
              {/* Event Markers */}
              {logs.filter(log => log.type === 'error').map((log, idx) => (
                <TimelineMarker
                  key={`err-${log._id || idx}`}
                  type="error"
                  time={log.time}
                  label={getLogPreview(log)}
                  duration={duration}
                  onSeek={handleMarkerSeek}
                />
              ))}
              {actions.map((act, idx) => (
                <TimelineMarker
                  key={`act-${act._id || idx}`}
                  type="action"
                  time={act.time}
                  label={`${act.type.toUpperCase()} on ${act.element}`}
                  duration={duration}
                  onSeek={handleMarkerSeek}
                />
              ))}

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
