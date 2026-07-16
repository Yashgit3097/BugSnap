/* ================================================================
   content.js  –  Injected Recording Engine & UI overlays
   
   RESPONSIBILITIES:
   1. Injects inject.js to capture page console and network events.
   2. Intercepts clicks, inputs, and route changes and reports them.
   3. Creates modern, premium glassmorphic UI overlays directly on the web page:
      - Prompt Banner (to acquire user gesture for getDisplayMedia).
      - Floating Control Pill (with timer, stop button, and draggable coordinates).
      - Upload Modal (with customizable title input, loading spinner, and success link).
   4. Records the page screen content using navigator.mediaDevices.getDisplayMedia and MediaRecorder.
   ================================================================ */

// ── Variables & States ────────────────────────────────────────────
let recordingStartTime = null;
let mediaRecorder = null;
let recordedChunks = [];
let mediaStream = null;
let timerInterval = null;
let timerSeconds = 0;
let capturedVideoDataUrl = null;
let isRecording = false;

// CSS Stylesheet for custom, elegant, non-intrusive UI widgets
const CSS_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  /* ── Overlay Backdrop ──────────────────────────────────────── */
  #debugsnap-overlay-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(7, 8, 12, 0.75);
    backdrop-filter: blur(12px) saturate(1.2);
    -webkit-backdrop-filter: blur(12px) saturate(1.2);
    z-index: 2147483646;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    animation: debugsnap-backdrop-in 0.2s ease-out;
  }

  @keyframes debugsnap-backdrop-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ── Modal Card ────────────────────────────────────────────── */
  .debugsnap-card {
    background: #0d0d12;
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 20px;
    padding: 32px 28px 28px;
    width: 420px;
    max-width: calc(100vw - 32px);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 32px 64px -12px rgba(0,0,0,0.7),
      0 0 40px -10px rgba(99, 102, 241, 0.15);
    color: #f1f5f9;
    text-align: center;
    animation: debugsnap-card-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }

  .debugsnap-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(139,92,246,0.5), transparent);
  }

  @keyframes debugsnap-card-in {
    from { opacity: 0; transform: scale(0.92) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* ── Typography ────────────────────────────────────────────── */
  .debugsnap-title {
    font-size: 19px;
    font-weight: 800;
    margin-bottom: 8px;
    color: #f8fafc;
    letter-spacing: -0.3px;
    line-height: 1.3;
  }

  .debugsnap-text {
    font-size: 13px;
    color: #94a3b8;
    margin-bottom: 22px;
    line-height: 1.6;
  }

  /* ── Input Field ───────────────────────────────────────────── */
  .debugsnap-input {
    width: 100%;
    padding: 11px 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
    font-size: 13px;
    font-family: 'Inter', -apple-system, sans-serif;
    margin-bottom: 18px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }

  .debugsnap-input:focus {
    border-color: rgba(99, 102, 241, 0.5);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }

  .debugsnap-input::placeholder {
    color: #475569;
  }

  /* ── Buttons ───────────────────────────────────────────────── */
  .debugsnap-btn {
    padding: 11px 22px;
    font-size: 13px;
    font-weight: 700;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    font-family: 'Inter', -apple-system, sans-serif;
    letter-spacing: -0.1px;
    position: relative;
    overflow: hidden;
  }

  .debugsnap-btn:active {
    transform: scale(0.97);
  }

  .debugsnap-btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    box-shadow: 0 4px 16px -4px rgba(99, 102, 241, 0.4);
  }

  .debugsnap-btn-primary:hover {
    filter: brightness(1.1);
    box-shadow: 0 6px 20px -4px rgba(99, 102, 241, 0.55);
  }

  .debugsnap-btn-secondary {
    background: rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin-top: 10px;
  }

  .debugsnap-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
    border-color: rgba(255, 255, 255, 0.12);
  }

  /* ── Floating Recording Widget ─────────────────────────────── */
  #debugsnap-floating-widget {
    position: fixed;
    bottom: 22px;
    right: 22px;
    background: rgba(10, 10, 16, 0.92);
    border: 1px solid rgba(99, 102, 241, 0.3);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
    border-radius: 50px;
    padding: 10px 16px 10px 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.04) inset,
      0 12px 32px -8px rgba(0,0,0,0.6),
      0 0 24px -8px rgba(99, 102, 241, 0.25);
    z-index: 2147483645;
    font-family: 'Inter', -apple-system, sans-serif;
    color: white;
    user-select: none;
    animation: debugsnap-widget-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }

  #debugsnap-floating-widget:hover {
    border-color: rgba(99, 102, 241, 0.45);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.06) inset,
      0 16px 40px -8px rgba(0,0,0,0.65),
      0 0 32px -8px rgba(99, 102, 241, 0.35);
  }

  @keyframes debugsnap-widget-in {
    from { opacity: 0; transform: translateY(20px) scale(0.9); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* Recording dot */
  .debugsnap-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #ef4444;
    flex-shrink: 0;
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
  }

  .debugsnap-pulse {
    animation: debugsnap-pulsate 1.4s ease-in-out infinite;
  }

  @keyframes debugsnap-pulsate {
    0%, 100% { transform: scale(1); box-shadow: 0 0 6px rgba(239, 68, 68, 0.5); opacity: 1; }
    50% { transform: scale(1.3); box-shadow: 0 0 14px rgba(239, 68, 68, 0.7); opacity: 0.75; }
  }

  /* Timer */
  .debugsnap-timer {
    font-size: 14px;
    font-weight: 700;
    font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
    min-width: 42px;
    letter-spacing: 1px;
    background: linear-gradient(135deg, #c7d2fe, #a5b4fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Divider between timer and button */
  .debugsnap-widget-sep {
    width: 1px;
    height: 16px;
    background: rgba(255,255,255,0.1);
    flex-shrink: 0;
  }

  /* Stop button */
  .debugsnap-stop-btn {
    background: linear-gradient(135deg, #dc2626, #ef4444);
    color: white;
    border: none;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Inter', -apple-system, sans-serif;
    padding: 6px 13px;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.18s ease;
    letter-spacing: -0.1px;
    box-shadow: 0 2px 8px -2px rgba(239, 68, 68, 0.4);
    white-space: nowrap;
  }

  .debugsnap-stop-btn:hover {
    filter: brightness(1.1);
    box-shadow: 0 3px 12px -2px rgba(239, 68, 68, 0.55);
    transform: scale(1.03);
  }

  .debugsnap-stop-btn:active {
    transform: scale(0.97);
  }

  /* ── Spinner ───────────────────────────────────────────────── */
  .debugsnap-spinner {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid rgba(99, 102, 241, 0.15);
    border-top-color: #6366f1;
    border-right-color: #8b5cf6;
    animation: debugsnap-spin 0.85s linear infinite;
    margin: 0 auto 18px auto;
  }

  @keyframes debugsnap-spin {
    0%   { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;


// Inject CSS Styles
(function injectStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = CSS_STYLE;
  (document.head || document.documentElement).appendChild(styleEl);
})();

let recordingStateResolved = false;
let earlyMessageQueue = [];

function forwardMessage(msg) {
  if (msg.__DEBUGSNAP_TYPE__ === 'CONSOLE') {
    chrome.runtime.sendMessage({
      type: 'LOG_EVENT',
      eventType: 'console',
      data: { ...msg.payload, timestamp: Date.now() }
    });
  }

  if (msg.__DEBUGSNAP_TYPE__ === 'NETWORK') {
    chrome.runtime.sendMessage({
      type: 'LOG_EVENT',
      eventType: 'network',
      data: { ...msg.payload, timestamp: Date.now() }
    });
  }
}

// Read state directly from chrome.storage.local on page load
chrome.storage.local.get(['recording_state', 'recording_start_time'], (result) => {
  recordingStateResolved = true;
  if (result && result.recording_state === 'recording') {
    recordingStartTime = result.recording_start_time;
    isRecording = true;
    
    // Process early messages received before this async state callback ran
    earlyMessageQueue.forEach((msg) => {
      forwardMessage(msg);
    });

    if (document.body) {
      renderFloatingWidget();
    } else {
      document.addEventListener('DOMContentLoaded', renderFloatingWidget);
    }
  } else {
    isRecording = false;
    recordingStartTime = null;
    removeUIElements();
  }
  earlyMessageQueue = [];
});

// Listen to storage changes to keep all tabs in sync
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'local') return;

  if (changes.recording_state) {
    const newState = changes.recording_state.newValue;
    if (newState === 'recording') {
      chrome.storage.local.get(['recording_start_time'], (res) => {
        recordingStartTime = res.recording_start_time || Date.now();
        isRecording = true;

        earlyMessageQueue.forEach((msg) => {
          forwardMessage(msg);
        });
        earlyMessageQueue = [];

        if (document.body) {
          renderFloatingWidget();
        } else {
          document.addEventListener('DOMContentLoaded', renderFloatingWidget);
        }
      });
    } else {
      isRecording = false;
      recordingStartTime = null;
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      // Remove only the floating widget on non-active tabs.
      // Active tabs showing the upload modal should keep the backdrop/modal.
      const w = document.getElementById('debugsnap-floating-widget');
      if (w) w.remove();
    }
  }
});

// ── Step 2: Receive events from inject.js ───────────────────────
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || typeof event.data !== 'object' || !event.data.__DEBUGSNAP_TYPE__) return;

  if (!recordingStateResolved) {
    earlyMessageQueue.push(event.data);
    return;
  }

  if (!isRecording) return;
  forwardMessage(event.data);
});

