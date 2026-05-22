/* ================================================================
   background.js  –  Central Service Worker Coordinator
   
   RESPONSIBILITIES:
   1. Tracks global recording state ('idle', 'recording', 'uploading', 'success').
   2. Persists events (logs, network, actions) to chrome.storage.local.
   3. Coordinates starting and stopping of recording inside the active tab.
   ================================================================ */

const API_BASE = 'http://localhost:5000';

// Asynchronous queue to prevent writing race conditions in chrome.storage.local
let storageQueue = Promise.resolve();

function appendEventToStorage(key, item) {
  storageQueue = storageQueue.then(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        const list = result[key] || [];
        list.push(item);
        chrome.storage.local.set({ [key]: list }, () => {
          resolve();
        });
      });
    });
  });
}

// ── INDEXEDDB FOR VIDEO CHUNKS ──────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('debugsnap_chunks_db', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('chunks')) {
        db.createObjectStore('chunks', { autoIncrement: true });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function clearChunks() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readwrite');
      const store = tx.objectStore('chunks');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }).catch((err) => {
    console.error('Failed to clear IndexedDB chunks:', err);
  });
}

function addChunk(chunkBase64) {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readwrite');
      const store = tx.objectStore('chunks');
      const request = store.add(chunkBase64);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }).catch((err) => {
    console.error('Failed to add chunk to IndexedDB:', err);
  });
}

function getCompiledVideo() {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('chunks', 'readonly');
      const store = tx.objectStore('chunks');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }).then(async (chunks) => {
    if (!chunks || chunks.length === 0) {
      return null;
    }

    // Convert each base64 string back to a Blob
    const blobPromises = chunks.map(async (base64Url) => {
      const res = await fetch(base64Url);
      return await res.blob();
    });

    const blobs = await Promise.all(blobPromises);
    const finalBlob = new Blob(blobs, { type: 'video/webm' });

    // Convert the final Blob back to a base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(finalBlob);
    });
  }).catch((err) => {
    console.error('Failed to compile video:', err);
    throw err;
  });
}

let offscreenResolver = null;

// Listen for messages from popup.js, content.js, and offscreen.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'OFFSCREEN_READY') {
    if (offscreenResolver) {
      offscreenResolver();
      offscreenResolver = null;
    }
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'START_RECORDING') {
    handleStartRecording(request, sendResponse);
    return true; // Keep message channel open for async response
  }

  if (request.type === 'STOP_RECORDING') {
    handleStopRecording(request, sendResponse);
    return true;
  }

  if (request.type === 'NATIVE_RECORDING_STOPPED') {
    handleNativeStop();
    return false;
  }

  if (request.type === 'LOG_EVENT') {
    chrome.storage.local.get(['recording_state', 'recording_start_time'], (result) => {
      if (result.recording_state !== 'recording') return;
      const { eventType, data } = request;
      const startTime = result.recording_start_time || Date.now();
      const relativeTime = (data.timestamp || Date.now()) - startTime;
      
      const finalData = { ...data, time: Math.max(0, relativeTime) };
      delete finalData.timestamp;

      if (eventType === 'console') {
        appendEventToStorage('collected_logs', finalData);
      } else if (eventType === 'network') {
        appendEventToStorage('collected_network', finalData);
      } else if (eventType === 'action') {
        appendEventToStorage('collected_actions', finalData);
      }
    });
    return false;
  }

  if (request.type === 'SYNC_AUTH') {
    chrome.storage.local.set({ debugsnap_token: request.token });
    sendResponse({ ok: true });
    return false;
  }

  if (request.type === 'UPLOAD_DATA') {
    handleUploadData(request, sendResponse);
    return true;
  }

  if (request.type === 'GET_RECORDING_STATE') {
    chrome.storage.local.get(['recording_state', 'recording_start_time', 'last_public_id'], (result) => {
      sendResponse({
        recordingState: result.recording_state || 'idle',
        recordingStartTime: result.recording_start_time || null,
        lastPublicId: result.last_public_id || null
      });
    });
    return true;
  }

  if (request.type === 'RECORDED_CHUNK') {
    addChunk(request.chunkUrl)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: err.message || err.toString() }));
    return true;
  }

  if (request.type === 'GET_COMPILED_VIDEO') {
    getCompiledVideo()
      .then((videoDataUrl) => {
        sendResponse({ videoDataUrl });
      })
      .catch((err) => {
        sendResponse({ error: err.message || err.toString() });
      });
    return true; // async
  }

  if (request.type === 'RESET_STATE') {
    chrome.offscreen.closeDocument().catch(() => {});
    clearChunks().catch(() => {});
    chrome.storage.local.set({
      recording_state: 'idle',
      recording_start_time: null,
      last_public_id: null,
      collected_logs: [],
      collected_network: [],
      collected_actions: []
    }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (request.type === 'INJECT_MAIN_WORLD_SCRIPT') {
    if (sender.tab && sender.tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: 'MAIN',
        files: ['inject.js']
      }).catch((err) => console.error('Script injection failed:', err));
    }
    return false;
  }
});

