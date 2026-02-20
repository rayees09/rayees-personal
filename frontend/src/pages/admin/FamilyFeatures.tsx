import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ToggleLeft, ToggleRight, Save, CheckCircle } from 'lucide-react';
import api from '../../services/api';

interface FamilyDetails {
  family: {
    id: number;
    name: string;
    owner_email: string;
  };
  features: Record<string, boolean>;
  ai_limit: {
    monthly_token_limit: number;
    current_month_usage: number;
    monthly_cost_limit_usd: number;
    current_month_cost_usd: number;
  } | null;
}

const FEATURE_INFO: Record<string, { name: string; description: string }> = {
  prayers: { name: 'Prayer Tracking', description: 'Track daily prayers for family members' },
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

export default function FamilyFeatures() {
  const { familyId } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<FamilyDetails | null>(null);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [aiLimit, setAiLimit] = useState<number>(100000);
  const [costLimitCents, setCostLimitCents] = useState<number>(20); // 20 cents default
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchDetails();
  }, [familyId, navigate]);

  const fetchDetails = async () => {
    try {
      const response = await api.get(`/admin/families/${familyId}`);
      setDetails(response.data);
      setFeatures(response.data.features || {});
      setAiLimit(response.data.ai_limit?.monthly_token_limit || 100000);
      // Convert USD to cents for easier editing
      setCostLimitCents(Math.round((response.data.ai_limit?.monthly_cost_limit_usd || 0.20) * 100));
    } catch (err) {
      console.error('Failed to fetch family details:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (key: string) => {
    setFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save features
      await api.put(`/admin/families/${familyId}/features`, { features });

      // Save AI limits (convert cents to USD)
      await api.put(`/admin/families/${familyId}/ai-limits`, {
        monthly_token_limit: aiLimit,
        monthly_cost_limit_usd: costLimitCents / 100
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save changes');
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

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Family not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/families" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white font-bold">Manage Features</h1>
            <p className="text-gray-400 text-sm">{details.family.name}</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Success Message */}
        {saved && (
          <div className="flex items-center gap-2 p-4 bg-green-900/50 text-green-300 rounded-lg mb-6">
            <CheckCircle size={18} />
            Changes saved successfully!
          </div>
        )}

        {/* Features */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
          <div className="p-4 bg-gray-700 border-b border-gray-600">
            <h2 className="text-white font-semibold">Feature Toggles</h2>
            <p className="text-gray-400 text-sm">Enable or disable features for this family</p>
          </div>

          <div className="divide-y divide-gray-700">
            {Object.entries(FEATURE_INFO).map(([key, info]) => (
              <div key={key} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{info.name}</h3>
                  <p className="text-gray-400 text-sm">{info.description}</p>
                </div>
                <button
                  onClick={() => toggleFeature(key)}
                  className={`p-2 rounded-lg transition ${
                    features[key] ? 'text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:bg-gray-700'
                  }`}
                >
                  {features[key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* AI Limits */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-white font-semibold mb-4">AI Usage Limits</h2>
          <div className="space-y-6">
            {/* Cost Limit (Primary) */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Monthly Cost Limit (cents)</label>
              <input
                type="number"
                value={costLimitCents}
                onChange={(e) => { setCostLimitCents(parseInt(e.target.value) || 0); setSaved(false); }}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                Current usage: ${(details.ai_limit?.current_month_cost_usd || 0).toFixed(4)} / ${(costLimitCents / 100).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => { setCostLimitCents(10); setSaved(false); }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                10¢
              </button>
              <button
                onClick={() => { setCostLimitCents(20); setSaved(false); }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                20¢
              </button>
              <button
                onClick={() => { setCostLimitCents(50); setSaved(false); }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                50¢
              </button>
              <button
                onClick={() => { setCostLimitCents(100); setSaved(false); }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                $1
              </button>
              <button
                onClick={() => { setCostLimitCents(500); setSaved(false); }}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                $5
              </button>
            </div>

            {/* Token Limit (Secondary) */}
            <div className="pt-4 border-t border-gray-700">
              <label className="block text-gray-400 text-sm mb-2">Monthly Token Limit (backup)</label>
              <input
                type="number"
                value={aiLimit}
                onChange={(e) => { setAiLimit(parseInt(e.target.value) || 0); setSaved(false); }}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                Current usage: {(details.ai_limit?.current_month_usage || 0).toLocaleString()} tokens
              </p>
            </div>
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
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
