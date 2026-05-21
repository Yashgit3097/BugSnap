import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Fingerprint } from 'lucide-react';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0a13] flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-violet-900/30 border-t-violet-600 animate-spin"></div>
          <Fingerprint className="w-8 h-8 text-violet-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-gray-400 text-sm font-medium tracking-wide animate-pulse">
          Securing session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
