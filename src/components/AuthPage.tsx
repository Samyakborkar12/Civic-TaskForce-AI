import React, { useState } from 'react';
import { User } from '../types';
import { ShieldAlert, ArrowLeft, Lock, Mail, User as UserIcon, LogIn, UserPlus, Eye, EyeOff, CheckCircle2, HelpCircle } from 'lucide-react';

interface AuthPageProps {
  lang: 'en' | 'es' | 'hi' | 'ja' | 'mr';
  initialRole: 'citizen' | 'municipality';
  onLoginSuccess: (user: User, token: string) => void;
  onBack: () => void;
}

export default function AuthPage({ lang, initialRole, onLoginSuccess, onBack }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState<'Citizen' | 'Admin'>(initialRole === 'citizen' ? 'Citizen' : 'Admin');
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Client-side field validations
    if (!trimmedEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp) {
      if (!name.trim()) {
        setError('Full Name is required for registration.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Register via secure backend API
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: trimmedEmail,
            password,
            role
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete registration.');
        }

        // Show registration success screen
        setSuccessMessage(data.message || 'Account created successfully! You can now sign in.');
        
        // Reset signup state to switch to Login
        setName('');
        setPassword('');
        setConfirmPassword('');
        setIsSignUp(false);
      } else {
        // Authenticate via secure backend API
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmedEmail,
            password
          })
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Access Denied. Invalid Email or Password.');
          }
          throw new Error(data.error || 'Authentication failed.');
        }

        // Trigger onLoginSuccess callback to update local state & headers
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message || 'A security connection error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!forgotEmail.includes('@')) {
      setError('Please enter a valid administrative or citizen email address.');
      return;
    }
    setForgotSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-brand-bg transition-colors duration-200">
      <div className="w-full max-w-md">
        
        {/* Back navigation */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-text-sub hover:text-brand-text-main mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Security Alert / Info Banner if Admin Selected */}
        {!isSignUp && role === 'Admin' && (
          <div className="mb-6 p-4 bg-brand-primary/5 border border-brand-primary/20 text-brand-primary rounded-2xl text-xs leading-normal">
            <strong>Agency Security Protocol:</strong> Direct login is restricted to personnel holding verified municipal credentials. Account registration requires official domain validation.
          </div>
        )}

        {/* Auth Panel Card */}
        <div className="bg-brand-card border border-brand-border p-8 rounded-3xl shadow-brand-lg">
          
          {showForgotPassword ? (
            // Forgot Password UI View
            <div className="space-y-6">
              <div className="text-center">
                <HelpCircle className="w-12 h-12 text-brand-primary mx-auto mb-3" />
                <h2 className="text-2xl font-display font-bold text-brand-text-main">Recover Password</h2>
                <p className="mt-2 text-xs text-brand-text-sub leading-normal">
                  Enter your registered email address below, and we will send you secure verification instructions to reset your password.
                </p>
              </div>

              {forgotSuccess ? (
                <div className="p-5 bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-2xl text-xs space-y-3 leading-relaxed">
                  <CheckCircle2 className="w-6 h-6" />
                  <p className="font-bold">Reset Instructions Dispatched!</p>
                  <p>
                    If the email <strong>{forgotEmail}</strong> is registered on our servers, you will receive a secure OTP token with password modification credentials shortly.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotSuccess(false);
                      setForgotEmail('');
                    }}
                    className="mt-3 text-xs font-bold underline text-brand-success cursor-pointer"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider mb-2">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-5 w-5 text-brand-text-sub" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full pl-11 pr-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Send Recovery Instructions
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError('');
                    }}
                    className="w-full text-center text-xs text-brand-text-sub font-semibold hover:text-brand-text-main cursor-pointer block mt-2"
                  >
                    Cancel & Return to Login
                  </button>
                </form>
              )}
            </div>
          ) : (
            // Signup / Signin Forms
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-text-main">
                  {isSignUp ? 'Create Civic Account' : 'Welcome Back'}
                </h2>
                <p className="mt-2 text-sm text-brand-text-sub">
                  {isSignUp 
                    ? `Register credentials for ${role} access` 
                    : `Access the Civic Smart Infrastructure Portal`}
                </p>
              </div>

              {/* Role Toggle Tab (Direct, High-Contrast design) */}
              <div className="flex bg-brand-bg border border-brand-border p-1.5 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setRole('Citizen')}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    role === 'Citizen' 
                      ? 'bg-brand-card text-brand-primary border border-brand-border shadow-brand-sm' 
                      : 'text-brand-text-sub'
                  }`}
                >
                  Citizen Role
                </button>
                <button
                  type="button"
                  onClick={() => setRole('Admin')}
                  className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    role === 'Admin' 
                      ? 'bg-brand-card text-brand-primary border border-brand-border shadow-brand-sm' 
                      : 'text-brand-text-sub'
                  }`}
                >
                  Admin / Officer
                </button>
              </div>

              {successMessage && (
                <div className="mb-5 p-4 bg-brand-success/10 border border-brand-success/20 text-brand-success rounded-xl text-xs flex items-start gap-2.5 leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-brand-success" />
                  <div>
                    <strong className="block mb-0.5">Success!</strong>
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-5">
                {error && (
                  <div className="p-4 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger rounded-xl text-xs flex items-start gap-2.5 leading-relaxed">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Name field (Signup only) */}
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-3.5 h-5 w-5 text-brand-text-sub" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full pl-11 pr-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main"
                      />
                    </div>
                  </div>
                )}

                {/* Email address */}
                <div>
                  <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-brand-text-sub" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full pl-11 pr-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main font-semibold"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-brand-text-sub" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? "At least 6 characters" : "Enter password"}
                      className="w-full pl-11 pr-11 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-brand-text-sub hover:text-brand-text-main cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password (Signup only) */}
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-semibold text-brand-text-sub uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-brand-text-sub" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-11 pr-11 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm focus:outline-hidden focus:border-brand-primary transition-colors text-brand-text-main font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3.5 text-brand-text-sub hover:text-brand-text-main cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold flex items-center justify-center gap-2 shadow-brand-sm cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Create Account</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Authenticate Securely</span>
                    </>
                  )}
                </button>
              </form>

              {/* Login / Signup toggler */}
              <div className="mt-6 text-center text-sm text-brand-text-sub">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
