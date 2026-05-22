# DebugSnap - Backend Server

Welcome to the backend server! This is built using **Node.js** and **Express.js**. If you are a beginner, this guide will explain exactly what is happening here.

## 📁 What is this folder?

This folder contains the brain of our application. It handles:
1. **User Accounts**: Logging in and signing up.
2. **Sessions**: Saving the bug recording sessions (video, logs, network requests).
3. **Database**: Connecting to MongoDB to store all this data.
4. **Cloudinary**: Uploading the recorded videos to Cloudinary so we can play them back.

## 🛠️ How it works

We use the **MVC (Model-View-Controller)** pattern, but since this is an API, we don't have "Views", just Models, Controllers, and Routes.

### 1. Models (`/models`)
Models describe how our data looks in the database.
- `User.js`: Saves the user's name, email, and hashed password.
- `Session.js`: Saves the recording details (duration, browser info, video URL).
- `ConsoleLog.js`, `NetworkLog.js`, `UserAction.js`: These save all the synchronized data captured by the Chrome extension.

### 2. Routes (`/routes`)
Routes are like URLs that our frontend and Chrome extension will call.
- `POST /api/auth/login`: To log in.
- `POST /api/sessions/create`: Extension calls this when you hit "Start Recording".
- `POST /api/sessions/:id/complete`: Extension calls this when you stop recording, and it sends all the logs!

### 3. Controllers (`/controllers`)
Controllers contain the actual logic for the routes. If a route is a doorway, the controller is the person inside doing the work.
- `sessionController.js`: Takes the logs sent by the extension and saves them to MongoDB.

### 4. Middleware (`/middlewares`)
Middlewares run *before* the controller.
- `authMiddleware.js`: Checks if the user is logged in (has a valid JWT token) before letting them create a session.
- `uploadMiddleware.js`: Uses `multer` to temporarily save the uploaded video before we send it to Cloudinary.

## 🚀 How to run it

1. Make sure you have a `.env` file with these variables:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

2. Install dependencies:
```bash
npm install
```

3. Start the server in development mode:
```bash
npm run dev
```

The server will start on `http://localhost:5000`.
