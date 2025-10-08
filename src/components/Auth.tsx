import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, Building2, Target, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { validateEmail, validatePassword, getErrorMessage } from '../lib/errorUtils';
import toast from 'react-hot-toast';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'management' | 'sales_rep'>('sales_rep');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    affiliatewp_id: ''
  });

  const { signIn, signUp, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
      } else {
        const affiliatewpId = formData.affiliatewp_id ? parseInt(formData.affiliatewp_id) : undefined;
        await signUp(formData.email, formData.password, formData.name, userType, affiliatewpId);
        toast.success('Account created successfully!');
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error));
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

  if (user) {
    return null; // User is authenticated, main app will render
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-academy-blue-900 via-academy-blue-800 to-academy-red-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mx-auto">
            <img 
              src="/bca.png" 
              alt="Blue Collar Academy Logo" 
              className="w-48 h-48 object-contain mb-4"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sales Management Portal</h1>
          <p className="text-blue-200">Sign in to access your dashboard</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-xl shadow-2xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-600">
              {isLogin ? 'Sign in to your account' : 'Choose your account type and get started'}
            </p>
          </div>

          {!isLogin && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Account Type</label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('sales_rep')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    userType === 'sales_rep' 
                      ? 'border-academy-blue-600 bg-academy-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Target className="w-5 h-5 text-academy-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Sales Rep</div>
                      <div className="text-sm text-gray-600">Lead management, pipeline tracking, and personal performance</div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('management')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    userType === 'management' 
                      ? 'border-academy-blue-600 bg-academy-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-academy-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Admin/Management</div>
                      <div className="text-sm text-gray-600">Team management, advanced metrics, and full system access</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {!isLogin && userType === 'sales_rep' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AffiliateWP ID (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="number"
                  name="affiliatewp_id"
                  value={formData.affiliatewp_id}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-academy-blue-600 focus:border-academy-blue-600 transition-all duration-200"
                  placeholder="12345"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your AffiliateWP ID to link commission tracking
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {userType === 'sales_rep' ? 'Full Name' : 'Name'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required={!isLogin}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-academy-blue-600 focus:border-academy-blue-600 transition-all duration-200"
                    placeholder={userType === 'sales_rep' ? 'John Smith' : 'Your Name'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-academy-blue-600 focus:border-academy-blue-600 transition-all duration-200"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-academy-blue-600 focus:border-academy-blue-600 transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-academy-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-academy-blue-700 focus:ring-2 focus:ring-academy-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-academy-blue-600 hover:text-academy-blue-700 font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>

          {!isLogin && (
            <div className="mt-6 p-4 bg-academy-blue-50 rounded-lg">
              <h4 className="font-medium text-academy-blue-900 mb-2">
                {userType === 'management' ? 'Admin/Management Features:' : 'Sales Rep Features:'}
              </h4>
              <ul className="text-sm text-academy-blue-800 space-y-1">
                {userType === 'management' ? (
                  <>
                    <li>• Team member management and oversight</li>
                    <li>• Advanced metric tracking and analytics</li>
                    <li>• Commission management and reporting</li>
                    <li>• System administration and settings</li>
                    <li>• Lead assignment and territory management</li>
                  </>
                ) : (
                  <>
                    <li>• Personal lead management and tracking</li>
                    <li>• Individual sales pipeline management</li>
                    <li>• Personal commission tracking</li>
                    <li>• Individual performance metrics</li>
                    <li>• Customer communication tools</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;