// ── Step 3: Capture DOM Events ───────────────────────────────────
function sendAction(type, element, value) {
  if (!isRecording) return;
  let elementDesc = element.tagName ? element.tagName.toLowerCase() : 'unknown';
  if (element.id) elementDesc += `#${element.id}`;
  else if (element.className && typeof element.className === 'string') {
    elementDesc += `.${element.className.split(' ')[0]}`;
  }

  chrome.runtime.sendMessage({
    type: 'LOG_EVENT',
    eventType: 'action',
    data: {
      type,
      element: elementDesc.substring(0, 100),
      value: value ? String(value).substring(0, 100) : '',
      page: window.location.pathname,
      timestamp: Date.now()
    }
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#debugsnap-overlay-backdrop') || e.target.closest('#debugsnap-floating-widget')) return;
  const text = e.target.innerText || e.target.value || '';
  sendAction('click', e.target, text.substring(0, 50));
}, true);

document.addEventListener('input', (e) => {
  if (e.target.closest('#debugsnap-overlay-backdrop') || e.target.closest('#debugsnap-floating-widget')) return;
  sendAction('input', e.target, '***'); // mask values
}, true);

// ── Step 4: Runtime Communication & Control Overlays ────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'PING') {
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'START_CAPTURE') {
    startCapture(request.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        chrome.storage.local.set({ 
          recording_state: 'idle',
          last_recording_error: err.message || 'Failed to start capture'
        });
        sendResponse({ error: err.message || 'Failed to start capture' });
      });
    return true; // async
  }

  if (request.type === 'TRIGGER_STOP') {
    stopRecordingAndShowModal();
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'RENDER_UPLOAD_MODAL') {
    // Patch the WebM duration header before showing the upload modal,
    // using the recorded start/stop timestamps persisted in storage.
    chrome.storage.local.get(['recording_start_time', 'recording_stop_time'], (res) => {
      const durationMs = (res.recording_start_time && res.recording_stop_time)
        ? Math.max(0, res.recording_stop_time - res.recording_start_time)
        : 0;

      if (typeof fixWebmDuration === 'function' && durationMs > 0) {
        fetch(request.videoDataUrl)
          .then((r) => r.blob())
          .then((blob) => fixWebmDuration(blob, durationMs))
          .then((patched) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(patched);
          }))
          .then((dataUrl) => {
            capturedVideoDataUrl = dataUrl;
            showUploadModal();
          })
          .catch(() => {
            capturedVideoDataUrl = request.videoDataUrl;
            showUploadModal();
          });
      } else {
        capturedVideoDataUrl = request.videoDataUrl;
        showUploadModal();
      }
    });
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'RENDER_UPLOAD_MODAL_FALLBACK') {
    showUploadModalFallback(request.error);
    sendResponse({ ok: true });
    return false;
  }
});

