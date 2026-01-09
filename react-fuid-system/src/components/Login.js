import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';

const Login = ({ onGoToSignup, onGoToForgot }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const isBlockedDomain = (addr) => addr.trim().toLowerCase().endsWith('@gmail.com');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (isBlockedDomain(email)) {
        throw new Error('Please use your work email. gmail.com addresses are not allowed.');
      }
      await login(email, password);
      toast.success('Login successful! Welcome to the System');
    } catch (err) {
      toast.error(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-flywl-white-400 mb-2">Welcome Back</h2>
          <p className="text-white text-base mt-2">Sign in to access the System</p>
        </div>

        {/* Login Form */}
        <div className="bg-flywl-grey-800 rounded-2xl shadow-flywl p-8 border border-flywl-grey-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-flywl-grey-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-flywl-grey-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <p className="text-xs text-flywl-grey-400 mt-1">Use your work email (gmail.com not allowed)</p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-flywl-grey-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-flywl-grey-400 hover:text-flywl-orange-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 h-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-flywl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </span>
            </button>

            {/* Signup Link */}
            <div className="mt-6 p-4 bg-flywl-grey-900 rounded-lg border border-flywl-grey-600 text-sm text-flywl-grey-300">
              Don't have an account?{' '}
              <button type="button" onClick={onGoToSignup} className="text-flywl-orange-400 hover:underline">
                Create one
              </button>
              <span className="mx-2">•</span>
              <button type="button" onClick={typeof onGoToForgot !== 'undefined' ? onGoToForgot : undefined} className="text-flywl-orange-400 hover:underline">
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-flywl-grey-400">
            Powered by <span className="text-gradient font-semibold"></span> • Secure Cloud Management
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 