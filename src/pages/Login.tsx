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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const success = await login(email, password, role);
      if (!success) {
        setLoginError(error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.');
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition"
                  style={{ focusRingColor: '#E7AA39' }}
                  placeholder="your.email@umaracademy.com"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="w-full text-white py-3.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#2E4D32' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#253d28'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2E4D32'}
              >
                Sign In
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