// ── START LOCAL CAPTURE (getUserMedia + MediaRecorder in content script) ──
async function startCapture(streamId) {
  recordedChunks = [];
  
  // getUserMedia with chromeMediaSourceId works here because this content script
  // runs in the targetTab that was passed to chooseDesktopMedia.
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
      
      // Convert chunk to base64 Data URL and send it to the background script
      // to survive page reloads.
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage({
          type: 'RECORDED_CHUNK',
          chunkUrl: reader.result
        }).catch((err) => console.warn('Error sending chunk to background:', err));
      };
      reader.readAsDataURL(event.data);
    }
  };

  // If screen capture is stopped natively via Chrome's "Stop Sharing" toolbar
  const videoTracks = mediaStream.getVideoTracks();
  if (videoTracks && videoTracks.length > 0) {
    videoTracks[0].addEventListener('ended', () => {
      if (isRecording) {
        stopRecordingAndShowModal();
      }
    });
  }

  mediaRecorder.start(1000);
  isRecording = true;
}

// ── RENDER PREPARING VIDEO OVERLAY ────────────────────────────────
function showPreparingOverlay() {
  removeUIElements();

  const backdrop = document.createElement('div');
  backdrop.id = 'debugsnap-overlay-backdrop';

  const card = document.createElement('div');
  card.className = 'debugsnap-card';
  card.innerHTML = `
    <div class="debugsnap-spinner"></div>
    <h2 class="debugsnap-title" style="margin-top: 15px;">🎬 Stitching Recording</h2>
    <p class="debugsnap-text">Processing recorded frames and generating video. Please wait...</p>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
}

// ── RENDER FLOATING RECORDING WIDGET ──────────────────────────────
function renderFloatingWidget() {
  removeUIElements();

  const widget = document.createElement('div');
  widget.id = 'debugsnap-floating-widget';
  widget.style.cursor = 'grab';

  widget.innerHTML = `
    <div class="debugsnap-dot debugsnap-pulse"></div>
    <div class="debugsnap-timer" id="debugsnap-timer-label">00:00</div>
    <div class="debugsnap-widget-sep"></div>
    <button class="debugsnap-stop-btn" id="debugsnap-widget-stop-btn">⏹ Stop &amp; Upload</button>
  `;


  document.body.appendChild(widget);

  // Set up dragging logic so widget can be repositioned
  let isDragging = false;
  let startX, startY;
  let initialX, initialY;

  widget.addEventListener('mousedown', (e) => {
    if (e.target.closest('button')) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialX = widget.offsetLeft;
    initialY = widget.offsetTop;
    widget.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    widget.style.left = 'auto';
    widget.style.top = 'auto';
    widget.style.right = `${window.innerWidth - (initialX + dx + widget.offsetWidth)}px`;
    widget.style.bottom = `${window.innerHeight - (initialY + dy + widget.offsetHeight)}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      widget.style.cursor = 'grab';
    }
  });

  // Start ticking the timer from elapsed recording offset
  const elapsedMs = Date.now() - recordingStartTime;
  timerSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  
  const initialMin = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const initialSec = String(timerSeconds % 60).padStart(2, '0');
  const initialLabel = document.getElementById('debugsnap-timer-label');
  if (initialLabel) initialLabel.textContent = `${initialMin}:${initialSec}`;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const sec = String(timerSeconds % 60).padStart(2, '0');
    const label = document.getElementById('debugsnap-timer-label');
    if (label) label.textContent = `${min}:${sec}`;
  }, 1000);

  document.getElementById('debugsnap-widget-stop-btn').addEventListener('click', stopRecordingAndShowModal);
}

