import React from 'react';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Shield, Mail, Calendar, User, Key, RefreshCw, CheckCircle2 } from 'lucide-react';

export const ProfilePage = () => {
  const { profile, isLoading, error } = useProfile();
  const { logout } = useAuth();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        {/* Header section skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="h-9 w-52 bg-slate-200 rounded-xl animate-shimmer mb-3"></div>
            <div className="h-4 w-80 bg-slate-200 rounded-lg animate-shimmer"></div>
          </div>
          <div className="h-8 w-44 bg-slate-200 rounded-xl animate-shimmer self-start md:self-auto"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel skeleton */}
          <div className="md:col-span-1 space-y-6">
            <Card className="text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-slate-200 animate-shimmer mb-4"></div>
              <div className="h-5 w-28 bg-slate-200 rounded-md mb-2 animate-shimmer"></div>
              <div className="h-3 w-40 bg-slate-100 rounded-md mb-6 animate-shimmer"></div>
              <div className="w-full pt-4 border-t border-slate-100">
                <div className="h-10 w-full bg-slate-150 rounded-xl animate-shimmer"></div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="h-4 w-32 bg-slate-200 rounded-md mb-5 animate-shimmer"></div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><div className="h-3 w-16 bg-slate-150 rounded animate-shimmer"></div><div className="h-4 w-12 bg-slate-100 rounded animate-shimmer"></div></div>
                <div className="flex justify-between items-center"><div className="h-3 w-20 bg-slate-150 rounded animate-shimmer"></div><div className="h-3 w-16 bg-slate-100 rounded animate-shimmer"></div></div>
                <div className="flex justify-between items-center"><div className="h-3 w-24 bg-slate-150 rounded animate-shimmer"></div><div className="h-4 w-10 bg-slate-100 rounded animate-shimmer"></div></div>
              </div>
            </Card>
          </div>

          {/* Right panel skeleton */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-8">
              <div className="h-6 w-44 bg-slate-200 rounded-md mb-6 animate-shimmer pb-4 border-b border-slate-100"></div>
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-slate-150 rounded-xl flex-shrink-0 animate-shimmer"></div>
                    <div className="space-y-2 w-full">
                      <div className="h-3 w-24 bg-slate-150 rounded animate-shimmer"></div>
                      <div className="h-4 w-1/3 bg-slate-200 rounded animate-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto w-full">
        <Card className="text-center shadow-md">
          <div className="inline-flex p-3.5 bg-rose-50 text-rose-600 rounded-2xl mb-4 border border-rose-100 shadow-sm shadow-rose-100/50">
            <Shield className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-2">Error Loading Profile</h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin-hover" /> Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
      {/* Header section with welcoming */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            User Dashboard
          </h1>
          <p className="text-slate-500 mt-1.5 font-medium">
            Manage your account security and view your profile information.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-sm font-semibold self-start md:self-auto shadow-sm shadow-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-650 flex-shrink-0" />
          <span>Active Session Secured</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Side */}
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center flex flex-col items-center shadow-sm">
            {/* User avatar/initial bubble */}
            <div className="w-24 h-24 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-bold shadow-sm shadow-indigo-100/50 mb-4 select-none">
              {profile?.username?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mb-0.5 truncate max-w-full">{profile?.username}</h2>
            <p className="text-sm text-slate-500 mb-6 truncate max-w-full font-medium">{profile?.email}</p>
            <div className="w-full pt-4 border-t border-slate-100">
              <Button onClick={logout} variant="secondary" className="w-full cursor-pointer">
                Logout Session
              </Button>
            </div>
          </Card>

          <Card className="p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              <span>Security Status</span>
            </h3>
            <ul className="space-y-3.5 text-sm text-slate-700">
              <li className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">MFA Status</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/80 rounded-md text-xs font-semibold">Disabled</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">JWT Token</span>
                <span className="text-indigo-650 font-bold text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Verified
                </span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Account Status</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold border border-emerald-200">Active</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Profile Info Side */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">
              Account Information
            </h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200/60 flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</h4>
                  <p className="text-slate-800 font-bold mt-0.5 text-base">{profile?.username}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200/60 flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</h4>
                  <p className="text-slate-800 font-bold mt-0.5 text-base">{profile?.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200/60 flex-shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Member Since</h4>
                  <p className="text-slate-800 font-bold mt-0.5 text-base">{formatDate(profile?.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200/60 flex-shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div className="w-full min-w-0">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Account ID</h4>
                  <p className="text-slate-705 font-mono text-xs mt-1.5 truncate bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/60 w-fit max-w-full select-all">
                    {profile?._id}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
