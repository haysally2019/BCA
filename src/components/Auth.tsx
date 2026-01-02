import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Added useNavigate
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { validateEmail, validatePassword, getErrorMessage } from '../lib/errorUtils';
import toast from 'react-hot-toast';

const Auth: React.FC = () => {
  console.log("[Auth] Rendering Auth component");
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const { signIn, signUp, user } = useAuthStore();

  console.log("[Auth] User state:", user ? "Logged in" : "Logged out");

  // Automatically redirect to dashboard when user is logged in
  useEffect(() => {
    if (user) {
      console.log("[Auth] User detected, redirecting to dashboard");
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      toast.error(emailValidation.error!);
      return;
    }

    if (!isLogin) {
      if (!formData.name || formData.name.trim() === '') {
        toast.error('Name is required');
        return;
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        toast.error(passwordValidation.errors[0]);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        toast.success('Welcome back!');
        // Navigation will be handled by the useEffect above when 'user' state updates
      } else {
        console.log('[Auth] Starting signup with:', { email: formData.email, name: formData.name });
        await signUp(formData.email, formData.password, formData.name, 'sales_rep');
        toast.success('Account created successfully! Your affiliate account will be set up automatically.');
      }
    } catch (error: any) {
      console.error('[Auth] Signup/Login error:', error);

      let errorMessage = getErrorMessage(error);

      if (errorMessage.includes('already registered') || errorMessage.includes('already been registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please check your email to confirm your account.';
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // If user is already authenticated, don't render the form (prevents flash)
  if (user) {
    return null; 
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        
        {/* Background decoration (subtle glow) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-4xl opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-10 right-10 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-md w-full relative z-10">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-slate-900 rounded-2xl border border-slate-800 mb-4 shadow-lg">
              <img 
                src="/bca.png" 
                alt="Blue Collar Academy Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Sales Portal
            </h1>
            <p className="text-slate-400">
              {isLogin ? 'Welcome back! Please sign in to continue.' : 'Join the team and start tracking your sales.'}
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required={!isLogin}
                      className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm outline-none"
                      placeholder="John Smith"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm outline-none"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 mt-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-800 text-center">
              <p className="text-slate-400 text-sm">
                {isLogin ? "Don't have an account yet?" : 'Already have an account?'}
              </p>
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="mt-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors hover:underline"
              >
                {isLogin ? 'Create a sales rep account' : 'Sign in to your account'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="mt-6 p-5 bg-slate-900/50 border border-slate-800 rounded-xl backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                Sales Rep Account Features
              </h4>
              <ul className="space-y-2">
                {[
                  'Lead management & tracking',
                  'Pipeline visibility',
                  'Commission dashboard',
                  'Performance metrics'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} Blue Collar Academy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;