// ── STOP CAPTURE AND PROCESS LOCAL RECORDING ───────────────────
function stopRecordingAndShowModal() {
  if (!isRecording && !mediaRecorder) return; // Already stopped or never started

  const stopTime = Date.now();
  chrome.storage.local.set({ recording_stop_time: stopTime });

  // Capture elapsed duration BEFORE recordingStartTime is reset below.
  // MediaRecorder streams WebM without a duration header, so we measure
  // the real wall-clock duration and inject it into the blob before upload.
  const capturedStartTime = recordingStartTime;

  isRecording = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  recordingStartTime = null;

  showPreparingOverlay();

  // Resolves the recorded duration in ms (falls back to chrome.storage
  // if the in-memory start time was lost, e.g. after a page reload).
  const resolveDurationMs = (callback) => {
    if (capturedStartTime) {
      callback(Math.max(0, stopTime - capturedStartTime));
      return;
    }
    chrome.storage.local.get(['recording_start_time'], (res) => {
      callback(res.recording_start_time ? Math.max(0, stopTime - res.recording_start_time) : 0);
    });
  };

  // Patches the WebM duration header, then converts to a Data URL for upload
  const finalizeBlob = (rawBlob) => {
    resolveDurationMs((durationMs) => {
      const proceed = (finalBlob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          capturedVideoDataUrl = reader.result;
          chrome.storage.local.set({ recording_state: 'idle' });
          showUploadModal();
        };
        reader.onerror = () => {
          chrome.storage.local.set({ recording_state: 'idle' });
          showUploadModalFallback('Failed to process recorded video.');
        };
        reader.readAsDataURL(finalBlob);
      };

      if (typeof fixWebmDuration === 'function' && durationMs > 0) {
        fixWebmDuration(rawBlob, durationMs)
          .then(proceed)
          .catch(() => proceed(rawBlob));
      } else {
        proceed(rawBlob);
      }
    });
  };

  const processChunks = () => {
    // Stop all media tracks to release the stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }

    if (recordedChunks.length === 0) {
      // Try to get compiled video from background script (survived page reload)
      chrome.runtime.sendMessage({ type: 'GET_COMPILED_VIDEO' }, (response) => {
        const lastErr = chrome.runtime.lastError;
        if (lastErr || !response || !response.videoDataUrl) {
          mediaRecorder = null;
          chrome.storage.local.set({ recording_state: 'idle' });
          showUploadModalFallback(
            (response && response.error) ||
            (lastErr && lastErr.message) ||
            'No video data was recorded (or page was reloaded before capturing frames).'
          );
        } else {
          // Compiled video also lacks a duration header — patch it too
          mediaRecorder = null;
          fetch(response.videoDataUrl)
            .then((r) => r.blob())
            .then((blob) => finalizeBlob(blob))
            .catch(() => {
              capturedVideoDataUrl = response.videoDataUrl;
              chrome.storage.local.set({ recording_state: 'idle' });
              showUploadModal();
            });
        }
      });
      return;
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    recordedChunks = [];
    mediaRecorder = null;

    finalizeBlob(blob);
  };

  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    // Recorder already stopped (native stop sharing or track ended) — process whatever we have
    processChunks();
  } else {
    mediaRecorder.onstop = processChunks;
    mediaRecorder.stop();
  }
}