// ── ENSURE CONTENT SCRIPT IS INJECTED ────────────────────────────
// After extension reload, existing tabs don't have the content script.
// This helper pings it first; if dead, injects it programmatically.
async function ensureContentScript(tabId) {
  // 1. Ping to check if content script is alive
  const isAlive = await new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });

  if (isAlive) return true;

  // 2. Content script is not available — inject it programmatically
  try {
    // Inject the MAIN world script first (console/network capture)
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      files: ['inject.js']
    });

    // Inject the ISOLATED world content script (recording UI + capture)
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });

    // Wait briefly for scripts to initialize their listeners
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  } catch (err) {
    console.error('Cannot inject content script into tab:', err);
    return false;
  }
}

// ── START RECORDING (Orchestrates Screen Picker & Content Script Capture) ──────────────────
async function handleStartRecording(request, sendResponse) {
  try {
    // Clear any previous recording error
    await chrome.storage.local.remove(['last_recording_error']);
    await clearChunks();

    const stored = await chrome.storage.local.get(['debugsnap_token']);
    const authToken = stored.debugsnap_token;
    if (!authToken) {
      sendResponse({ error: 'Please login first' });
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab) {
      throw new Error('No active tab detected.');
    }

    // Open Chrome's desktop picker from the service worker.
    // The streamId is bound to the activeTab's security context,
    // so getUserMedia must be called from that tab (content script), NOT offscreen.
    chrome.desktopCapture.chooseDesktopMedia(
      ["screen", "window", "tab"],
      activeTab,
      async (streamId) => {
        if (!streamId) {
          sendResponse({ error: 'Screen selection cancelled' });
          return;
        }

        // Ensure the content script is alive in the tab before proceeding.
        // This handles the case where the extension was reloaded but the tab wasn't refreshed.
        const scriptReady = await ensureContentScript(activeTab.id);
        if (!scriptReady) {
          await chrome.storage.local.set({
            recording_state: 'idle',
            last_recording_error: 'Cannot record this page. Please refresh the page or navigate to a standard website.'
          });
          sendResponse({ error: 'Cannot record this page. Please refresh the page or navigate to a standard website.' });
          return;
        }

        const recordingStartTime = Date.now();
        await chrome.storage.local.set({
          recording_state: 'recording',
          recording_start_time: recordingStartTime,
          recording_tab_id: activeTab.id,
          collected_logs: [],
          collected_network: [],
          collected_actions: []
        });

        // Send streamId to the content script in the active tab.
        // The content script runs in the targetTab context where the streamId is valid.
        chrome.tabs.sendMessage(activeTab.id, {
          type: 'START_CAPTURE',
          streamId: streamId
        }, async (res) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr || !res || res.error) {
            const err = (res && res.error) || (lastErr && lastErr.message) || 'Failed to start capture in tab';
            console.error('Error starting capture in content script:', err);
            await chrome.storage.local.set({ 
              recording_state: 'idle',
              last_recording_error: err 
            });
            sendResponse({ error: err });
          } else {
            sendResponse({ ok: true });
          }
        });
      }
    );

  } catch (err) {
    console.error('Failed to setup recording:', err);
    await chrome.storage.local.set({ 
      recording_state: 'idle',
      last_recording_error: err.message || err.toString()
    });
    sendResponse({ error: err.message });
  }
}

