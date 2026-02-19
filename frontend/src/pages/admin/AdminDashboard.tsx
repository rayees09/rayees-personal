import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Home, DollarSign, Cpu, Settings, LogOut,
  Activity, Mail, ToggleLeft, Shield
} from 'lucide-react';
import api from '../../services/api';

interface DashboardStats {
  total_families: number;
  active_families: number;
  total_users: number;
  total_ai_tokens_used: number;
  total_ai_cost: number;
  families_this_month: number;
  users_this_month: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser');
    if (!adminUser) {
      navigate('/admin/login');
      return;
    }
    setAdmin(JSON.parse(adminUser));
    fetchStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">Family Hub Admin</h1>
              <p className="text-gray-400 text-sm">{admin?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Families"
            value={stats?.total_families || 0}
            icon={<Home className="w-6 h-6" />}
            color="bg-blue-500"
            subtext={`${stats?.families_this_month || 0} this month`}
          />
          <StatCard
            title="Total Users"
            value={stats?.total_users || 0}
            icon={<Users className="w-6 h-6" />}
            color="bg-green-500"
            subtext={`${stats?.users_this_month || 0} this month`}
          />
          <StatCard
            title="AI Tokens Used"
            value={formatNumber(stats?.total_ai_tokens_used || 0)}
            icon={<Cpu className="w-6 h-6" />}
            color="bg-purple-500"
          />
          <StatCard
            title="AI Cost"
            value={`$${(stats?.total_ai_cost || 0).toFixed(2)}`}
            icon={<DollarSign className="w-6 h-6" />}
            color="bg-yellow-500"
          />
        </div>

        {/* Quick Actions */}
        <h2 className="text-white text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Manage Families"
            description="View and manage all registered families"
            icon={<Home className="w-8 h-8" />}
            href="/admin/families"
          />
          <ActionCard
            title="Email Config"
            description="Configure email service settings"
            icon={<Mail className="w-8 h-8" />}
            href="/admin/email-config"
          />
          <ActionCard
            title="Feature Flags"
            description="Manage available features"
            icon={<ToggleLeft className="w-8 h-8" />}
            href="/admin/features"
          />
          <ActionCard
            title="Token Usage"
            description="View AI usage analytics"
            icon={<Activity className="w-8 h-8" />}
            href="/admin/usage"
          />
          <ActionCard
            title="Admin Accounts"
            description="Manage admin users"
            icon={<Shield className="w-8 h-8" />}
            href="/admin/admins"
          />
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-white text-lg font-semibold mb-4">System Status</h2>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white">All systems operational</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Active Families</span>
                <p className="text-white font-semibold">{stats?.active_families || 0}</p>
              </div>
              <div>
                <span className="text-gray-400">Verification Rate</span>
                <p className="text-white font-semibold">
                  {stats?.total_families ?
                    Math.round((stats.active_families / stats.total_families) * 100) : 0}%
                </p>
              </div>
              <div>
                <span className="text-gray-400">Avg Tokens/Family</span>
                <p className="text-white font-semibold">
                  {stats?.total_families ?
                    formatNumber(Math.round((stats.total_ai_tokens_used || 0) / stats.total_families)) : 0}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Avg Cost/Family</span>
                <p className="text-white font-semibold">
                  ${stats?.total_families ?
                    ((stats.total_ai_cost || 0) / stats.total_families).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title, value, icon, color, subtext
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-white text-2xl font-bold mt-1">{value}</p>
          {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
        </div>
        <div className={`${color} p-2 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  href
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      to={href}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition group"
    >
      <div className="text-purple-400 mb-3 group-hover:text-purple-300 transition">
        {icon}
      </div>
      <h3 className="text-white font-semibold">{title}</h3>
      <p className="text-gray-400 text-sm mt-1">{description}</p>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