// ── RENDER FALLBACK UPLOAD MODAL (WHEN MEDIA RECORDER IS LOST) ─────
function showUploadModalFallback(errorMsg = '') {
  removeUIElements();

  const backdrop = document.createElement('div');
  backdrop.id = 'debugsnap-overlay-backdrop';

  const card = document.createElement('div');
  card.className = 'debugsnap-card';
  
  const defaultTitle = `Logs only: Bug on ${new Date().toLocaleString()}`;
  const errorDetails = errorMsg ? `<p style="color: #f87171; font-size: 13px; margin-bottom: 15px;">Reason: ${errorMsg}</p>` : '';
  
  card.innerHTML = `
    <h2 class="debugsnap-title">Recording Finished</h2>
    <p class="debugsnap-text">Screen video could not be fully captured. However, we can still upload your captured console logs and network events!</p>
    ${errorDetails}
    <input type="text" class="debugsnap-input" id="debugsnap-title-input" value="${defaultTitle}" />
    <div id="debugsnap-modal-status-area">
      <button class="debugsnap-btn debugsnap-btn-primary" id="debugsnap-upload-logs-btn">Upload Logs Only</button>
      <button class="debugsnap-btn debugsnap-btn-secondary" id="debugsnap-discard-btn">Discard</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById('debugsnap-upload-logs-btn').addEventListener('click', async () => {
    const titleVal = document.getElementById('debugsnap-title-input').value;
    const statusArea = document.getElementById('debugsnap-modal-status-area');
    
    statusArea.innerHTML = `
      <div class="debugsnap-spinner"></div>
      <p style="font-size: 14px; color: #94a3b8;">Uploading logs...</p>
    `;

    chrome.runtime.sendMessage({
      type: 'UPLOAD_DATA',
      videoDataUrl: 'data:video/webm;base64,GkXfo6N5SlZUVm0=',
      title: titleVal,
      browserInfo: getBrowserInfo()
    }, (res) => {
      if (chrome.runtime.lastError || !res || res.error) {
        const err = (res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Unknown error';
        statusArea.innerHTML = `
          <p style="color: #f87171; font-size: 14px; margin-bottom: 15px;">Upload failed: ${err}</p>
          <button class="debugsnap-btn debugsnap-btn-primary" id="debugsnap-retry-logs-btn">Retry</button>
          <button class="debugsnap-btn debugsnap-btn-secondary" id="debugsnap-discard-btn-2">Discard</button>
        `;
        document.getElementById('debugsnap-retry-logs-btn').addEventListener('click', () => showUploadModalFallback(errorMsg));
        document.getElementById('debugsnap-discard-btn-2').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      } else if (res.success && res.publicId) {
        statusArea.innerHTML = `
          <h3 style="font-size: 16px; margin-bottom: 10px; color: #4ade80;">Upload Successful! 🎉</h3>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">Your session replay has been created (logs only).</p>
          <button class="debugsnap-btn debugsnap-btn-primary" id="debugsnap-view-replay-btn">Open Replay</button>
          <button class="debugsnap-btn debugsnap-btn-secondary" id="debugsnap-dismiss-btn">Dismiss</button>
        `;

        document.getElementById('debugsnap-view-replay-btn').addEventListener('click', () => {
          window.open(`http://localhost:5173/session/${res.publicId}`, '_blank');
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });

        document.getElementById('debugsnap-dismiss-btn').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      }
    });
  });

  document.getElementById('debugsnap-discard-btn').addEventListener('click', () => {
    removeUIElements();
    chrome.runtime.sendMessage({ type: 'RESET_STATE' });
  });
}

