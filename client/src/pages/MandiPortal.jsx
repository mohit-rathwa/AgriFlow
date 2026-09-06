import React, { useContext, useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { FiAlertCircle, FiCheckCircle, FiTrash2, FiEdit } from 'react-icons/fi';
import { format } from 'date-fns';

const COMMODITIES = ['Onion', 'Wheat', 'Rice', 'Tomato', 'Potato', 'Maize', 'Groundnut'];

const MandiPortal = () => {
  const { user } = useContext(AuthContext);
  const isApproved = user?.isApproved;

  // Form state
  const [form, setForm] = useState({
    commodity: 'Onion',
    variety: '',
    minPrice: '',
    maxPrice: '',
    modalPrice: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // My prices
  const [myPrices, setMyPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    if (isApproved) {
      fetchMyPrices();
    }
  }, [isApproved]);

  const fetchMyPrices = async () => {
    setLoadingPrices(true);
    try {
      const res = await api.get('/mandi/my-prices');
      setMyPrices(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch prices', err);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    const min = parseFloat(form.minPrice);
    const max = parseFloat(form.maxPrice);
    const modal = parseFloat(form.modalPrice);

    if (!form.commodity || !form.modalPrice) {
      toast.error('Commodity and Modal Price are required');
      return;
    }
    if (min && max && min > max) {
      toast.error('Min Price cannot be greater than Max Price');
      return;
    }
    if (modal && max && modal > max) {
      toast.error('Modal Price cannot be greater than Max Price');
      return;
    }
    if (modal && min && modal < min) {
      toast.error('Modal Price cannot be less than Min Price');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/mandi/prices', {
        commodity: form.commodity,
        variety: form.variety || undefined,
        minPrice: min || undefined,
        maxPrice: max || undefined,
        modalPrice: modal,
        mandiName: user?.name || 'Unknown Mandi',
        state: user?.region?.state || 'Unknown',
        district: user?.region?.district || 'Unknown',
      });
      toast.success('Price submitted successfully!');
      setForm({ ...form, variety: '', minPrice: '', maxPrice: '', modalPrice: '' });
      fetchMyPrices(); // Refresh the table
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit price');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this price entry?')) return;
    try {
      await api.delete(`/mandi/prices/${id}`);
      toast.success('Price deleted');
      setMyPrices(myPrices.filter(p => p._id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isApproved ? (
          <div className="glass-card p-10 text-center max-w-2xl mx-auto mt-10">
            <div className="flex justify-center mb-6">
              <div className="bg-amber-500/20 p-4 rounded-full">
                <FiAlertCircle className="w-12 h-12 text-amber-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Account Pending Approval</h2>
            <p className="text-slate-400 mb-6">
              Your mandi agent account is currently under review by our administrators. 
              You will be notified once your account is approved and you can start submitting daily prices.
            </p>
            <div className="inline-flex items-center px-4 py-2 bg-slate-800 rounded-lg border border-slate-700 text-sm text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
              Status: Pending Review
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white">Mandi Portal</h1>
              <p className="text-slate-400 mt-2">Submit and manage daily commodity prices.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Price Entry Form */}
              <div className="lg:col-span-1">
                <div className="glass-card p-6 sticky top-24">
                  <h2 className="text-xl font-semibold text-white mb-6">Submit Daily Price</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Commodity *</label>
                      <select name="commodity" value={form.commodity} onChange={handleChange} className="input-field bg-slate-900">
                        {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Variety</label>
                      <input type="text" name="variety" value={form.variety} onChange={handleChange} className="input-field" placeholder="e.g. Red Nashik" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Min Price (₹/Qtl)</label>
                      <input type="number" name="minPrice" value={form.minPrice} onChange={handleChange} className="input-field" placeholder="e.g. 1500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Max Price (₹/Qtl)</label>
                      <input type="number" name="maxPrice" value={form.maxPrice} onChange={handleChange} className="input-field" placeholder="e.g. 2500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Modal Price (₹/Qtl) *</label>
                      <input type="number" name="modalPrice" value={form.modalPrice} onChange={handleChange} className="input-field" placeholder="e.g. 2000" required />
                    </div>
                    <button 
                      type="submit" 
                      disabled={submitting}
                      className="btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit Record'}
                    </button>
                  </form>
                </div>
              </div>

              {/* My Submitted Prices */}
              <div className="lg:col-span-2">
                <div className="glass-card p-6">
                  <h2 className="text-xl font-semibold text-white mb-6">
                    My Submitted Prices 
                    <span className="text-sm text-slate-400 ml-2">({myPrices.length} records)</span>
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400 text-sm">
                          <th className="pb-3 px-4 font-medium">Date</th>
                          <th className="pb-3 px-4 font-medium">Commodity</th>
                          <th className="pb-3 px-4 font-medium">Modal ₹</th>
                          <th className="pb-3 px-4 font-medium">Min ₹</th>
                          <th className="pb-3 px-4 font-medium">Max ₹</th>
                          <th className="pb-3 px-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {loadingPrices ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500">
                              <div className="w-6 h-6 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            </td>
                          </tr>
                        ) : myPrices.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-slate-500">
                              No prices submitted yet. Use the form to add your first entry.
                            </td>
                          </tr>
                        ) : (
                          myPrices.map(p => (
                            <tr key={p._id} className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                              <td className="py-4 px-4 text-slate-300">
                                {p.createdAt ? format(new Date(p.createdAt), 'dd MMM yyyy') : '-'}
                              </td>
                              <td className="py-4 px-4 text-white">{p.commodity}</td>
                              <td className="py-4 px-4 font-medium text-emerald-400">₹{p.modalPrice?.toLocaleString('en-IN')}</td>
                              <td className="py-4 px-4 text-slate-400">₹{p.minPrice?.toLocaleString('en-IN') || '-'}</td>
                              <td className="py-4 px-4 text-slate-400">₹{p.maxPrice?.toLocaleString('en-IN') || '-'}</td>
                              <td className="py-4 px-4 text-right">
                                <button
                                  onClick={() => handleDelete(p._id)}
                                  className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MandiPortal;
