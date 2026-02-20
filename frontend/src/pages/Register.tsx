import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Mail, Lock, User, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import api, { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    family_name: '',
    owner_name: '',
    owner_email: '',
    country: '',
    password: '',
    confirmPassword: '',
  });

  const countries = [
    { code: 'IN', name: 'India' },
    { code: 'US', name: 'United States' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'QA', name: 'Qatar' },
  ];
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleRegister = async (credential: string) => {
    setError('');
    setGoogleLoading(true);
    try {
      // One-click signup - family name auto-generated from Google name
      const data = await authApi.loginWithGoogle(credential);
      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google registration failed');
    } finally {
      setGoogleLoading(false);
    }
  };
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.country) {
      setError('Please select your country');
      return;
    }

    setLoading(true);

    try {
      await api.post('/family/register', {
        family_name: formData.family_name,
        owner_name: formData.owner_name,
        owner_email: formData.owner_email,
        country: formData.country,
        password: formData.password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification email to <strong>{formData.owner_email}</strong>.
            Please check your inbox and click the verification link to activate your account.
          </p>
          <div className="space-y-3">
            <Link
              to="/login"
              className="block w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Go to Login
            </Link>
            <p className="text-sm text-gray-500">
              Didn't receive the email?{' '}
              <button
                onClick={async () => {
                  try {
                    await api.post('/family/resend-verification', { email: formData.owner_email });
                    alert('Verification email resent!');
                  } catch {
                    alert('Failed to resend email. Please try again.');
                  }
                }}
                className="text-green-600 hover:underline"
              >
                Resend
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Family Hub</h1>
          <p className="text-green-200 mt-2">Register your family to get started</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Register - Primary Option */}
          <div className="flex flex-col items-center py-4">
            <p className="text-gray-600 text-sm mb-4">Quick one-click registration</p>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  handleGoogleRegister(credentialResponse.credential);
                }
              }}
              onError={() => {
                setError('Google registration failed. Please try again.');
              }}
              text="signup_with"
              shape="rectangular"
              theme="filled_blue"
              size="large"
              width="300"
            />
            {googleLoading && <p className="text-sm text-gray-500 mt-2">Creating your account...</p>}
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or register with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Family Name</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.family_name}
                  onChange={(e) => setFormData({ ...formData, family_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="e.g., Smith Family"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Country</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none appearance-none bg-white"
                  required
                >
                  <option value="">Select your country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Family Account'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center text-white">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="font-semibold">Prayer Tracking</p>
            <p className="text-green-200 text-sm">Track daily prayers</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="font-semibold">Task Management</p>
            <p className="text-green-200 text-sm">Family tasks & rewards</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="font-semibold">Learning Tools</p>
            <p className="text-green-200 text-sm">AI homework analysis</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="font-semibold">Quran Progress</p>
            <p className="text-green-200 text-sm">Memorization tracking</p>
          </div>
        </div>
      </div>
    </div>
  );
}
