# DebugSnap (Full-Stack Session Replay & Developer Observability Tool)

DebugSnap is a full-stack, real-time developer observability SaaS inspired by Jam.dev and Chrome DevTools. It lets users record browser sessions (recording screens, mouse actions, console logs, and API network requests) and replay them synchronously in a highly polished, cyberpunk-themed developer dashboard.

---

## 🏗️ Architecture & Data Flow

```
                  ┌───────────────────────┐
                  │   Chrome Extension    │
                  │  (client-extension)   │
                  └──────────┬────────────┘
                             │
                             │ 1. Screencast API, DOM actions,
                             │    interfered console logs & HTTP fetch
                             ▼
  ┌───────────────────────────────────────────────────────┐
  │                    Backend Server                     │
  │                       (server)                        │
  └──────────┬─────────────────────────┬──────────────────┘
             │                         │
             │ 2. Save logs to DB      │ 3. Upload screen MP4
             ▼                         ▼
   ┌───────────────────┐     ┌───────────────────┐
   │      MongoDB      │     │    Cloudinary     │
   │     (jamDB)       │     │  (Video Storage)  │
   └───────────────────┘     └───────────────────┘
             │                         │
             │ 4. Read logs            │ 5. Read Video URL
             └───────────┬─────────────┘
                         │
                         ▼
             ┌─────────────────────────┐
             │   Frontend Dashboard    │
             │      (client-web)       │
             └─────────────────────────┘
```

1. **Capture**: The **Chrome Extension** captures mouse interactions, console messages, and page HTTP requests by injecting code and intercepting browser API calls, while capturing the screen via browser media streams.
2. **Storage**: Video is uploaded to **Cloudinary** and logs are posted to a **MongoDB** database via the **Express REST API**.
3. **Playback**: The **React Frontend Dashboard** synchronizes the logs and requests to the video elapsed time during replay, simulating a real Chrome DevTools experience side-by-side.

---

## 📂 Repository Structure

* **`client-extension/`**: Manifest V3 Chrome Extension that records screen and captures browser logs.
* **`client-web/`**: Vite + React single page application for user dashboard and developer inspector views.
* **`server/`**: Express.js server connecting with MongoDB and Cloudinary.

---

## 🛠️ Technology Stack & Dependencies

### 1. Backend Server (`server`)
An Express API and Socket.io server written in ES6 Modules Node.js.
* **Node.js** (v18+) & **Express.js** (Web framework)
* **MongoDB** & **Mongoose** (ODM Database layer)
* **Socket.io** (Websockets server for live-sync recording updates)
* **Multer** & **Cloudinary** (Multipart form-data processor and video asset hosting)
* **jsonwebtoken** (JWT tokens authentication) & **bcryptjs** (password hashing)
* **dotenv** & **cors** (configuration parameters and cross-origin resource sharing headers)

### 2. Frontend Dashboard (`client-web`)
Vite-powered single page application built on React 19 and custom cyberpunk glassmorphic CSS designs.
* **React 19** & **React DOM** (component rendering)
* **Vite 5** (Fast ES bundler and dev server)
* **Tailwind CSS v4** & **Vanilla CSS custom variables** (UI themes)
* **Axios** (REST API HTTP client)
* **Lucide React** (Modern line vector icons pack)
* **Socket.io-client** (Realtime sync recording stream alerts)
* **React Router DOM** (Single Page App browser routing)

### 3. Chrome Extension (`client-extension`)
Manifest V3 browser extension built with vanilla JS and Chrome Extension APIs.
* **manifest.json** (v3 rules metadata)
* **Inject Scripts** (intercepts `window.fetch`, `XMLHttpRequests`, and standard `console.log/warn/error` channels)
* **Content Scripts** (listens for DOM interactions and manages background worker syncs)
* **Service Workers** (background scripts managing capture streams, REST API updates, and uploads)
* **HTML5 MediaRecorder & Screen Capture API** (captures tab screen stream)

---

## 🚀 Setup & Installation

Follow these steps to run DebugSnap locally on your computer.

### Prerequisites
* Install [Node.js](https://nodejs.org/) (version 18 or newer recommended).
* Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) locally, or prepare a MongoDB Atlas connection string.
* Ensure you have a modern Chromium browser installed (e.g., Google Chrome, Brave, Microsoft Edge).

---

### Step 1: Configure & Start Backend (`server`)

1. Open your terminal and navigate to the server folder:
   ```bash
   cd server
   ```
2. Install the node packages:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root of the `server/` directory and configure the environment variables:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/jamDB
   JWT_SECRET=supersecretkey_debugsnap
   NODE_ENV=development

   # Cloudinary credentials for hosting replay videos
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
4. Start the backend development server using `nodemon`:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`.

---

### Step 2: Configure & Start Frontend Dashboard (`client-web`)

1. Open a new terminal tab and navigate to the web client folder:
   ```bash
   cd client-web
   ```
2. Install the client packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. The dashboard will compile and launch. Open `http://localhost:5174` (or the port specified in terminal output) in your browser.

---

### Step 3: Load the Chrome Extension (`client-extension`)

1. Open Google Chrome.
2. In the URL address bar, enter: `chrome://extensions/`
3. Turn on the **"Developer mode"** toggle in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. In the file explorer popup, select the `client-extension` directory of this project.
6. The DebugSnap recording extension icon will appear in your browser extension toolbar list!

---

## 🎮 How to Use DebugSnap

1. **Dashboard Registration**:
   Open `http://localhost:5174` and sign up for a new account.
2. **Extension Authentication**:
   Click on the DebugSnap Chrome Extension in your toolbar. The extension will automatically detect your active login session from the web dashboard.
3. **Capture a Recording**:
   Navigate to any webpage you want to debug. Click the extension popup and click **Start Recording**. Authorize the Chrome prompt to capture your tab/screen.
4. **Interact and Simulate Bugs**:
   Interact with the page (click buttons, write inputs, trigger API calls, or print `console.logs`). 
5. **Complete and Share**:
   Click the extension popup and hit **Stop Recording**. The extension will bundle all logs and action events, package the screen video, and push them to the Express server.
6. **Replay & Inspect**:
   The session will immediately populate in your Dashboard. Click on the session card. Replay the video, inspect the timeline, filter console errors, and select API rows to view Chrome-style General parameters, Query strings, Payloads, Response JSON trees, and raw response strings!
