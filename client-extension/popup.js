/* ================================================================
   popup.js  –  Extension Popup controller
   
   RESPONSIBILITIES:
   1. Validates auth JWT token in local storage.
   2. Syncs and renders corresponding UI views:
      - Not Logged In
      - Ready to Record
      - Recording in Progress (with running duration timer)
      - Uploading Spinner
      - Success (with shareable session link)
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('content');
  let timerInterval = null;

  // Try to sync token from active dashboard tabs on load
  chrome.tabs.query({ url: ['http://localhost:5173/*', 'http://127.0.0.1:5173/*'] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => localStorage.getItem('jam_user')
      }, (results) => {
        const lastErr = chrome.runtime.lastError; // silence errors
        if (results && results[0] && results[0].result) {
          try {
            const parsed = JSON.parse(results[0].result);
            if (parsed && parsed.token) {
              chrome.storage.local.set({ jam_token: parsed.token }, checkStateAndRender);
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

  // Fetch state and draw corresponding view
  function checkStateAndRender() {
    chrome.storage.local.get(['jam_token'], (res) => {
      if (!res.jam_token) {
        renderNotLoggedIn();
      } else {
        // Fetch recording coordinates from background
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
            // Check if page can be recorded before showing ready
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

  // ── STATE: NOT LOGGED IN ───────────────────────────────────────
  function renderNotLoggedIn() {
    contentDiv.innerHTML = `
      <div class="status-dot not-auth"></div>
      <p class="message">Please login first</p>
      <p class="sub-message">Open the dashboard and sign in to activate the recorder extension.</p>
      <button class="btn btn-primary" id="loginBtn">Open Dashboard Login</button>
    `;

    document.getElementById('loginBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5173/login' });
      window.close();
    });
  }

  // ── STATE: NOT RECORDABLE PAGE ─────────────────────────────────
  function renderNotRecordable() {
    contentDiv.innerHTML = `
      <div class="status-dot not-auth"></div>
      <p class="message">Cannot record this tab</p>
      <p class="sub-message">Chrome limits media capture on system pages (like chrome:// or new tabs). Navigate to a standard site to record.</p>
    `;
  }

  // ── STATE: READY ───────────────────────────────────────────────
  function renderReady(errorMsg = '') {
    contentDiv.innerHTML = `
      <div class="status-dot ready"></div>
      <p class="message">Ready to Record!</p>
      <p class="sub-message">Click start, then select the area of your screen to share.</p>
      ${errorMsg ? `<p class="message error" style="margin-top: 5px;">${errorMsg}</p>` : ''}
      <button class="btn btn-primary" id="startBtn">🎬 Start Recording</button>
    `;

    document.getElementById('startBtn').addEventListener('click', () => {
      // Clear previous error on fresh click
      chrome.storage.local.remove(['last_recording_error']);

      contentDiv.innerHTML = `
        <div class="spinner"></div>
        <p class="message">Waiting for screen selection...</p>
      `;

      chrome.runtime.sendMessage({ type: 'START_RECORDING' }, (response) => {
        if (chrome.runtime.lastError || !response || response.error) {
          const err = (response && response.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Unknown error';
          renderReady(err);
        } else {
          // Close popup immediately so user can interact with the in-page screen share dialog
          window.close();
        }
      });
    });
  }

  // ── STATE: RECORDING ───────────────────────────────────────────
  function renderRecording(startTime) {
    contentDiv.innerHTML = `
      <div class="status-dot recording pulse"></div>
      <p class="message">Recording in progress...</p>
      <div class="message" id="popupTimer" style="font-family: monospace; font-size: 18px; margin: 5px 0;">00:00</div>
      <button class="btn btn-danger" id="stopBtn">⏹ Stop Recording</button>
    `;

    // Start ticking timer locally matching the background clock
    function updateTimer() {
      const elapsedMs = Date.now() - startTime;
      const totalSec = Math.floor(elapsedMs / 1000);
      const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      const el = document.getElementById('popupTimer');
      if (el) el.textContent = `${min}:${sec}`;
    }

    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);

    document.getElementById('stopBtn').addEventListener('click', () => {
      clearInterval(timerInterval);
      contentDiv.innerHTML = `
        <div class="spinner"></div>
        <p class="message">Stopping capture...</p>
      `;

      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (res) => {
        if (chrome.runtime.lastError || !res || res.error) {
          const err = (res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Unknown error';
          contentDiv.innerHTML = `<p class="message error">${err}</p>`;
        } else {
          // Closed automatically after stopping
          window.close();
        }
      });
    });
  }

  // ── STATE: UPLOADING ───────────────────────────────────────────
  function renderUploading() {
    contentDiv.innerHTML = `
      <div class="spinner"></div>
      <p class="message">Uploading Session...</p>
      <p class="sub-message">Creating replay link on dashboard. Please do not close.</p>
    `;
  }

  // ── STATE: SUCCESS ─────────────────────────────────────────────
  function renderSuccess(publicId) {
    contentDiv.innerHTML = `
      <div class="status-dot ready"></div>
      <p class="message">Upload successful! 🎉</p>
      <p class="sub-message">Shareable session created successfully.</p>
      <button class="btn btn-primary" id="viewBtn">View Replay</button>
      <button class="btn btn-secondary" id="resetBtn" style="margin-top: 5px; color: #a1a1aa; background: transparent; border: 1px solid #3f3f46;">Record New</button>
    `;

    document.getElementById('viewBtn').addEventListener('click', () => {
      chrome.tabs.create({ url: `http://localhost:5173/session/${publicId}` });
      window.close();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'RESET_STATE' }, () => {
        checkStateAndRender();
      });
    });
  }
});
