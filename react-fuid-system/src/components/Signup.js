import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Signup = ({ onGoToLogin }) => {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const isBlockedDomain = (email) => email.trim().toLowerCase().endsWith('@gmail.com');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailRegex.test(form.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (isBlockedDomain(form.email)) {
      toast.error('Please use your work email. gmail.com addresses are not allowed.');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      await signup({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password
      });
      toast.success('Account created successfully! Please sign in.');
      onGoToLogin && onGoToLogin();
    } catch (err) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Create your account</h2>
          <p className="text-flywl-grey-300 text-base mt-2">Start using the System</p>
        </div>

        {/* Signup Form */}
        <div className="bg-flywl-grey-800 rounded-2xl shadow-flywl p-8 border border-flywl-grey-700">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-flywl-grey-200 mb-2">First Name</label>
                <div className="relative">
                  <input
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="John"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-flywl-grey-200 mb-2">Last Name</label>
                <div className="relative">
                  <input
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-flywl-grey-200 mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-flywl-grey-400" />
                </div>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="you@company.com"
                  required
                />
              </div>
              <p className="text-xs text-flywl-grey-400 mt-1">Use your work email (gmail.com not allowed)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-flywl-grey-200 mb-2">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="Create a password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-flywl-grey-400 hover:text-flywl-orange-400 transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-flywl-grey-400 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-flywl-grey-200 mb-2">Confirm Password</label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    className="input-field pr-10"
                    placeholder="Re-type password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-flywl-grey-400 hover:text-flywl-orange-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeSlashIcon className="h-5 h-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full btn-primary">
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-flywl-grey-300">
            Already have an account?{' '}
            <button onClick={onGoToLogin} className="text-flywl-orange-400 hover:underline">Sign in</button>
          </div>
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

export default Signup; 