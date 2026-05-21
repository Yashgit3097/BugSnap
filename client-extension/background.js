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

// Listen for messages from popup.js and content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'START_RECORDING') {
    handleStartRecording(request, sendResponse);
    return true; // Keep message channel open for async response
  }

  if (request.type === 'STOP_RECORDING') {
    handleStopRecording(request, sendResponse);
    return true;
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
    chrome.storage.local.set({ jam_token: request.token });
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

  if (request.type === 'RESET_STATE') {
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

// ── START RECORDING ──────────────────────────────────────────────
async function handleStartRecording(request, sendResponse) {
  try {
    const stored = await chrome.storage.local.get(['jam_token']);
    const authToken = stored.jam_token;
    if (!authToken) {
      sendResponse({ error: 'Please login first' });
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab) {
      throw new Error('No active tab detected.');
    }

    const recordingStartTime = Date.now();
    await chrome.storage.local.set({
      recording_state: 'recording',
      recording_start_time: recordingStartTime,
      collected_logs: [],
      collected_network: [],
      collected_actions: []
    });

    // Notify active tab content script to display the Choose Screen overlay
    chrome.tabs.sendMessage(activeTab.id, {
      type: 'TRIGGER_CAPTURE_START',
      startTime: recordingStartTime
    }, (res) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: 'Could not contact page content script. Try reloading the page.' });
      } else {
        sendResponse({ ok: true });
      }
    });

  } catch (err) {
    await chrome.storage.local.set({ recording_state: 'idle' });
    sendResponse({ error: err.message });
  }
}

// ── STOP RECORDING ───────────────────────────────────────────────
async function handleStopRecording(request, sendResponse) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (!activeTab) {
      throw new Error('No active tab detected.');
    }

    chrome.tabs.sendMessage(activeTab.id, { type: 'TRIGGER_CAPTURE_STOP' }, (res) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: 'Failed to stop recording on active tab.' });
      } else {
        sendResponse({ ok: true });
      }
    });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// ── UPLOAD ALL DATA ──────────────────────────────────────────────
async function handleUploadData(request, sendResponse) {
  try {
    const storageData = await chrome.storage.local.get([
      'jam_token',
      'collected_logs',
      'collected_network',
      'collected_actions',
      'recording_start_time'
    ]);

    const authToken = storageData.jam_token;
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