/* ================================================================
   popup.js  –  Extension Popup controller (Premium UI Edition)

   RESPONSIBILITIES:
   1. Validates auth JWT token in local storage.
   2. Syncs and renders corresponding premium UI views:
      - Loading
      - Not Logged In
      - Not Recordable (chrome:// pages etc.)
      - Ready to Record
      - Recording in Progress (with running duration timer)
      - Uploading Spinner
      - Success (with shareable session link)
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');
  const headerBadge = document.getElementById('headerStatusBadge');
  const headerDot = document.getElementById('headerStatusDot');
  const headerText = document.getElementById('headerStatusText');
  let timerInterval = null;

  // ── Header Status Helper ──────────────────────────────────────
  function setHeaderStatus(type, label) {
    headerBadge.className = `status-badge ${type}`;
    headerDot.className = `status-dot-sm${type === 'recording' ? ' pulse-red' : type === 'ready' ? ' pulse-green' : ''}`;
    headerText.textContent = label;
  }

  // ── Content Transition Helper ─────────────────────────────────
  function renderContent(html) {
    contentDiv.style.opacity = '0';
    contentDiv.style.transform = 'translateY(4px)';
    setTimeout(() => {
      contentDiv.innerHTML = html;
      contentDiv.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
      contentDiv.style.opacity = '1';
      contentDiv.style.transform = 'translateY(0)';
    }, 100);
  }

  // ── Sync token from active dashboard tab ─────────────────────
  chrome.tabs.query({ url: ['http://localhost:5173/*', 'http://127.0.0.1:5173/*'] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => localStorage.getItem('debugsnap_user')
      }, (results) => {
        const lastErr = chrome.runtime.lastError;
        if (results && results[0] && results[0].result) {
          try {
            const parsed = JSON.parse(results[0].result);
            if (parsed && parsed.token) {
              chrome.storage.local.set({ debugsnap_token: parsed.token }, checkStateAndRender);
              return;
            }
          } catch (e) {}
        }
        checkStateAndRender();
      });
    } else {
      checkStateAndRender();
    }
  });

  // ── Fetch state and draw view ─────────────────────────────────
  function checkStateAndRender() {
    chrome.storage.local.get(['debugsnap_token'], (res) => {
      if (!res.debugsnap_token) {
        renderNotLoggedIn();
      } else {
        chrome.runtime.sendMessage({ type: 'GET_RECORDING_STATE' }, (state) => {
          if (chrome.runtime.lastError || !state) {
            renderReady();
            return;
          }

          if (state.recordingState === 'recording') {
            renderRecording(state.recordingStartTime);
          } else if (state.recordingState === 'uploading') {
            renderUploading();
          } else if (state.recordingState === 'success') {
            renderSuccess(state.lastPublicId);
          } else {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const activeTab = tabs[0];
              const url = activeTab ? (activeTab.url || '') : '';
              const isRecordable = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://');

              if (!isRecordable) {
                renderNotRecordable();
              } else {
                chrome.storage.local.get(['last_recording_error'], (errResult) => {
                  renderReady(errResult.last_recording_error || '');
                });
              }
            });
          }
        });
      }
    });
  }

  // ── STATE: NOT LOGGED IN ──────────────────────────────────────
  function renderNotLoggedIn() {
    setHeaderStatus('warning', 'Not signed in');
    renderContent(`
      <div class="state-card warning-border">
        <div class="state-icon amber">🔐</div>
        <p class="message">Sign in to record</p>
        <p class="sub-message">Open the dashboard and log in to activate the session recorder.</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="loginBtn">Open Dashboard Login</button>
      </div>
    `);

    setTimeout(() => {
      const btn = document.getElementById('loginBtn');
      if (btn) btn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:5173/login' });
        window.close();
      });
    }, 150);
  }

  // ── STATE: NOT RECORDABLE PAGE ────────────────────────────────
  function renderNotRecordable() {
    setHeaderStatus('warning', 'Unavailable');
    renderContent(`
      <div class="state-card warning-border">
        <div class="state-icon amber">🚫</div>
        <p class="message">Cannot record this tab</p>
        <p class="sub-message">Chrome restricts capture on system pages like <code style="font-size:10px;background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;">chrome://</code> or new tabs. Navigate to a regular website to start recording.</p>
      </div>
    `);
  }

  // ── STATE: READY ──────────────────────────────────────────────
  function renderReady(errorMsg = '') {
    setHeaderStatus('ready', 'Ready');
    renderContent(`
      <div class="state-card ${errorMsg ? 'danger-border' : 'accent-border'}">
        <div class="state-icon indigo">🎬</div>
        <p class="message">Ready to Record</p>
        <p class="sub-message">Click start, then select the area of your screen to capture.</p>
        ${errorMsg ? `
          <div class="error-message">
            <strong style="display:block;margin-bottom:3px;color:#f87171;">⚠ Last error:</strong>
            ${errorMsg}
          </div>
        ` : ''}
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="startBtn">
          <span style="display:flex;align-items:center;justify-content:center;gap:7px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
            Start Recording
          </span>
        </button>
      </div>
      <div class="info-row">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Console logs, network events &amp; screen video will be captured.</span>
      </div>
    `);

    setTimeout(() => {
      const btn = document.getElementById('startBtn');
      if (!btn) return;
      btn.addEventListener('click', () => {
        chrome.storage.local.remove(['last_recording_error']);
        setHeaderStatus('uploading', 'Preparing...');
        renderContent(`
          <div class="state-card">
            <div class="spinner"></div>
            <p class="message">Opening screen picker...</p>
            <p class="sub-message">Select the screen, window or tab you want to capture.</p>
          </div>
        `);

        chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (response) => {
          if (chrome.runtime.lastError || !response || response.error) {
            const err = (response && response.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Unknown error starting recording.';
            renderReady(err);
          } else {
            window.close();
          }
        });
      });
    }, 150);
  }

  // ── STATE: RECORDING ──────────────────────────────────────────
  function renderRecording(startTime) {
    setHeaderStatus('recording', 'Recording');
    renderContent(`
      <div class="state-card danger-border">
        <div class="rec-ring">
          <div class="rec-dot"></div>
        </div>
        <p class="message">Recording in progress</p>
        <div class="timer-display" id="popupTimer">00:00</div>
        <p class="sub-message" style="font-size:10px;">Screen, console logs, and network events are being captured.</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-danger" id="stopBtn">
          <span style="display:flex;align-items:center;justify-content:center;gap:7px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
            Stop & Upload
          </span>
        </button>
      </div>
    `);

    function updateTimer() {
      const elapsedMs = Date.now() - startTime;
      const totalSec = Math.floor(elapsedMs / 1000);
      const hrs = Math.floor(totalSec / 3600);
      const min = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      const el = document.getElementById('popupTimer');
      if (el) el.textContent = hrs > 0 ? `${String(hrs).padStart(2,'0')}:${min}:${sec}` : `${min}:${sec}`;
    }

    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    setTimeout(() => {
      const stopBtn = document.getElementById('stopBtn');
      if (!stopBtn) return;
      stopBtn.addEventListener('click', () => {
        clearInterval(timerInterval);
        setHeaderStatus('uploading', 'Uploading...');
        renderContent(`
          <div class="state-card accent-border">
            <div class="spinner"></div>
            <p class="message">Stopping capture...</p>
            <p class="sub-message">Processing video and compiling your session data. Please do not close.</p>
          </div>
        `);

        chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (res) => {
          if (chrome.runtime.lastError || !res || res.error) {
            const err = (res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Unknown error stopping recording.';
            setHeaderStatus('warning', 'Error');
            renderContent(`
              <div class="state-card danger-border">
                <div class="state-icon red">⚠️</div>
                <p class="message">Stop failed</p>
                <div class="error-message">${err}</div>
              </div>
              <div class="btn-group">
                <button class="btn btn-secondary" id="retryBtn">Try Again</button>
              </div>
            `);
            setTimeout(() => {
              const retryBtn = document.getElementById('retryBtn');
              if (retryBtn) retryBtn.addEventListener('click', checkStateAndRender);
            }, 150);
          } else {
            window.close();
          }
        });
      });
    }, 150);
  }

  // ── STATE: UPLOADING ──────────────────────────────────────────
  function renderUploading() {
    setHeaderStatus('uploading', 'Uploading...');
    renderContent(`
      <div class="state-card accent-border">
        <div class="spinner"></div>
        <p class="message">Uploading session...</p>
        <p class="sub-message">Creating your shareable replay link. Please do not close this popup.</p>
      </div>
      <div class="info-row">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Video is being processed and encrypted on the server.</span>
      </div>
    `);
  }

  // ── STATE: SUCCESS ────────────────────────────────────────────
  function renderSuccess(publicId) {
    setHeaderStatus('success', 'Uploaded!');
    const replayUrl = `http://localhost:5173/session/${publicId}`;
    renderContent(`
      <div class="state-card success-border">
        <div class="success-icon">✅</div>
        <p class="message">Session uploaded!</p>
        <p class="sub-message">Your bug report is ready to share with your team.</p>
        <div class="share-link">
          <span class="share-link-text" id="shareUrl">${replayUrl}</span>
          <button class="btn-ghost" id="copyLinkBtn" style="width:auto;padding:4px 8px;font-size:10px;flex-shrink:0;">Copy</button>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="viewBtn">
          <span style="display:flex;align-items:center;justify-content:center;gap:7px;">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5,3 19,12 5,21 5,3"/></svg>
            View Replay
          </span>
        </button>
        <button class="btn btn-secondary" id="resetBtn">Record New Session</button>
      </div>
    `);

    setTimeout(() => {
      const viewBtn = document.getElementById('viewBtn');
      const resetBtn = document.getElementById('resetBtn');
      const copyBtn = document.getElementById('copyLinkBtn');

      if (viewBtn) viewBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: replayUrl });
        window.close();
      });

      if (resetBtn) resetBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'RESET_STATE' }, () => {
          checkStateAndRender();
        });
      });

      if (copyBtn) copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(replayUrl).then(() => {
          copyBtn.textContent = 'Copied!';
          copyBtn.style.color = '#22c55e';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.style.color = '';
          }, 2000);
        });
      });
    }, 150);
  }

});
