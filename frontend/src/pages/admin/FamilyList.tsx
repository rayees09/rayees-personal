import { useEffect, useState, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Users, CheckCircle, XCircle,
  Settings, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, ShieldCheck,
  ChevronDown, ChevronUp, UserCheck, Mail, Globe
} from 'lucide-react';
import api from '../../services/api';

interface Family {
  id: number;
  name: string;
  slug: string;
  owner_email: string;
  country: string | null;
  is_verified: boolean;
  is_active: boolean;
  subscription_plan: string;
  member_count: number;
  created_at: string;
  ai_tokens_used: number;
  ai_cost: number;
}

interface FamilyMember {
  id: number;
  name: string;
  email: string | null;
  role: string;
  is_email_verified: boolean;
}

export default function FamilyList() {
  const navigate = useNavigate();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [expandedFamily, setExpandedFamily] = useState<number | null>(null);

  const countries = [
    'India', 'United States', 'United Arab Emirates', 'United Kingdom',
    'Canada', 'Australia', 'Saudi Arabia', 'Qatar'
  ];
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchFamilies();
  }, [page, search, filterActive, filterCountry, navigate]);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (filterActive !== null) params.set('is_active', filterActive.toString());
      if (filterCountry) params.set('country', filterCountry);

      const response = await api.get(`/admin/families?${params}`);
      setFamilies(response.data.families);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to fetch families:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFamilyStatus = async (familyId: number, currentStatus: boolean) => {
    try {
      await api.put(`/admin/families/${familyId}/status?is_active=${!currentStatus}`);
      fetchFamilies();
    } catch (err) {
      console.error('Failed to update family status:', err);
    }
  };

  const verifyFamily = async (familyId: number) => {
    try {
      await api.put(`/admin/families/${familyId}/verify`);
      fetchFamilies();
    } catch (err) {
      console.error('Failed to verify family:', err);
    }
  };

  const toggleExpand = async (familyId: number) => {
    if (expandedFamily === familyId) {
      setExpandedFamily(null);
      setFamilyMembers([]);
    } else {
      setExpandedFamily(familyId);
      setLoadingMembers(true);
      try {
        const response = await api.get(`/admin/families/${familyId}`);
        setFamilyMembers(response.data.members || []);
      } catch (err) {
        console.error('Failed to fetch family members:', err);
        setFamilyMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    }
  };

  const verifyUser = async (userId: number) => {
    try {
      await api.put(`/admin/users/${userId}/verify`);
      // Refresh members
      if (expandedFamily) {
        const response = await api.get(`/admin/families/${expandedFamily}`);
        setFamilyMembers(response.data.members || []);
      }
    } catch (err) {
      console.error('Failed to verify user:', err);
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
            <h1 className="text-white font-bold">Manage Families</h1>
            <p className="text-gray-400 text-sm">{total} families registered</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setFilterActive(null); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition ${
                filterActive === null ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setFilterActive(true); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition ${
                filterActive === true ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => { setFilterActive(false); setPage(1); }}
              className={`px-4 py-2 rounded-lg transition ${
                filterActive === false ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Inactive
            </button>
          </div>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <select
              value={filterCountry}
              onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
              className="bg-gray-800 text-white pl-9 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none appearance-none min-w-[150px]"
            >
              <option value="">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : families.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No families found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Family</th>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Country</th>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Members</th>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Status</th>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">AI Usage</th>
                  <th className="px-4 py-3 text-left text-gray-300 text-sm">Created</th>
                  <th className="px-4 py-3 text-right text-gray-300 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {families.map((family) => (
                  <Fragment key={family.id}>
                    <tr className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleExpand(family.id)}
                            className="p-1 text-gray-400 hover:text-white"
                          >
                            {expandedFamily === family.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <div>
                            <p className="text-white font-medium">{family.name}</p>
                            <p className="text-gray-400 text-sm">{family.owner_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-sm">
                          {family.country || <span className="text-gray-500">-</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Users size={16} />
                          {family.member_count}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {family.is_verified ? (
                            <span className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle size={14} /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-yellow-400 text-sm">
                              <XCircle size={14} /> Pending
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            family.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                          }`}>
                            {family.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-300 text-sm">
                          <p>{formatNumber(family.ai_tokens_used)} tokens</p>
                          <p className="text-gray-500">${family.ai_cost.toFixed(4)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(family.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!family.is_verified && (
                            <button
                              onClick={() => verifyFamily(family.id)}
                              className="p-2 text-yellow-400 hover:bg-gray-700 rounded"
                              title="Verify Family (bypass email)"
                            >
                              <ShieldCheck size={18} />
                            </button>
                          )}
                          <Link
                            to={`/admin/families/${family.id}/features`}
                            className="p-2 text-purple-400 hover:bg-gray-700 rounded"
                            title="Manage Features"
                          >
                            <Settings size={18} />
                          </Link>
                          <button
                            onClick={() => toggleFamilyStatus(family.id, family.is_active)}
                            className={`p-2 rounded hover:bg-gray-700 ${
                              family.is_active ? 'text-green-400' : 'text-red-400'
                            }`}
                            title={family.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {family.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded Members Row */}
                    {expandedFamily === family.id && (
                      <tr className="bg-gray-850">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="bg-gray-900 rounded-lg p-4">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                              <Users size={16} /> Family Members
                            </h4>
                            {loadingMembers ? (
                              <p className="text-gray-400">Loading members...</p>
                            ) : familyMembers.length === 0 ? (
                              <p className="text-gray-400">No members found</p>
                            ) : (
                              <div className="space-y-2">
                                {familyMembers.map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                        member.role === 'PARENT' ? 'bg-purple-600' : 'bg-yellow-500'
                                      }`}>
                                        {member.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-white font-medium">{member.name}</p>
                                        <p className="text-gray-400 text-sm flex items-center gap-1">
                                          {member.email ? (
                                            <>
                                              <Mail size={12} /> {member.email}
                                            </>
                                          ) : (
                                            <span className="text-gray-500">No email</span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`px-2 py-0.5 rounded text-xs ${
                                        member.role === 'PARENT' ? 'bg-purple-900 text-purple-300' : 'bg-yellow-900 text-yellow-300'
                                      }`}>
                                        {member.role}
                                      </span>
                                      {member.email && (
                                        member.is_email_verified ? (
                                          <span className="flex items-center gap-1 text-green-400 text-sm">
                                            <CheckCircle size={14} /> Verified
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => verifyUser(member.id)}
                                            className="flex items-center gap-1 px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded"
                                            title="Verify this user's email"
                                          >
                                            <UserCheck size={14} /> Verify
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
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
              <span className="text-gray-400">
                Page {page} of {totalPages}
              </span>
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

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
