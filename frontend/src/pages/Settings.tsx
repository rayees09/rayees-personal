import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { authApi, settingsApi, familyApi, syncApi } from '../services/api';
import { Settings as SettingsIcon, User, Lock, Save, Eye, EyeOff, Users, Moon, Calendar, Sun, Palette, ToggleLeft, ToggleRight, FileSpreadsheet, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';

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

      {/* Google Sheets Sync */}
      <GoogleSheetsSettings />

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

function GoogleSheetsSettings() {
  const queryClient = useQueryClient();
  const [syncYear, setSyncYear] = useState(new Date().getFullYear());
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('');

  // Check URL params for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      setSyncMessage({ type: 'success', text: 'Google Drive connected successfully!' });
      window.history.replaceState({}, '', window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
    }
  }, [queryClient]);

  const { data: status, isLoading } = useQuery({
    queryKey: ['google-sync-status'],
    queryFn: syncApi.getStatus,
  });

  const { data: folders } = useQuery({
    queryKey: ['google-folders'],
    queryFn: syncApi.listFolders,
    enabled: status?.is_connected && !status?.folder_id,
  });

  const connectMutation = useMutation({
    mutationFn: syncApi.getAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.auth_url;
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to connect' });
    },
  });

  const setFolderMutation = useMutation({
    mutationFn: (folderId: string) => syncApi.setFolder(folderId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      setSyncMessage({ type: 'success', text: `Folder set to '${data.folder_name}'` });
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to set folder' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: syncApi.disconnect,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      setSyncMessage({ type: 'success', text: 'Google Drive disconnected' });
    },
  });

  const syncZakatMutation = useMutation({
    mutationFn: (year: number) => syncApi.syncZakat(year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      setSyncMessage({ type: 'success', text: data.message });
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Sync failed' });
    },
  });

  const syncExpensesMutation = useMutation({
    mutationFn: (year: number) => syncApi.syncExpenses(year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      setSyncMessage({ type: 'success', text: data.message });
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Sync failed' });
    },
  });

  const syncNotesMutation = useMutation({
    mutationFn: (year: number) => syncApi.syncNotes(year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      setSyncMessage({ type: 'success', text: data.message });
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Sync failed' });
    },
  });

  const syncTasksMutation = useMutation({
    mutationFn: (year: number) => syncApi.syncTasks(year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      setSyncMessage({ type: 'success', text: data.message });
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Sync failed' });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: (year: number) => syncApi.syncAll(year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['google-sync-status'] });
      const syncedText = data.synced?.join(', ') || 'No data';
      const errorText = data.errors?.length ? ` (Errors: ${data.errors.join(', ')})` : '';
      setSyncMessage({ type: data.errors?.length ? 'error' : 'success', text: `${data.message}: ${syncedText}${errorText}` });
    },
    onError: (err: any) => {
      setSyncMessage({ type: 'error', text: err.response?.data?.detail || 'Sync failed' });
    },
  });

  // Auto-clear messages
  useEffect(() => {
    if (syncMessage) {
      const timer = setTimeout(() => setSyncMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [syncMessage]);

  const isSyncing = syncZakatMutation.isPending || syncExpensesMutation.isPending ||
                    syncNotesMutation.isPending || syncTasksMutation.isPending || syncAllMutation.isPending;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 transition-colors duration-200">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-colors duration-200">
      <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
        <FileSpreadsheet size={20} className="text-green-600" />
        <h2 className="font-semibold dark:text-white">Google Drive Sync</h2>
      </div>

      <div className="p-4 space-y-4">
        {syncMessage && (
          <div className={`p-3 rounded-lg flex items-start gap-2 ${
            syncMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {syncMessage.type === 'success' ? <Check size={18} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />}
            <span className="text-sm">{syncMessage.text}</span>
          </div>
        )}

        {status?.is_connected ? (
          <>
            {/* Connected State */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <Check size={20} />
                <span className="font-medium">Google Drive Connected</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Account: <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">{status.google_email}</code>
              </p>
              {status.folder_name && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Folder: <code className="bg-green-100 dark:bg-green-900/40 px-1 rounded">{status.folder_name}</code>
                </p>
              )}
            </div>

            {/* Folder Selection */}
            {!status.folder_id && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="font-medium text-amber-700 dark:text-amber-300 mb-2">Select a folder for sync</p>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white mb-2"
                >
                  <option value="">Select a folder...</option>
                  {folders?.folders?.map((folder: any) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => selectedFolder && setFolderMutation.mutate(selectedFolder)}
                  disabled={!selectedFolder || setFolderMutation.isPending}
                  className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                >
                  {setFolderMutation.isPending ? 'Setting...' : 'Set Folder'}
                </button>
              </div>
            )}

            {/* Sync Controls - only show if folder is set */}
            {status.folder_id && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium dark:text-gray-200">Sync Year:</label>
                  <select
                    value={syncYear}
                    onChange={(e) => setSyncYear(Number(e.target.value))}
                    className="px-3 py-1 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  >
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Sync All Button */}
                <button
                  onClick={() => syncAllMutation.mutate(syncYear)}
                  disabled={isSyncing}
                  className="w-full px-4 py-3 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {syncAllMutation.isPending ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />}
                  Sync All to Google Drive ({syncYear})
                </button>

                {/* Individual Sync Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => syncZakatMutation.mutate(syncYear)}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {syncZakatMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    Zakat
                  </button>

                  <button
                    onClick={() => syncExpensesMutation.mutate(syncYear)}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {syncExpensesMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    Expenses
                  </button>

                  <button
                    onClick={() => syncNotesMutation.mutate(syncYear)}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {syncNotesMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    Notes
                  </button>

                  <button
                    onClick={() => syncTasksMutation.mutate(syncYear)}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {syncTasksMutation.isPending ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    Tasks
                  </button>
                </div>
              </div>
            )}

            {/* Recent Syncs */}
            {status?.recent_syncs?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2 dark:text-gray-200">Recent Syncs:</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {status.recent_syncs.slice(0, 5).map((sync: any) => (
                    <div
                      key={sync.id}
                      className={`p-2 rounded text-sm ${
                        sync.status === 'success'
                          ? 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      }`}
                    >
                      <span className="font-medium capitalize">{sync.feature}</span> {sync.year} -
                      {sync.status === 'success' ? ` ${sync.rows_synced} rows` : ` Failed: ${sync.error_message}`}
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(sync.synced_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disconnect */}
            <button
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm flex items-center gap-1"
            >
              <Trash2 size={14} />
              Disconnect Google Drive
            </button>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <p className="text-gray-600 dark:text-gray-400">
              Sync your Zakat, Expenses, Notes, and Tasks to Google Drive automatically.
            </p>
            <button
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-center gap-3 font-medium"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {connectMutation.isPending ? 'Connecting...' : 'Connect with Google'}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Spreadsheets will be created automatically in your selected folder
            </p>
          </>
        )}
      </div>
    </div>
  );
}
