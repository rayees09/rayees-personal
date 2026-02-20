import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, Smartphone, Monitor, Tablet,
  ChevronLeft, ChevronRight, User, MapPin
} from 'lucide-react';
import api from '../../services/api';

interface ActivityLog {
  id: number;
  family_id: number | null;
  user_id: number | null;
  user_name: string | null;
  family_name: string | null;
  action: string;
  details: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  created_at: string;
}

export default function ActivityLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const pageSize = 10;

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchLogs();
  }, [page, filterAction, filterCountry, navigate]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (filterAction) params.set('action', filterAction);
      if (filterCountry) params.set('country', filterCountry);

      const response = await api.get(`/support/admin/activity-logs?${params}`);
      setLogs(response.data.logs);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone size={16} className="text-blue-400" />;
      case 'tablet': return <Tablet size={16} className="text-purple-400" />;
      case 'desktop': return <Monitor size={16} className="text-green-400" />;
      default: return <Monitor size={16} className="text-gray-400" />;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('login')) return 'bg-green-100 text-green-700';
    if (action.includes('register')) return 'bg-blue-100 text-blue-700';
    if (action.includes('issue')) return 'bg-yellow-100 text-yellow-700';
    if (action.includes('logout')) return 'bg-gray-100 text-gray-700';
    return 'bg-purple-100 text-purple-700';
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const totalPages = Math.ceil(total / pageSize);

  // Get unique actions and countries for filters
  const actions = ['login', 'register', 'logout', 'issue_submitted', 'google_login', 'google_register'];
  const countries = ['India', 'United States', 'UAE', 'United Kingdom', 'Canada', 'Australia', 'Saudi Arabia', 'Qatar'];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white font-bold flex items-center gap-2">
              <Activity size={20} />
              Activity Logs
            </h1>
            <p className="text-gray-400 text-sm">{total} activities logged</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            <option value="">All Actions</option>
            {actions.map(action => (
              <option key={action} value={action}>{formatAction(action)}</option>
            ))}
          </select>

          <select
            value={filterCountry}
            onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            <option value="">All Countries</option>
            {countries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        {/* Logs Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Family</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-500" />
                          {log.user_name || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {log.family_name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-gray-500" />
                          <div>
                            {log.city && log.country ? (
                              <span>{log.city}, {log.country}</span>
                            ) : log.country ? (
                              <span>{log.country}</span>
                            ) : (
                              <span className="text-gray-500">Unknown</span>
                            )}
                            {log.ip_address && (
                              <div className="text-xs text-gray-500">{log.ip_address}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(log.device_type)}
                          <span className="text-sm text-gray-400 capitalize">
                            {log.device_type || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-gray-400 text-sm">
              Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-gray-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 bg-gray-800 text-gray-400 rounded hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
