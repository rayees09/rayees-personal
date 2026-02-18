import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { Users, KeyRound } from 'lucide-react';

interface FamilyMember {
  id: number;
  name: string;
  role: string;
  avatar?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [mode, setMode] = useState<'select' | 'parent' | 'child'>('select');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<FamilyMember | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Fetch family members on load
  useEffect(() => {
    // For now, use hardcoded family members until backend is running
    setFamilyMembers([
      { id: 1, name: 'Rayees', role: 'parent' },
      { id: 2, name: 'Shibila', role: 'parent' },
      { id: 3, name: 'Kanz', role: 'child' },
      { id: 4, name: 'Nouman', role: 'child' },
      { id: 5, name: 'Zakia', role: 'child' },
    ]);
  }, []);

  const handleParentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(email, password);
      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChildLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');
    setLoading(true);

    try {
      const data = await authApi.loginWithUsername(username, childPassword);
      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const parents = familyMembers.filter((m) => m.role === 'parent');
  const children = familyMembers.filter((m) => m.role === 'child');

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green to-teal-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-islamic-green text-white p-6 text-center">
          <h1 className="text-3xl font-bold">Rayees Family</h1>
          <p className="text-teal-100 mt-1">Welcome Home</p>
        </div>

        <div className="p-6">
          {mode === 'select' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center mb-6">Who's using the app?</h2>

              {/* Parents */}
              <div className="grid grid-cols-2 gap-3">
                {parents.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedUser(member);
                      setMode('parent');
                    }}
                    className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-xl hover:border-islamic-green hover:bg-islamic-light transition"
                  >
                    <div className="w-16 h-16 bg-islamic-green text-white rounded-full flex items-center justify-center text-2xl font-bold mb-2">
                      {member.name.charAt(0)}
                    </div>
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-gray-500">Parent</span>
                  </button>
                ))}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Kids</span>
                </div>
              </div>

              {/* Kids */}
              <div className="grid grid-cols-3 gap-3">
                {children.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedUser(member);
                      setMode('child');
                    }}
                    className="flex flex-col items-center p-3 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition"
                  >
                    <div className="w-12 h-12 bg-yellow-400 text-white rounded-full flex items-center justify-center text-xl font-bold mb-1">
                      {member.name.charAt(0)}
                    </div>
                    <span className="font-medium text-sm">{member.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'parent' && (
            <form onSubmit={handleParentLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-islamic-green hover:underline mb-4"
              >
                &larr; Back
              </button>

              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-islamic-green text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-2">
                  {selectedUser?.name.charAt(0)}
                </div>
                <h2 className="text-xl font-semibold">{selectedUser?.name}</h2>
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
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-islamic-green text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {mode === 'child' && (
            <form onSubmit={handleChildLogin} className="space-y-4">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-islamic-green hover:underline mb-4"
              >
                &larr; Back
              </button>

              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-yellow-400 text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-2">
                  {selectedUser?.name.charAt(0)}
                </div>
                <h2 className="text-xl font-semibold">{selectedUser?.name}</h2>
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
                  value={childPassword}
                  onChange={(e) => setChildPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !username || !childPassword}
                className="w-full bg-yellow-400 text-gray-900 py-3 rounded-lg font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
