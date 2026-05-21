import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LogIn, UserPlus, Fingerprint } from 'lucide-react';

export const Layout = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-grid relative flex flex-col justify-between text-slate-900">
      {/* Background soft ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
 
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-200/80 bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="p-2 bg-indigo-600 rounded-xl text-white group-hover:scale-105 transition-all shadow-sm shadow-indigo-150">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  JAM<span className="text-indigo-600">.auth</span>
                </span>
              </Link>
            </div>
 
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-xl transition duration-200"
                  >
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>{user?.username}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl cursor-pointer transition duration-200"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-xl transition duration-200"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition duration-200 shadow-sm shadow-indigo-100 hover:shadow"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
 
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col justify-center z-10 w-full py-12 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
 
      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/40 py-6 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} JAM.auth. Secure authentication platform.</p>
        </div>
      </footer>
    </div>
  );
};
