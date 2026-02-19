import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Cpu, DollarSign, TrendingUp } from 'lucide-react';
import api from '../../services/api';

interface UsageStats {
  total_ai_tokens_used: number;
  total_ai_cost: number;
}

export default function TokenUsage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchStats();
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