// ── STOP RECORDING ───────────────────────────────────────────────
async function handleStopRecording(request, sendResponse) {
  try {
    sendResponse({ ok: true });

    // Tell the recording tab's content script to stop and process the video
    const stored = await chrome.storage.local.get(['recording_tab_id']);
    const tabId = stored.recording_tab_id;

    const targetTabs = tabId
      ? [{ id: tabId }]
      : await chrome.tabs.query({ active: true, currentWindow: true });

    if (targetTabs[0]) {
      chrome.tabs.sendMessage(targetTabs[0].id, { type: 'TRIGGER_STOP' }, () => {
        if (chrome.runtime.lastError) {
          // Content script not available (tab closed/navigated), clean up
          chrome.storage.local.set({ recording_state: 'idle' });
        }
      });
    } else {
      await chrome.storage.local.set({ recording_state: 'idle' });
    }
  } catch (err) {
    console.error('Error stopping recording:', err);
    await chrome.storage.local.set({ recording_state: 'idle' });
  }
}

// ── NATIVE STOP EVENT (From Chrome's "Stop Sharing" button) ──────
async function handleNativeStop() {
  // In the new architecture, the content script detects track-ended directly
  // and handles stopping locally. This handler is kept for backward compatibility.
  // Just ensure state is cleaned up if needed.
  const stored = await chrome.storage.local.get(['recording_state']);
  if (stored.recording_state === 'recording') {
    // Content script should handle this, but as a safety net:
    const tabData = await chrome.storage.local.get(['recording_tab_id']);
    if (tabData.recording_tab_id) {
      chrome.tabs.sendMessage(tabData.recording_tab_id, { type: 'TRIGGER_STOP' }, () => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.set({ recording_state: 'idle' });
        }
      });
    }
  }
}

