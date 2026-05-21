import React from 'react';
import { Link } from 'react-router-dom';
import { useRegisterForm } from '../hooks/useRegisterForm';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { UserPlus } from 'lucide-react';

export const RegisterPage = () => {
  const { formData, errors, generalError, isLoading, handleChange, handleSubmit } = useRegisterForm();

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-violet-50 text-violet-600 rounded-2xl mb-4 border border-violet-100/80 shadow-sm shadow-violet-100">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Sign up to access our protected profile system
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
            label="Username"
            id="username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="johndoe"
            error={errors.username}
            required
          />

          <Input
            label="Email Address"
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
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

          <Input
            label="Confirm Password"
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" isLoading={isLoading} className="mt-6">
            Register
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-medium">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-violet-600 hover:text-violet-755 transition duration-150"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
};
