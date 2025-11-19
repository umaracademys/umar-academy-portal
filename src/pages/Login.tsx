import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import DebugPanel from '../components/DebugPanel';

const Login: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setLoginError('Please enter a valid email address');
      return;
    }
    
    if (!password || password.length < 3) {
      setLoginError('Password must be at least 3 characters long');
      return;
    }
    
    if (!role) {
      setLoginError('Please select an account type');
      return;
    }
    
    setIsLoading(true);
    try {
      const success = await login(email, password, role);
      
      if (!success) {
        setLoginError(error || 'Invalid credentials. Please check your email, password, and account type.');
      }
    } catch (err) {
      console.error('❌ Login error caught:', err);
      setLoginError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#2E4D32' }}>
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Umar Academy</h1>
          <div className="w-20 h-1 mb-6" style={{ backgroundColor: '#E7AA39' }}></div>
          <p className="text-xl text-white opacity-90 leading-relaxed">
            Excellence in Education.<br />
            Empowering Students, Teachers & Administrators.
          </p>
        </div>
        <div className="text-white text-sm opacity-75">
          © 2025 Umar Academy. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#2E4D32' }}>Umar Academy</h1>
            <div className="w-16 h-1 mx-auto" style={{ backgroundColor: '#E7AA39' }}></div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600 mt-1">Please sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {loginError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
                  <p className="text-sm font-medium">{loginError}</p>
                </div>
              )}
              
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['student', 'teacher', 'admin', 'superadmin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-3 px-4 rounded-lg font-semibold capitalize transition-all text-sm border-2 ${
                        role === r
                          ? 'border-transparent text-white shadow-md'
                          : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                      }`}
                      style={role === r ? { backgroundColor: r === 'superadmin' ? '#dc2626' : '#2E4D32' } : {}}
                    >
                      {r === 'superadmin' ? 'Super Admin' : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                  placeholder="your.email@umaracademy.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
                    placeholder="Enter your password"
                    required
                    minLength={3}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0L9.88 9.88m-3.59-3.59l3.29 3.29M12 12l.01.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Password must be at least 3 characters</p>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white py-3.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#2E4D32' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#253d28';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2E4D32';
                }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>

              {/* Demo Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center mb-3">
                  <span className="font-semibold text-gray-800">Available Users:</span>
                </p>
                <div className="text-center space-y-1">
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-red-600">Super Admin:</span> sadmin@umaracademy.org
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-blue-600">Admin:</span> admin@umaracademy.com
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-green-600">Teacher:</span> teacher@umaracademy.com
                  </p>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-purple-600">Student:</span> ahmed@umaracademy.com
                  </p>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                  <span className="font-semibold text-green-600">✨ New users created by Super Admin are automatically available for login!</span>
                </p>
                <p className="text-xs text-gray-400 text-center">
                  Use any password for demo access
                </p>
              </div>
            </form>
          </div>

          {/* Footer for mobile */}
          <div className="lg:hidden text-center mt-6">
            <p className="text-sm text-gray-600">
              © 2025 Umar Academy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
      
      <DebugPanel />
    </div>
  );
};

export default Login;