// ── UPLOAD ALL DATA ──────────────────────────────────────────────
async function handleUploadData(request, sendResponse) {
  try {
    const storageData = await chrome.storage.local.get([
      'debugsnap_token',
      'collected_logs',
      'collected_network',
      'collected_actions',
      'recording_start_time'
    ]);

    const authToken = storageData.debugsnap_token;
    if (!authToken) {
      throw new Error('Please login first');
    }

    const { videoDataUrl, title, browserInfo } = request;
    if (!videoDataUrl) {
      throw new Error('Video recording data is missing.');
    }

    await chrome.storage.local.set({ recording_state: 'uploading' });

    // Step 1: Create session
    const createRes = await fetch(`${API_BASE}/api/sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: title || 'Untitled Recording',
        browserInfo
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.message || 'Failed to create session on server.');
    }

    const session = await createRes.json();
    const sessionId = session._id;

    // Step 2: Convert base64 video data to binary Blob
    const blobRes = await fetch(videoDataUrl);
    const blob = await blobRes.blob();

    const formData = new FormData();
    formData.append('video', blob, 'recording.webm');

    // Step 3: Upload video to Cloudinary via backend
    const uploadRes = await fetch(`${API_BASE}/api/upload/video`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.message || 'Cloudinary video upload failed.');
    }

    const { url: videoUrl, public_id: videoPublicId } = await uploadRes.json();

    // Step 4: Finalize session completion with logs, network, actions
    const recordingStartTime = storageData.recording_start_time || Date.now();
    const duration = Math.max(1, Math.floor((Date.now() - recordingStartTime) / 1000));
    
    const completeRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: title || 'Untitled Recording',
        videoUrl,
        videoPublicId: videoPublicId || '',
        logs: storageData.collected_logs || [],
        networkRequests: storageData.collected_network || [],
        actions: storageData.collected_actions || [],
        duration
      })
    });

    if (!completeRes.ok) {
      const err = await completeRes.json();
      throw new Error(err.message || 'Failed to save session data.');
    }

    const { publicId } = await completeRes.json();

    // Step 5: Save success state and public link ID
    await chrome.storage.local.set({
      recording_state: 'success',
      last_public_id: publicId,
      collected_logs: [],
      collected_network: [],
      collected_actions: []
    });

    sendResponse({ success: true, publicId });

  } catch (err) {
    await chrome.storage.local.set({ recording_state: 'idle' });
    sendResponse({ error: err.message });
  }
}

// ── UPLOAD DIRECTLY FROM BACKGROUND (FALLBACK) ───────────────────
async function uploadDirectlyFromBackground(videoDataUrl, errorMsg) {
  try {
    await chrome.storage.local.set({ recording_state: 'uploading' });

    const storageData = await chrome.storage.local.get([
      'debugsnap_token',
      'collected_logs',
      'collected_network',
      'collected_actions',
      'recording_start_time'
    ]);

    const authToken = storageData.debugsnap_token;
    if (!authToken) {
      console.error('No auth token found in background upload.');
      await chrome.storage.local.set({ recording_state: 'idle' });
      return;
    }

    const finalVideoUrl = videoDataUrl || 'data:video/webm;base64,GkXfo6N5SlZUVm0=';
    const isFallback = !videoDataUrl;
    const defaultTitle = isFallback 
      ? `Logs only: Bug on ${new Date().toLocaleString()}`
      : `Bug on ${new Date().toLocaleString()}`;

    // Step 1: Create session
    const createRes = await fetch(`${API_BASE}/api/sessions/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: defaultTitle,
        browserInfo: getBrowserInfo()
      })
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.message || 'Failed to create session on server.');
    }

    const session = await createRes.json();
    const sessionId = session._id;

    // Step 2: Convert base64 video data to binary Blob
    const blobRes = await fetch(finalVideoUrl);
    const blob = await blobRes.blob();

    const formData = new FormData();
    formData.append('video', blob, 'recording.webm');

    // Step 3: Upload video to Cloudinary via backend
    const uploadRes = await fetch(`${API_BASE}/api/upload/video`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.message || 'Cloudinary video upload failed.');
    }

    const { url: videoUrl, public_id: videoPublicId } = await uploadRes.json();

    // Step 4: Finalize session completion with logs, network, actions
    const recordingStartTime = storageData.recording_start_time || Date.now();
    const duration = Math.max(1, Math.floor((Date.now() - recordingStartTime) / 1000));
    
    const completeRes = await fetch(`${API_BASE}/api/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: defaultTitle,
        videoUrl,
        videoPublicId: videoPublicId || '',
        logs: storageData.collected_logs || [],
        networkRequests: storageData.collected_network || [],
        actions: storageData.collected_actions || [],
        duration
      })
    });

    if (!completeRes.ok) {
      const err = await completeRes.json();
      throw new Error(err.message || 'Failed to save session data.');
    }

    const { publicId } = await completeRes.json();

    // Step 5: Save success state and public link ID
    await chrome.storage.local.set({
      recording_state: 'success',
      last_public_id: publicId,
      collected_logs: [],
      collected_network: [],
      collected_actions: []
    });

    // Step 6: Open the replay dashboard in a new tab!
    chrome.tabs.create({ url: `http://localhost:5173/session/${publicId}` });

  } catch (err) {
    console.error('Background upload failed:', err);
    await chrome.storage.local.set({ recording_state: 'idle' });
  }
}

// Helper function to extract browser user agent info inside service worker
function getBrowserInfo() {
  const ua = navigator.userAgent || '';
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
    screenResolution: "Unknown",
    userAgent: ua
  };
}