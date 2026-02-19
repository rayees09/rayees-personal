import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { Mail, Lock, User, ArrowLeft } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<'select' | 'parent' | 'child'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(email, password);
      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Login failed';
      if (detail.includes('Email not verified')) {
        setError('Email not verified. Please check your email for the verification link.');
      } else {
        setError(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChildLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.loginWithUsername(username, password);
      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-islamic-green text-white p-6 text-center">
          <h1 className="text-3xl font-bold">Family Hub</h1>
          <p className="text-teal-100 mt-1">Welcome Back</p>
        </div>

        <div className="p-6">
          {mode === 'select' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center mb-6">How would you like to login?</h2>

              <button
                onClick={() => setMode('parent')}
                className="w-full flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-islamic-green hover:bg-islamic-light transition"
              >
                <div className="w-12 h-12 bg-islamic-green text-white rounded-full flex items-center justify-center">
                  <Mail size={24} />
                </div>
                <div className="text-left">
                  <span className="font-medium block">Parent Login</span>
                  <span className="text-sm text-gray-500">Login with email & password</span>
                </div>
              </button>

              <button
                onClick={() => setMode('child')}
                className="w-full flex items-center justify-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition"
              >
                <div className="w-12 h-12 bg-yellow-400 text-white rounded-full flex items-center justify-center">
                  <User size={24} />
                </div>
                <div className="text-left">
                  <span className="font-medium block">Kid Login</span>
                  <span className="text-sm text-gray-500">Login with username & password</span>
                </div>
              </button>
            </div>
          )}

          {mode === 'parent' && (
            <form onSubmit={handleParentLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setMode('select'); setError(''); }}
                className="flex items-center gap-1 text-islamic-green hover:underline mb-4"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-islamic-green text-white rounded-full flex items-center justify-center mx-auto mb-2">
                  <Mail size={28} />
                </div>
                <h2 className="text-xl font-semibold">Parent Login</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-islamic-green focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-islamic-green text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>

              <p className="text-center text-sm text-gray-500">
                <Link to="/forgot-password" className="text-islamic-green hover:underline">
                  Forgot password?
                </Link>
              </p>
            </form>
          )}

          {mode === 'child' && (
            <form onSubmit={handleChildLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => { setMode('select'); setError(''); }}
                className="flex items-center gap-1 text-islamic-green hover:underline mb-4"
              >
                <ArrowLeft size={16} /> Back
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-yellow-400 text-white rounded-full flex items-center justify-center mx-auto mb-2">
                  <User size={28} />
                </div>
                <h2 className="text-xl font-semibold">Kid Login</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-yellow-400 text-gray-900 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {/* Register link */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              New to Family Hub?{' '}
              <Link to="/register" className="text-islamic-green font-medium hover:underline">
                Register your family
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
