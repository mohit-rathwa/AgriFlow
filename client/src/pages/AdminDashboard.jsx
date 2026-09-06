import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FiUsers, FiUserCheck, FiDatabase, FiCheck, FiX, FiPower, FiTrendingUp } from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalFarmers: 0,
    totalMandiAgents: 0,
    totalPriceRecords: 0,
    recentSignups: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users', { params });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotalPages(Math.ceil(res.data.pagination.total / res.data.pagination.limit));
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/approve`);
      toast.success('Mandi Agent approved!');
      // Update locally
      setUsers(users.map(u => u._id === userId ? { ...u, isApproved: true } : u));
      fetchStats(); // Refresh stats
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/reject`);
      toast.success('Mandi Agent rejected');
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: false } : u));
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleToggle = async (userId, currentStatus) => {
    try {
      await api.put(`/admin/users/${userId}/toggle`);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: FiUsers, color: 'emerald' },
    { label: 'Farmers', value: stats.totalFarmers, icon: FiUserCheck, color: 'blue' },
    { label: 'Mandi Agents', value: stats.totalMandiAgents, icon: FiUserCheck, color: 'amber' },
    { label: 'Price Records', value: stats.totalPriceRecords, icon: FiDatabase, color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">Manage users and platform statistics.</p>
          </div>
          {stats.recentSignups > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20">
              <FiTrendingUp />
              <span className="text-sm font-medium">{stats.recentSignups} new signups this week</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-6 flex items-center">
              <div className={`bg-${color}-500/20 p-4 rounded-lg mr-4`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">{label}</p>
                <h3 className="text-2xl font-bold text-white">{value?.toLocaleString('en-IN') || 0}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* User Management Table */}
        <div className="glass-card p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold text-white">User Management</h2>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="input-field bg-slate-900 w-auto text-sm py-2"
            >
              <option value="">All Roles</option>
              <option value="farmer">Farmers</option>
              <option value="mandiAgent">Mandi Agents</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 text-sm">
                  <th className="pb-3 px-4 font-medium">Name</th>
                  <th className="pb-3 px-4 font-medium">Email</th>
                  <th className="pb-3 px-4 font-medium">Role</th>
                  <th className="pb-3 px-4 font-medium">Status</th>
                  <th className="pb-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center">
                      <div className="w-6 h-6 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-500">No users found.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4 font-medium text-white">{user.name}</td>
                      <td className="py-4 px-4 text-slate-300">{user.email}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 
                            user.role === 'farmer' ? 'bg-blue-500/10 text-blue-400' : 
                            'bg-amber-500/10 text-amber-400'}`}>
                          {user.role === 'mandiAgent' ? 'Mandi Agent' : user.role}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center text-xs ${user.isActive !== false ? 'text-emerald-400' : 'text-red-400'}`}>
                            {user.isActive !== false ? '● Active' : '● Inactive'}
                          </span>
                          {user.role === 'mandiAgent' && (
                            <span className={`inline-flex items-center text-xs ${user.isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {user.isApproved ? '✓ Approved' : '⏳ Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {user.role === 'mandiAgent' && !user.isApproved && user.isActive !== false && (
                            <>
                              <button 
                                onClick={() => handleApprove(user._id)} 
                                className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors" 
                                title="Approve"
                              >
                                <FiCheck />
                              </button>
                              <button 
                                onClick={() => handleReject(user._id)} 
                                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors" 
                                title="Reject"
                              >
                                <FiX />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleToggle(user._id, user.isActive !== false)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive !== false 
                                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                            title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                          >
                            <FiPower />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-700 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm bg-slate-800 text-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-700 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
