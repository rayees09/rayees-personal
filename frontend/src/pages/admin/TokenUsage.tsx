import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, DollarSign, TrendingUp, Settings, Save, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface UsageStats {
  total_ai_tokens_used: number;
  total_ai_cost: number;
}

export default function TokenUsage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [defaultCostLimitCents, setDefaultCostLimitCents] = useState<number>(20);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchStats();
    fetchDefaultSettings();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats({
        total_ai_tokens_used: response.data.total_ai_tokens_used,
        total_ai_cost: response.data.total_ai_cost,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultSettings = async () => {
    try {
      const response = await api.get('/admin/settings/default_ai_cost_limit_cents');
      setDefaultCostLimitCents(parseInt(response.data.value) || 20);
    } catch (err) {
      // Setting might not exist yet, use default
      console.log('Default setting not found, using 20 cents');
    }
  };

  const handleSaveDefault = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings/default_ai_cost_limit_cents', {
        value: defaultCostLimitCents.toString()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save default:', err);
      alert('Failed to save setting');
    } finally {
      setSaving(false);
    }
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white font-bold">AI Token Usage</h1>
            <p className="text-gray-400 text-sm">Monitor AI token consumption across all families</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Tokens Used</p>
                <p className="text-white text-xl font-bold">
                  {formatNumber(stats?.total_ai_tokens_used || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Cost</p>
                <p className="text-white text-xl font-bold">
                  ${(stats?.total_ai_cost || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Cost/1K Tokens</p>
                <p className="text-white text-xl font-bold">
                  ${stats?.total_ai_tokens_used
                    ? ((stats.total_ai_cost / stats.total_ai_tokens_used) * 1000).toFixed(4)
                    : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Default Settings */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold">Global Default Settings</h2>
          </div>

          {saved && (
            <div className="flex items-center gap-2 p-3 bg-green-900/50 text-green-300 rounded-lg mb-4">
              <CheckCircle size={16} />
              Setting saved successfully!
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">
                Default Monthly Cost Limit for New Families (cents)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={defaultCostLimitCents}
                  onChange={(e) => setDefaultCostLimitCents(parseInt(e.target.value) || 0)}
                  className="w-32 bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <span className="text-gray-400">= ${(defaultCostLimitCents / 100).toFixed(2)}</span>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                This limit is applied to new families when they register.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDefaultCostLimitCents(10)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                10¢
              </button>
              <button
                onClick={() => setDefaultCostLimitCents(20)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                20¢
              </button>
              <button
                onClick={() => setDefaultCostLimitCents(50)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                50¢
              </button>
              <button
                onClick={() => setDefaultCostLimitCents(100)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                $1
              </button>
              <button
                onClick={() => setDefaultCostLimitCents(500)}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                $5
              </button>
            </div>

            <button
              onClick={handleSaveDefault}
              disabled={saving}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : (
                <>
                  <Save size={16} />
                  Save Default
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-white font-semibold mb-4">Token Usage Tracking</h2>
          <p className="text-gray-400 mb-4">
            AI token usage is tracked per family and per feature. This helps you:
          </p>
          <ul className="text-gray-400 space-y-2 list-disc list-inside">
            <li>Monitor overall AI consumption</li>
            <li>Set monthly limits per family</li>
            <li>Identify high-usage families</li>
            <li>Track costs for billing purposes</li>
          </ul>

          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              For detailed per-family usage, go to{' '}
              <Link to="/admin/families" className="text-purple-400 hover:underline">
                Family Management
              </Link>{' '}
              and click on a family to view their usage details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
