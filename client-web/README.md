# DebugSnap - Frontend Dashboard

Welcome to the frontend dashboard! This is the place where users log in, see their recordings, and share them with developers. 

## 🛠️ Built With
- **React.js**: The library we use to build the user interface.
- **Tailwind CSS**: A tool that helps us style our components quickly without writing lots of custom CSS files.
- **Axios**: A library used to make HTTP requests (like fetching data) to our backend server.

## 📂 Folder Structure

The code lives inside the `src` folder. Here's a breakdown of what each part does:

### 1. `context/AuthContext.jsx`
This is a very important file! It stores whether the user is logged in or not. Think of it like a global variable that all our pages can read. It saves the `JWT token` in the browser's `localStorage` so the user stays logged in even if they refresh the page.

### 2. `pages/`
These are the main screens of our application:
- **`Login.jsx` & `Register.jsx`**: Simple forms for users to sign up and log in.
- **`Dashboard.jsx`**: The main page where users see a grid of all their recorded bug sessions.
- **`SessionReplay.jsx`**: The most magical page! It plays the video and shows the console logs, network requests, and user actions happening at the *exact same time* as the video playback.

### 3. `App.jsx`
This is the entry point. It sets up our **Router** (which handles moving between pages without reloading the browser) and wraps everything in the `AuthProvider` so the whole app knows who is logged in.

## 🏃‍♂️ How to Run

1. Open a terminal in this folder (`client-web`).
2. Install the packages:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```
4. Open your browser to the URL it gives you (usually `http://localhost:5173`).
