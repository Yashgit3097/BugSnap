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
  #jam-overlay-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.7);
    backdrop-filter: blur(8px);
    z-index: 999999;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .jam-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 32px;
    width: 400px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    color: #f8fafc;
    text-align: center;
  }
  .jam-title {
    font-size: 20px; font-weight: 700; margin-bottom: 8px; color: #f1f5f9;
  }
  .jam-text {
    font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5;
  }
  .jam-btn {
    padding: 12px 24px; font-size: 15px; font-weight: 600; border-radius: 8px;
    border: none; cursor: pointer; transition: all 0.2s ease; width: 100%;
  }
  .jam-btn-primary {
    background: #ff4757; color: white; box-shadow: 0 4px 6px -1px rgba(255, 71, 87, 0.2);
  }
  .jam-btn-primary:hover {
    background: #ff6b81; transform: translateY(-1px);
  }
  .jam-btn-secondary {
    background: rgba(255, 255, 255, 0.1); color: #f1f5f9; margin-top: 10px;
  }
  .jam-btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  .jam-input {
    width: 100%; padding: 12px; border-radius: 8px; background: rgba(15, 23, 42, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1); color: white; font-size: 14px;
    margin-bottom: 20px; box-sizing: border-box; outline: none;
  }
  .jam-input:focus {
    border-color: #ff4757;
  }

  /* Floating Control Panel */
  #jam-floating-widget {
    position: fixed;
    bottom: 24px; right: 24px;
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(12px);
    border-radius: 30px;
    padding: 8px 16px;
    display: flex; align-items: center; gap: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
    z-index: 999998;
    font-family: 'Inter', -apple-system, sans-serif;
    color: white;
    user-select: none;
  }
  .jam-dot {
    width: 10px; height: 10px; border-radius: 50%; background: #ff4757;
  }
  .jam-pulse {
    animation: jam-pulsate 1.5s infinite alternate;
  }
  @keyframes jam-pulsate {
    0% { transform: scale(0.9); opacity: 0.6; }
    100% { transform: scale(1.1); opacity: 1; }
  }
  .jam-timer {
    font-size: 14px; font-weight: 600; font-family: monospace; min-width: 45px;
  }
  .jam-stop-btn {
    background: #ff4757; color: white; border: none; font-size: 12px; font-weight: 700;
    padding: 6px 12px; border-radius: 15px; cursor: pointer; transition: background 0.2s;
  }
  .jam-stop-btn:hover {
    background: #ff6b81;
  }

  /* Spinner */
  .jam-spinner {
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #ff4757;
    border-radius: 50%; width: 24px; height: 24px;
    animation: jam-spin 1s linear infinite;
    margin: 0 auto 15px auto;
  }
  @keyframes jam-spin {
    0% { transform: rotate(0deg); }
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
  if (msg.__JAM_TYPE__ === 'CONSOLE') {
    chrome.runtime.sendMessage({
      type: 'LOG_EVENT',
      eventType: 'console',
      data: { ...msg.payload, timestamp: Date.now() }
    });
  }

  if (msg.__JAM_TYPE__ === 'NETWORK') {
    chrome.runtime.sendMessage({
      type: 'LOG_EVENT',
      eventType: 'network',
      data: { ...msg.payload, timestamp: Date.now() }
    });
  }
}

// On Page Load: check if currently recording and restore widget state
chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (response) => {
  recordingStateResolved = true;
  if (response && response.recordingState === 'recording') {
    recordingStartTime = response.recordingStartTime;
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
  }
  earlyMessageQueue = [];
});

// ── Step 2: Receive events from inject.js ───────────────────────
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || typeof event.data !== 'object' || !event.data.__JAM_TYPE__) return;

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
  if (e.target.closest('#jam-overlay-backdrop') || e.target.closest('#jam-floating-widget')) return;
  const text = e.target.innerText || e.target.value || '';
  sendAction('click', e.target, text.substring(0, 50));
}, true);

document.addEventListener('input', (e) => {
  if (e.target.closest('#jam-overlay-backdrop') || e.target.closest('#jam-floating-widget')) return;
  sendAction('input', e.target, '***'); // mask values
}, true);

// ── Step 4: Runtime Communication & Recorders ────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'TRIGGER_CAPTURE_START') {
    recordingStartTime = request.startTime;
    if (document.body) {
      showStartPromptOverlay();
    } else {
      document.addEventListener('DOMContentLoaded', showStartPromptOverlay);
    }
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'TRIGGER_CAPTURE_STOP') {
    stopRecordingAndShowModal();
    sendResponse({ ok: true });
    return false;
  }
});

