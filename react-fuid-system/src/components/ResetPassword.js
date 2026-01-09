import React, { useEffect, useState } from 'react';
import { KeyIcon, EyeIcon, EyeSlashIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import FlywlLogo from './FlywlLogo';
import { apiResetPassword } from '../services/api';

const ResetPassword = ({ onGoToLogin }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('reset_token') || '';
    setToken(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setIsLoading(true);
      const res = await apiResetPassword(token, password);
      if (res?.success) {
        toast.success('Password updated! Please sign in.');
        onGoToLogin && onGoToLogin();
      } else {
        toast.error(res?.error || 'Failed to reset password');
      }
    } catch (e) {
      toast.error('Failed to reset password');
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
          <h2 className="text-3xl font-bold text-white mb-2">Reset password</h2>
          <p className="text-flywl-grey-300 text-base mt-2">Create a new password for your account</p>
        </div>

        <div className="bg-flywl-grey-800 rounded-2xl shadow-flywl p-8 border border-flywl-grey-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-flywl-grey-200 mb-2">New password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Enter new password"
                  required
                />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-flywl-grey-400 hover:text-white">
                  {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-flywl-grey-400 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-flywl-grey-200 mb-2">Confirm new password</label>
              <div className="relative">
                <input
                  type={show2 ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Re-type new password"
                  required
                />
                <button type="button" onClick={() => setShow2(!show2)} className="absolute right-3 top-1/2 -translate-y-1/2 text-flywl-grey-400 hover:text-white">
                  {show2 ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary">
              {isLoading ? 'Updating...' : 'Update password'}
            </button>
            <button type="button" onClick={onGoToLogin} className="w-full btn-secondary">Back to Sign in</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 