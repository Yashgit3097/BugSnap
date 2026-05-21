/* ================================================================
   offscreen.js  –  Runs inside the Extension Offscreen Document
   
   RESPONSIBILITIES:
   1. Captures media stream using streamId from chooseDesktopMedia.
   2. Handles recording in the background, surviving page reloads.
   3. Sends final recorded video base64 Data URL to background worker.
   ================================================================ */

let mediaRecorder = null;
let recordedChunks = [];
let mediaStream = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_RECORDING_IN_OFFSCREEN') {
    startRecording(request.streamId, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.type === 'STOP_RECORDING_IN_OFFSCREEN') {
    stopRecording(sendResponse);
    return true; // Keep channel open for async response
  }
});

// Notify background worker that the offscreen document is ready
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' }).catch(() => {});

async function startRecording(streamId, sendResponse) {
  try {
    recordedChunks = [];
    
    // Capture user's selected screen, window, or tab via streamId
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
      }
    };

    // If screen capture is stopped natively via Chrome's Stop Sharing toolbar
    const videoTracks = mediaStream.getVideoTracks();
    if (videoTracks && videoTracks.length > 0) {
      videoTracks[0].addEventListener('ended', () => {
        chrome.runtime.sendMessage({ type: 'NATIVE_RECORDING_STOPPED' });
      });
    }

    mediaRecorder.start(1000);
    sendResponse({ ok: true });

  } catch (err) {
    console.error('Error starting media capture in offscreen:', err);
    await chrome.storage.local.set({ last_recording_error: err.message || err.toString() });
    sendResponse({ error: err.message || err.toString() });
  }
}

function stopRecording(sendResponse) {
  if (!mediaRecorder) {
    sendResponse({ error: 'Media recorder is not active.' });
    return;
  }

  const processRecording = () => {
    try {
      if (recordedChunks.length === 0) {
        sendResponse({ error: 'No video data was recorded.' });
        return;
      }

      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      
      // Stop all tracks to release the stream resources
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }

      // Convert video blob to base64 Data URL for upload
      const reader = new FileReader();
      reader.onloadend = () => {
        sendResponse({ videoDataUrl: reader.result });
      };
      reader.onerror = () => {
        sendResponse({ error: 'Failed to read recorded video blob.' });
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      sendResponse({ error: e.message });
    }
  };

  if (mediaRecorder.state === 'inactive') {
    // If it has already stopped natively (e.g. tab reload or click Stop sharing),
    // immediately process the chunks we have.
    processRecording();
  } else {
    // Otherwise, assign onstop and stop it.
    mediaRecorder.onstop = processRecording;
    mediaRecorder.stop();
  }
}