// ── RENDER START OVERLAY BANNER ──────────────────────────────────
function showStartPromptOverlay() {
  removeUIElements();

  const backdrop = document.createElement('div');
  backdrop.id = 'jam-overlay-backdrop';

  const card = document.createElement('div');
  card.className = 'jam-card';
  card.innerHTML = `
    <h2 class="jam-title">🎬 Start Recording</h2>
    <p class="jam-text">Please select a screen, window, or tab to begin your debugging session recording.</p>
    <button class="jam-btn jam-btn-primary" id="jam-select-screen-btn">Choose Screen</button>
    <button class="jam-btn jam-btn-secondary" id="jam-cancel-screen-btn">Cancel</button>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById('jam-select-screen-btn').addEventListener('click', async () => {
    try {
      // Prompt user to select screen area (allows window, screen, or tab capture)
      mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 10,
          width: 1280,
          height: 720
        },
        audio: false,
        selfBrowserSurface: "include",
        preferCurrentTab: true
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          capturedVideoDataUrl = reader.result;
          showUploadModal();
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(1000);
      isRecording = true;

      // Handle native Stop Sharing toolbar click
      mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        stopRecordingAndShowModal();
      });

      removeUIElements();
      renderFloatingWidget();

    } catch (err) {
      alert('Capture Error: ' + err.message);
      removeUIElements();
      isRecording = false;
      chrome.runtime.sendMessage({ type: 'RESET_STATE' });
    }
  });

  document.getElementById('jam-cancel-screen-btn').addEventListener('click', () => {
    removeUIElements();
    isRecording = false;
    chrome.runtime.sendMessage({ type: 'RESET_STATE' });
  });
}

// ── RENDER FLOATING RECORDING WIDGET ──────────────────────────────
function renderFloatingWidget() {
  removeUIElements();

  const widget = document.createElement('div');
  widget.id = 'jam-floating-widget';
  widget.style.cursor = 'grab';

  widget.innerHTML = `
    <div class="jam-dot jam-pulse"></div>
    <div class="jam-timer" id="jam-timer-label">00:00</div>
    <button class="jam-stop-btn" id="jam-widget-stop-btn">Stop & Upload</button>
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
  const initialLabel = document.getElementById('jam-timer-label');
  if (initialLabel) initialLabel.textContent = `${initialMin}:${initialSec}`;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const sec = String(timerSeconds % 60).padStart(2, '0');
    const label = document.getElementById('jam-timer-label');
    if (label) label.textContent = `${min}:${sec}`;
  }, 1000);

  document.getElementById('jam-widget-stop-btn').addEventListener('click', stopRecordingAndShowModal);
}

// ── STOP CAPTURE AND INITIATE STOP ───────────────────────────
function stopRecordingAndShowModal() {
  isRecording = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  recordingStartTime = null;

  removeUIElements();

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  } else {
    showUploadModalFallback();
  }
}

// ── RENDER FALLBACK UPLOAD MODAL (WHEN MEDIA RECORDER IS LOST) ─────
function showUploadModalFallback() {
  removeUIElements();

  const backdrop = document.createElement('div');
  backdrop.id = 'jam-overlay-backdrop';

  const card = document.createElement('div');
  card.className = 'jam-card';
  
  const defaultTitle = `Logs only: Bug on ${new Date().toLocaleString()}`;
  
  card.innerHTML = `
    <h2 class="jam-title">Recording Interrupted</h2>
    <p class="jam-text">The page reload or navigation interrupted the screen video. However, we can still upload your captured console logs and network events!</p>
    <input type="text" class="jam-input" id="jam-title-input" value="${defaultTitle}" />
    <div id="jam-modal-status-area">
      <button class="jam-btn jam-btn-primary" id="jam-upload-logs-btn">Upload Logs Only</button>
      <button class="jam-btn jam-btn-secondary" id="jam-discard-btn">Discard</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById('jam-upload-logs-btn').addEventListener('click', async () => {
    const titleVal = document.getElementById('jam-title-input').value;
    const statusArea = document.getElementById('jam-modal-status-area');
    
    statusArea.innerHTML = `
      <div class="jam-spinner"></div>
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
          <button class="jam-btn jam-btn-primary" id="jam-retry-logs-btn">Retry</button>
          <button class="jam-btn jam-btn-secondary" id="jam-discard-btn-2">Discard</button>
        `;
        document.getElementById('jam-retry-logs-btn').addEventListener('click', showUploadModalFallback);
        document.getElementById('jam-discard-btn-2').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      } else if (res.success && res.publicId) {
        statusArea.innerHTML = `
          <h3 style="font-size: 16px; margin-bottom: 10px; color: #4ade80;">Upload Successful! 🎉</h3>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">Your session replay has been created (logs only).</p>
          <button class="jam-btn jam-btn-primary" id="jam-view-replay-btn">Open Replay</button>
          <button class="jam-btn jam-btn-secondary" id="jam-dismiss-btn">Dismiss</button>
        `;

        document.getElementById('jam-view-replay-btn').addEventListener('click', () => {
          window.open(`http://localhost:5173/session/${res.publicId}`, '_blank');
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });

        document.getElementById('jam-dismiss-btn').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      }
    });
  });

  document.getElementById('jam-discard-btn').addEventListener('click', () => {
    removeUIElements();
    chrome.runtime.sendMessage({ type: 'RESET_STATE' });
  });
}

