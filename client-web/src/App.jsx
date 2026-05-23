import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Intro from './pages/Intro';
import Dashboard from './pages/Dashboard';
import SessionReplay from './pages/SessionReplay';
import './App.css'; // Just in case there are global styles

// Dynamically renders Dashboard if logged in, otherwise renders the Intro page
const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#07070d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a5b4fc',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        Loading DebugSnap...
      </div>
    );
  }
  return user ? <Dashboard /> : <Intro defaultTab={null} />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/login" element={<Intro defaultTab="login" />} />
          <Route path="/register" element={<Intro defaultTab="register" />} />

          <Route path="/session/:publicId" element={<SessionReplay />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

