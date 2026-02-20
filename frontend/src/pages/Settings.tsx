import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authApi, settingsApi, familyApi } from '../services/api';
import { Settings as SettingsIcon, User, Lock, Save, Eye, EyeOff, Users, Moon, Calendar, Sun, Palette, ToggleLeft, ToggleRight } from 'lucide-react';

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
        <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message}
        </div>
      )}

      {/* Family Members Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors duration-200">
        <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
          <Users size={20} className="text-islamic-green" />
          <h2 className="font-semibold dark:text-white">Family Members</h2>
        </div>

        <div className="p-4 space-y-4">
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            familyMembers?.map((member: any) => (
              <div
                key={member.id}
                className="border dark:border-gray-700 rounded-lg p-4"
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
                        <p className="font-semibold dark:text-white">{member.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{member.role}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      {member.role === 'parent' && (
                        <div>
                          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      )}

                      {member.role === 'child' && (
                        <div>
                          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Username</label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                            placeholder="Enter username for login"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">New Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Leave blank to keep current"
                            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg pr-10 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
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
                        className="px-4 py-2 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
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
                        <p className="font-semibold dark:text-white">{member.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {member.role === 'parent' ? member.email : member.username ? `@${member.username}` : 'No username set'}
                        </p>
                        {member.school && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">{member.school} - {member.grade}</p>
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

      {/* Appearance Settings */}
      <AppearanceSettings />

      {/* Feature Management */}
      <FeatureSettings />

      {/* Ramadan Settings */}
      <RamadanSettings />

      {/* Current User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors duration-200">
        <div className="flex items-center gap-2 mb-4">
          <User size={20} className="text-islamic-green" />
          <h2 className="font-semibold dark:text-white">Your Account</h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p><strong className="dark:text-white">Logged in as:</strong> {user?.name}</p>
          <p><strong className="dark:text-white">Email:</strong> {user?.email}</p>
          <p><strong className="dark:text-white">Role:</strong> {user?.role}</p>
        </div>
      </div>
    </div>
  );
}

const FEATURE_INFO: Record<string, { name: string; description: string }> = {
  prayers: { name: 'Prayer Tracking', description: 'Track daily prayers for family' },
  ramadan: { name: 'Ramadan Features', description: 'Fasting logs, taraweeh tracking' },
  quran: { name: 'Quran Memorization', description: 'Track Quran memorization progress' },
  learning: { name: 'Learning Center', description: 'Homework analysis and worksheets' },
  tasks: { name: 'Family Tasks', description: 'Assign tasks to family members' },
  my_tasks: { name: 'Personal Tasks', description: 'Personal task management for parents' },
  points: { name: 'Points & Rewards', description: 'Point system and rewards shop' },
  expenses: { name: 'Expense Tracking', description: 'Track family expenses' },
  zakat: { name: 'Zakat Calculator', description: 'Zakat calculation and tracking' },
  reminders: { name: 'Reminders', description: 'Family reminders and notifications' },
  chatgpt_ai: { name: 'AI Features', description: 'ChatGPT-powered homework analysis' },
};

function FeatureSettings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: features, isLoading } = useQuery({
    queryKey: ['family-features'],
    queryFn: familyApi.getFeatures,
  });

  const updateMutation = useMutation({
    mutationFn: (newFeatures: Record<string, boolean>) => familyApi.updateFeatures(newFeatures),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-features'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleFeature = (key: string, currentValue: boolean) => {
    const newFeatures = { [key]: !currentValue };
    updateMutation.mutate(newFeatures);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors duration-200">
        <p className="text-gray-500 dark:text-gray-400">Loading features...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors duration-200">
      <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToggleRight size={20} className="text-islamic-green" />
          <h2 className="font-semibold dark:text-white">Family Features</h2>
        </div>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>
        )}
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {Object.entries(FEATURE_INFO).map(([key, info]) => (
          <div key={key} className="p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium dark:text-white">{info.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{info.description}</p>
            </div>
            <button
              onClick={() => toggleFeature(key, features?.[key] ?? true)}
              disabled={updateMutation.isPending}
              className={`p-2 rounded-lg transition ${
                features?.[key]
                  ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              } disabled:opacity-50`}
            >
              {features?.[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors duration-200">
      <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
        <Palette size={20} className="text-islamic-green" />
        <h2 className="font-semibold dark:text-white">Appearance</h2>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium dark:text-white">Theme</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred color scheme</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                theme === 'light'
                  ? 'bg-islamic-green text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Sun size={18} />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                theme === 'dark'
                  ? 'bg-islamic-green text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Moon size={18} />
              Dark
            </button>
          </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors duration-200">
      <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
        <Moon size={20} className="text-islamic-green" />
        <h2 className="font-semibold dark:text-white">Ramadan Start Dates</h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">Select Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year} (Ramadan {year === 2026 ? '1447' : year === 2027 ? '1448' : year === 2028 ? '1449' : ''})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Ramadan {selectedYear} Start Date (1st of Ramadan)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={ramadanStart}
              onChange={(e) => setRamadanStart(e.target.value)}
              className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
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
          <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
            Ramadan {selectedYear} start date saved!
          </div>
        )}

        {/* Show all saved dates */}
        {savedDates.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2 dark:text-gray-200">Saved Ramadan Dates:</h3>
            <div className="space-y-2">
              {savedDates.map(([key, value]) => {
                const year = key.replace('ramadan_start_', '');
                return (
                  <div key={key} className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center gap-2">
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
