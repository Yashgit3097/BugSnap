# DebugSnap - Chrome Extension

Welcome to the Chrome Extension! This is the tool that lives in your browser and magically records bugs.

## 🛠️ How it works (Manifest V3)

A Chrome extension is made of a few different pieces that talk to each other:

### 1. `manifest.json`
This is the rulebook. It tells Chrome the name of the extension, what permissions it needs, and where all the files are.

### 2. `popup.js` & `popup.html`
This is the UI that drops down when you click the extension icon. It's very simple: a button to start recording and a button to stop.

### 3. `background.js` (Service Worker)
This is the boss. It runs invisibly in the background. It manages the state (are we recording right now?) and handles communicating with our backend server (like uploading the video when we're done).

### 4. `content.js`
This script runs *on the webpage* you are looking at. It listens for your clicks and keyboard inputs. When you click "Start Recording", this script also asks the browser to start capturing your screen.

### 5. `inject.js`
This is a special script. `content.js` cannot read the page's `console.log` directly. So `content.js` injects `inject.js` directly into the page's DNA. `inject.js` overwrites `console.log` and `fetch` so it can intercept every log and network request, and then passes them back to `content.js`.

## 🏃‍♂️ How to install it

Since this is a development version, you have to install it manually:

1. Open Google Chrome.
2. Go to `chrome://extensions/` in your address bar.
3. Turn on **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** in the top left.
5. Select this `client-extension` folder.

You should now see the extension icon in your toolbar!

## Important Note about Auth
To use the extension, you must first run the `client-web` dashboard and log in. The extension will automatically detect your login from `http://localhost:5173`.
