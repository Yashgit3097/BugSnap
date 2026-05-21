import React from 'react';
import { Link } from 'react-router-dom';
import { useLoginForm } from '../hooks/useLoginForm';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Fingerprint } from 'lucide-react';

export const LoginPage = () => {
  const { formData, errors, generalError, isLoading, handleChange, handleSubmit } = useLoginForm();

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 border border-indigo-100/80 shadow-sm shadow-indigo-100">
            <Fingerprint className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Sign in to access your secure profile
          </p>
        </div>

        {generalError && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200/80 rounded-xl text-sm text-rose-800 font-semibold flex items-center gap-2.5 shadow-sm shadow-rose-100/50">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0"></div>
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@example.com"
            error={errors.email}
            required
          />

          <Input
            label="Password"
            id="password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            error={errors.password}
            required
          />

          <Button type="submit" isLoading={isLoading} className="mt-6">
            Sign In
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-medium">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-bold text-indigo-600 hover:text-indigo-700 transition duration-150"
          >
            Create account
          </Link>
        </p>
      </Card>
    </div>
  );
};
