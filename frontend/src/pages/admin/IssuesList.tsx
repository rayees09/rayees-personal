import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertCircle, Clock, MessageSquare,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../../services/api';

interface Issue {
  id: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  contact_email: string | null;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function IssuesList() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchIssues();
  }, [page, filterStatus, filterCategory, navigate]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);

      const response = await api.get(`/support/admin/issues?${params}`);
      setIssues(response.data.issues);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateIssue = async (issueId: number, status: string) => {
    setUpdating(true);
    try {
      await api.put(`/support/admin/issues/${issueId}`, {
        status,
        admin_notes: adminNotes
      });
      fetchIssues();
      setSelectedIssue(null);
      setAdminNotes('');
    } catch (err) {
      console.error('Failed to update issue:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bug': return <AlertCircle size={16} className="text-red-500" />;
      case 'feature': return <MessageSquare size={16} className="text-blue-500" />;
      case 'question': return <Clock size={16} className="text-yellow-500" />;
      default: return <MessageSquare size={16} className="text-gray-500" />;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white font-bold">Support Issues</h1>
            <p className="text-gray-400 text-sm">{total} issues</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg"
          >
            <option value="">All Categories</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="question">Question</option>
            <option value="general">General</option>
          </select>
        </div>

        {/* Issues List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : issues.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No issues found</div>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 cursor-pointer"
                onClick={() => {
                  setSelectedIssue(issue);
                  setAdminNotes(issue.admin_notes || '');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getCategoryIcon(issue.category)}
                    <div>
                      <h3 className="text-white font-medium">{issue.subject}</h3>
                      <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                        {issue.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                        {issue.contact_email && <span>{issue.contact_email}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                      {issue.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
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

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getCategoryIcon(selectedIssue.category)}
                    <span className="text-gray-400 text-sm capitalize">{selectedIssue.category}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedIssue.status)}`}>
                      {selectedIssue.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{selectedIssue.subject}</h2>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="text-gray-400 hover:text-white"
                >
                  &times;
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <p className="text-gray-300 whitespace-pre-wrap">{selectedIssue.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-500">Submitted:</span>
                  <span className="text-gray-300 ml-2">
                    {new Date(selectedIssue.created_at).toLocaleString()}
                  </span>
                </div>
                {selectedIssue.contact_email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="text-gray-300 ml-2">{selectedIssue.contact_email}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-gray-900 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
                  rows={3}
                  placeholder="Add internal notes..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => updateIssue(selectedIssue.id, 'in_progress')}
                  disabled={updating}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                >
                  Mark In Progress
                </button>
                <button
                  onClick={() => updateIssue(selectedIssue.id, 'resolved')}
                  disabled={updating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => updateIssue(selectedIssue.id, 'closed')}
                  disabled={updating}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