// ── RENDER UPLOAD MODAL ──────────────────────────────────────────
function showUploadModal() {
  removeUIElements();

  const backdrop = document.createElement('div');
  backdrop.id = 'debugsnap-overlay-backdrop';

  const card = document.createElement('div');
  card.className = 'debugsnap-card';
  
  const defaultTitle = `Bug on ${new Date().toLocaleString()}`;
  
  card.innerHTML = `
    <h2 class="debugsnap-title">Save Recording</h2>
    <p class="debugsnap-text">Add a title description to describe this bug report.</p>
    <input type="text" class="debugsnap-input" id="debugsnap-title-input" value="${defaultTitle}" />
    <div id="debugsnap-modal-status-area">
      <button class="debugsnap-btn debugsnap-btn-primary" id="debugsnap-upload-btn">Upload Recording</button>
      <button class="debugsnap-btn debugsnap-btn-secondary" id="debugsnap-discard-btn">Discard</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById('debugsnap-upload-btn').addEventListener('click', async () => {
    const titleVal = document.getElementById('debugsnap-title-input').value;
    const statusArea = document.getElementById('debugsnap-modal-status-area');
    
    statusArea.innerHTML = `
      <div class="debugsnap-spinner"></div>
      <p style="font-size: 14px; color: #94a3b8;">Uploading video & logging events...</p>
    `;

    chrome.runtime.sendMessage({
      type: 'UPLOAD_DATA',
      videoDataUrl: capturedVideoDataUrl,
      title: titleVal,
      browserInfo: getBrowserInfo()
    }, (res) => {
      if (chrome.runtime.lastError || !res || res.error) {
        const err = (res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Unknown error';
        statusArea.innerHTML = `
          <p style="color: #f87171; font-size: 14px; margin-bottom: 15px;">Upload failed: ${err}</p>
          <button class="debugsnap-btn debugsnap-btn-primary" id="debugsnap-upload-retry-btn">Retry Upload</button>
          <button class="debugsnap-btn debugsnap-btn-secondary" id="debugsnap-discard-btn-2">Discard</button>
        `;
        document.getElementById('debugsnap-upload-retry-btn').addEventListener('click', () => {
          showUploadModal();
        });
        document.getElementById('debugsnap-discard-btn-2').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      } else if (res.success && res.publicId) {
        statusArea.innerHTML = `
          <h3 style="font-size: 16px; margin-bottom: 10px; color: #4ade80;">Upload Successful! 🎉</h3>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">Your debugging replay has been created.</p>
          <button class="debugsnap-btn debugsnap-btn-primary" id="debugsnap-view-replay-btn">Open Replay</button>
          <button class="debugsnap-btn debugsnap-btn-secondary" id="debugsnap-dismiss-btn">Dismiss</button>
        `;

        document.getElementById('debugsnap-view-replay-btn').addEventListener('click', () => {
          window.open(`http://localhost:5173/session/${res.publicId}`, '_blank');
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });

        document.getElementById('debugsnap-dismiss-btn').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      }
    });
  });

  document.getElementById('debugsnap-discard-btn').addEventListener('click', () => {
    removeUIElements();
    chrome.runtime.sendMessage({ type: 'RESET_STATE' });
  });
}

// ── UTILITIES ────────────────────────────────────────────────────
function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = "Chrome";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return {
    browser,
    os,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    userAgent: ua
  };
}

function removeUIElements() {
  const b = document.getElementById('debugsnap-overlay-backdrop');
  if (b) b.remove();
  const w = document.getElementById('debugsnap-floating-widget');
  if (w) w.remove();
}

if (window.location.host.includes('localhost:5173') || window.location.host.includes('127.0.0.1:5173')) {
  function syncTokenToExtension() {
    const raw = localStorage.getItem('debugsnap_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token) {
          chrome.storage.local.set({ debugsnap_token: parsed.token });
        } else {
          chrome.storage.local.remove(['debugsnap_token']);
        }
      } catch (e) {}
    } else {
      chrome.storage.local.remove(['debugsnap_token']);
    }
  }
  syncTokenToExtension();
  setInterval(syncTokenToExtension, 2000);
}
