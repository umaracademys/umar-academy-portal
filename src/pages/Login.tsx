import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DebugPanel from '../components/DebugPanel';

const Login: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountLocked, setAccountLocked] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const [requestingUnlock, setRequestingUnlock] = useState(false);
  const [unlockRequestSent, setUnlockRequestSent] = useState(false);

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
    
    setIsLoading(true);
    setLoginError(''); // Clear previous errors
    try {
      const success = await login(email, password);
      
      if (!success) {
        // Error is already set in AuthContext, but we can enhance it here
        const errorMsg = error || 'Invalid credentials. Please check your email and password.';
        setLoginError(errorMsg);
        
        // Check if account is locked from window object (set by AuthContext)
        const lockedInfo = (window as any).__lockedAccountInfo;
        if (lockedInfo && lockedInfo.accountLocked) {
          setAccountLocked(true);
          setMinutesRemaining(lockedInfo.minutesRemaining || 30);
        } else {
          // Also check error response directly if available
          // The error might contain account locked info
          setAccountLocked(false);
          setMinutesRemaining(null);
        }
      }
    } catch (err: any) {
      console.error('❌ Login error caught:', err);
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-primary">
        <div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Umar Academy</h1>
          <div className="w-20 h-1 mb-6 bg-accent rounded-full"></div>
          <p className="text-xl text-white/90 leading-relaxed">
            Excellence in Education.<br />
            Empowering Students, Teachers & Administrators.
          </p>
        </div>
        <div className="text-white/75 text-sm">
          © 2025 Umar Academy. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-primary">Umar Academy</h1>
            <div className="w-16 h-1 mx-auto bg-accent rounded-full"></div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <p className="text-gray-600 mt-1">Please sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {loginError && (
                <div className={`px-4 py-3 rounded-lg ${accountLocked ? 'bg-yellow-50 border border-yellow-300' : 'bg-soft-error border border-error/30 text-error'}`}>
                  <p className={`text-sm font-medium ${accountLocked ? 'text-yellow-800' : 'text-error'}`}>
                    {loginError}
                  </p>
                  {accountLocked && minutesRemaining !== null && (
                    <p className="text-xs text-yellow-700 mt-2">
                      Account will be automatically unlocked in {minutesRemaining} minute(s).
                    </p>
                  )}
                </div>
              )}

              {accountLocked && !unlockRequestSent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2 font-medium">
                    🔒 Account Locked
                  </p>
                  <p className="text-sm text-blue-700 mb-3">
                    Your account has been temporarily locked due to too many failed login attempts.
                    {minutesRemaining !== null && (
                      <span className="block mt-1">
                        Account will automatically unlock in {minutesRemaining} minute(s).
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-blue-800 mb-3">
                    Need immediate access? Request an unlock from the administrator.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      setRequestingUnlock(true);
                      setLoginError(''); // Clear previous errors
                      try {
                        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
                        const apiUrl = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
                        const response = await fetch(`${apiUrl}/auth/request-unlock`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            email: email,
                            reason: 'User requested unlock from login page'
                          })
                        });

                        const data = await response.json();
                        if (response.ok) {
                          setUnlockRequestSent(true);
                          setLoginError('');
                          // Show success message
                          alert(data.message || 'Unlock request sent successfully! The administrator will be notified.');
                        } else {
                          setLoginError(data.error || 'Failed to send unlock request. Please try again.');
                        }
                      } catch (err) {
                        setLoginError('Failed to send unlock request. Please check your connection and try again.');
                      } finally {
                        setRequestingUnlock(false);
                      }
                    }}
                    disabled={requestingUnlock}
                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {requestingUnlock ? 'Sending Request...' : '🔓 Request Account Unlock'}
                  </button>
                </div>
              )}

              {unlockRequestSent && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">
                    ✅ Unlock request sent! The administrator has been notified and will unlock your account shortly.
                  </p>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-primary mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="your.email@umaracademy.com"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="Enter your password"
                    required
                    minLength={3}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-primary focus:outline-none transition-colors"
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
                className="w-full bg-primary text-white py-3.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