// ── RENDER UPLOAD MODAL ──────────────────────────────────────────
function showUploadModal() {
  removeUIElements();

  const backdrop = document.createElement('div');
  backdrop.id = 'jam-overlay-backdrop';

  const card = document.createElement('div');
  card.className = 'jam-card';
  
  const defaultTitle = `Bug on ${new Date().toLocaleString()}`;
  
  card.innerHTML = `
    <h2 class="jam-title">Save Recording</h2>
    <p class="jam-text">Add a title description to describe this bug report.</p>
    <input type="text" class="jam-input" id="jam-title-input" value="${defaultTitle}" />
    <div id="jam-modal-status-area">
      <button class="jam-btn jam-btn-primary" id="jam-upload-btn">Upload Recording</button>
      <button class="jam-btn jam-btn-secondary" id="jam-discard-btn">Discard</button>
    </div>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);

  document.getElementById('jam-upload-btn').addEventListener('click', async () => {
    const titleVal = document.getElementById('jam-title-input').value;
    const statusArea = document.getElementById('jam-modal-status-area');
    
    statusArea.innerHTML = `
      <div class="jam-spinner"></div>
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
          <button class="jam-btn jam-btn-primary" id="jam-upload-retry-btn">Retry Upload</button>
          <button class="jam-btn jam-btn-secondary" id="jam-discard-btn-2">Discard</button>
        `;
        document.getElementById('jam-upload-retry-btn').addEventListener('click', () => {
          showUploadModal();
        });
        document.getElementById('jam-discard-btn-2').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      } else if (res.success && res.publicId) {
        statusArea.innerHTML = `
          <h3 style="font-size: 16px; margin-bottom: 10px; color: #4ade80;">Upload Successful! 🎉</h3>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">Your debugging replay has been created.</p>
          <button class="jam-btn jam-btn-primary" id="jam-view-replay-btn">Open Replay</button>
          <button class="jam-btn jam-btn-secondary" id="jam-dismiss-btn">Dismiss</button>
        `;

        document.getElementById('jam-view-replay-btn').addEventListener('click', () => {
          window.open(`http://localhost:5173/session/${res.publicId}`, '_blank');
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });

        document.getElementById('jam-dismiss-btn').addEventListener('click', () => {
          removeUIElements();
          chrome.runtime.sendMessage({ type: 'RESET_STATE' });
        });
      }
    });
  });

  document.getElementById('jam-discard-btn').addEventListener('click', () => {
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
  const b = document.getElementById('jam-overlay-backdrop');
  if (b) b.remove();
  const w = document.getElementById('jam-floating-widget');
  if (w) w.remove();
}

if (window.location.host.includes('localhost:5173') || window.location.host.includes('127.0.0.1:5173')) {
  function syncTokenToExtension() {
    const raw = localStorage.getItem('jam_user');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token) {
          chrome.storage.local.set({ jam_token: parsed.token });
        } else {
          chrome.storage.local.remove(['jam_token']);
        }
      } catch (e) {}
    } else {
      chrome.storage.local.remove(['jam_token']);
    }
  }
  syncTokenToExtension();
  setInterval(syncTokenToExtension, 2000);
}
