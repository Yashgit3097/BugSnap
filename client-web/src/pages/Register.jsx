import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BugPlay } from 'lucide-react';

/**
 * Register Component
 * Provides a clean premium light-mode registration interface.
 */
const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, register } = useAuth();
  const navigate = useNavigate();

  // If the user is already logged in, redirect them to the dashboard
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, password);
      console.log('Registration successful');
      navigate('/');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 bg-grid-glow relative">
      <div className="glass-panel p-8 rounded-2xl shadow-sm w-full max-w-md border border-slate-200 bg-white relative z-10">
        <div className="flex justify-center mb-6 text-indigo-600">
          <BugPlay size={48} />
        </div>
        <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">Create Account</h2>
        {error && <p className="text-rose-605 text-center mb-4 bg-rose-50 border border-rose-100 p-2.5 rounded text-sm font-medium">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-1">Username</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="developer_jane"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-500 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors duration-200 shadow-md text-sm mt-2"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
