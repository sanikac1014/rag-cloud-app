import React, { useState } from 'react';
import { EnvelopeIcon, ArrowLeftIcon, LinkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import FlywlLogo from './FlywlLogo';
import { apiForgotPassword } from '../services/api';

const ForgotPassword = ({ onGoToLogin }) => {
  const [email, setEmail] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }
    try {
      setIsLoading(true);
      const res = await apiForgotPassword(email);
      toast.success('If that email exists, a reset link was generated');
      if (res?.reset_link) setResetLink(res.reset_link);
    } catch (e) {
      toast.error('Failed to request password reset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <FlywlLogo size="xl" showText variant="dark" className="drop-shadow-lg" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Forgot password</h2>
          <p className="text-flywl-grey-300 text-base mt-2">Enter your account email to reset your password</p>
        </div>

        <div className="bg-flywl-grey-800 rounded-2xl shadow-flywl p-8 border border-flywl-grey-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-flywl-grey-200 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-flywl-grey-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary">
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>

            <button type="button" onClick={onGoToLogin} className="w-full btn-secondary flex items-center justify-center">
              <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to Sign in
            </button>
          </form>

          {resetLink && (
            <div className="mt-6 p-4 bg-flywl-grey-900 rounded-lg border border-flywl-grey-600 text-sm text-flywl-grey-300">
              <div className="flex items-center">
                <LinkIcon className="w-4 h-4 text-flywl-orange-400 mr-2" />
                <span className="mr-2">Reset link (dev):</span>
                <a href={resetLink} className="text-flywl-orange-400 hover:underline break-all">{resetLink}</a>
              </div>
              <p className="text-xs text-flywl-grey-500 mt-2">This is shown for testing locally instead of sending an email.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword; 