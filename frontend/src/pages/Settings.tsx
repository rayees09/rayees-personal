import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { authApi, settingsApi } from '../services/api';
import { Settings as SettingsIcon, User, Lock, Save, Eye, EyeOff, Users, Moon, Calendar } from 'lucide-react';

export default function Settings() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
  });
  const [message, setMessage] = useState('');

  const { data: familyMembers, isLoading } = useQuery({
    queryKey: ['family-members'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const updateUserMutation = useMutation({
    mutationFn: (data: any) => authApi.updateUser(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      setEditingUser(null);
      setFormData({ name: '', email: '', username: '', password: '' });
      setMessage('User updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (err: any) => {
      setMessage(err.response?.data?.detail || 'Update failed');
    },
  });

  const handleEdit = (member: any) => {
    setEditingUser(member);
    setFormData({
      name: member.name,
      email: member.email || '',
      username: member.username || '',
      password: '',
    });
  };

  const handleSave = () => {
    const updateData: any = { id: editingUser.id };

    if (formData.name !== editingUser.name) {
      updateData.name = formData.name;
    }
    if (formData.email && formData.email !== editingUser.email) {
      updateData.email = formData.email;
    }
    if (formData.username && formData.username !== editingUser.username) {
      updateData.username = formData.username;
    }
    if (formData.password) {
      updateData.password = formData.password;
    }

    if (Object.keys(updateData).length > 1) {
      updateUserMutation.mutate(updateData);
    } else {
      setEditingUser(null);
    }
  };

  if (user?.role !== 'parent') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Only parents can access settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="text-islamic-green" size={28} />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {/* Family Members Management */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Users size={20} className="text-islamic-green" />
          <h2 className="font-semibold">Family Members</h2>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            familyMembers?.map((member: any) => (
              <div
                key={member.id}
                className="border rounded-lg p-4"
              >
                {editingUser?.id === member.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        member.role === 'parent' ? 'bg-islamic-green' : 'bg-yellow-400'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      {member.role === 'parent' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      )}

                      {member.role === 'child' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Username</label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                            placeholder="Enter username for login"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Leave blank to keep current"
                            className="w-full px-3 py-2 border rounded-lg pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={updateUserMutation.isPending}
                        className="px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save size={18} />
                        {updateUserMutation.isPending ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        member.role === 'parent' ? 'bg-islamic-green' : 'bg-yellow-400'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-gray-500">
                          {member.role === 'parent' ? member.email : member.username ? `@${member.username}` : 'No username set'}
                        </p>
                        {member.school && (
                          <p className="text-xs text-gray-400">{member.school} - {member.grade}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleEdit(member)}
                      className="px-4 py-2 text-islamic-green border border-islamic-green rounded-lg hover:bg-islamic-light flex items-center gap-2"
                    >
                      <Lock size={16} />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ramadan Settings */}
      <RamadanSettings />

      {/* Current User Info */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={20} className="text-islamic-green" />
          <h2 className="font-semibold">Your Account</h2>
        </div>
        <div className="text-sm text-gray-600">
          <p><strong>Logged in as:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </div>
      </div>
    </div>
  );
}

function RamadanSettings() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [ramadanStart, setRamadanStart] = useState('');
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: settingsApi.getAll,
  });

  // Load the date for selected year when settings change
  useEffect(() => {
    const key = `ramadan_start_${selectedYear}`;
    if (settings?.[key]) {
      setRamadanStart(settings[key]);
    } else {
      setRamadanStart('');
    }
  }, [settings, selectedYear]);

  const saveMutation = useMutation({
    mutationFn: (value: string) => settingsApi.set(`ramadan_start_${selectedYear}`, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    if (ramadanStart) {
      saveMutation.mutate(ramadanStart);
    }
  };

  // Generate year options (current year and next 5 years)
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  // Get all saved Ramadan dates
  const savedDates = Object.entries(settings || {})
    .filter(([key]) => key.startsWith('ramadan_start_'))
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b flex items-center gap-2">
        <Moon size={20} className="text-islamic-green" />
        <h2 className="font-semibold">Ramadan Start Dates</h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year} (Ramadan {year === 2026 ? '1447' : year === 2027 ? '1448' : year === 2028 ? '1449' : ''})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Ramadan {selectedYear} Start Date (1st of Ramadan)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={ramadanStart}
              onChange={(e) => setRamadanStart(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending || !ramadanStart}
              className="px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={18} />
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {saved && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg">
            Ramadan {selectedYear} start date saved!
          </div>
        )}

        {/* Show all saved dates */}
        {savedDates.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Saved Ramadan Dates:</h3>
            <div className="space-y-2">
              {savedDates.map(([key, value]) => {
                const year = key.replace('ramadan_start_', '');
                return (
                  <div key={key} className="p-3 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-2">
                    <Calendar size={18} />
                    <span>
                      <strong>Ramadan {year}:</strong>{' '}
                      {new Date(value as string).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
