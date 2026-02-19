import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Server, Save, Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface EmailConfigData {
  provider: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  is_active: boolean;
}

export default function EmailConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<EmailConfigData>({
    provider: 'smtp',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: 'Family Hub',
    is_active: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchConfig();
  }, [navigate]);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/admin/email-config');
      setConfig({
        provider: response.data.provider || 'smtp',
        smtp_host: response.data.smtp_host || '',
        smtp_port: response.data.smtp_port || 587,
        smtp_user: response.data.smtp_user || '',
        smtp_password: '',
        from_email: response.data.from_email || '',
        from_name: response.data.from_name || 'Family Hub',
        is_active: response.data.is_active ?? true,
      });
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/admin/email-config', config);
      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }
    if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
      setMessage({ type: 'error', text: 'Please fill in all SMTP settings first' });
      return;
    }
    setTesting(true);
    setMessage(null);
    try {
      await api.post('/admin/email-config/test', {
        to_email: testEmail,
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user,
        smtp_password: config.smtp_password,
        from_email: config.from_email || config.smtp_user,
        from_name: config.from_name,
      });
      setMessage({ type: 'success', text: 'Test email sent successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  };

  const providerPresets: Record<string, Partial<EmailConfigData>> = {
    gmail: { smtp_host: 'smtp.gmail.com', smtp_port: 587 },
    zoho: { smtp_host: 'smtppro.zoho.in', smtp_port: 587 },  // For custom domains (India region)
    outlook: { smtp_host: 'smtp-mail.outlook.com', smtp_port: 587 },
    smtp: { smtp_host: '', smtp_port: 587 },
  };

  const handleProviderChange = (provider: string) => {
    const preset = providerPresets[provider] || {};
    setConfig({
      ...config,
      provider,
      ...preset,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white font-bold">Email Configuration</h1>
            <p className="text-gray-400 text-sm">Configure email service for notifications</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Message */}
        {message && (
          <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {/* Provider Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Mail size={20} />
            Email Provider
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['smtp', 'gmail', 'zoho', 'outlook'].map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`p-3 rounded-lg border-2 transition capitalize ${
                  config.provider === provider
                    ? 'border-purple-500 bg-purple-900/30 text-white'
                    : 'border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {provider === 'smtp' ? 'Custom SMTP' : provider}
              </button>
            ))}
          </div>
        </div>

        {/* SMTP Settings */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Server size={20} />
            SMTP Settings
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={config.smtp_host}
                  onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                  placeholder="smtp.example.com"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={config.smtp_port}
                  onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Username</label>
                <input
                  type="text"
                  value={config.smtp_user}
                  onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
                  placeholder="your-email@example.com"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">Password / App Password</label>
                <input
                  type="password"
                  value={config.smtp_password}
                  onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
                  placeholder="Enter password"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">From Email</label>
                <input
                  type="email"
                  value={config.from_email}
                  onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                  placeholder="noreply@familyhub.com"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">From Name</label>
                <input
                  type="text"
                  value={config.from_name}
                  onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                  placeholder="Family Hub"
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={config.is_active}
                onChange={(e) => setConfig({ ...config, is_active: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="is_active" className="text-gray-300">Enable email sending</label>
            </div>
          </div>
        </div>

        {/* Test Email */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Send size={20} />
            Test Configuration
          </h2>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to send test"
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {testing ? 'Sending...' : (
                <>
                  <Send size={16} />
                  Send Test
                </>
              )}
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? 'Saving...' : (
            <>
              <Save size={18} />
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}
