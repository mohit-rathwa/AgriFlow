import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [commodity, setCommodity] = useState('Onion');
  const [stateName, setStateName] = useState('');
  const [alertType, setAlertType] = useState('ABOVE');
  const [targetPrice, setTargetPrice] = useState('');

  const commodities = ['Onion', 'Wheat', 'Rice', 'Tomato', 'Potato', 'Maize', 'Groundnut'];

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/notifications');
      setAlerts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch alerts', error);
      toast.error('Could not load your alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stateName || !targetPrice) {
      toast.error('Please fill in all fields');
      return;
    }
    
    try {
      const newAlert = {
        commodity,
        state: stateName,
        type: alertType,
        targetPrice: Number(targetPrice)
      };
      await api.post('/notifications', newAlert);
      toast.success('Alert created successfully');
      setCommodity('Onion');
      setStateName('');
      setAlertType('ABOVE');
      setTargetPrice('');
      fetchAlerts();
    } catch (error) {
      console.error('Failed to create alert', error);
      toast.error('Failed to create alert');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      toast.success('Alert deleted');
      setAlerts(alerts.filter(a => a._id !== id && a.id !== id));
      fetchAlerts();
    } catch (error) {
      console.error('Failed to delete alert', error);
      toast.error('Failed to delete alert');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Price Alerts</h1>
          <p className="mt-2 text-slate-400">Get SMS notifications when mandi prices hit your targets.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Create Form */}
          <div className="col-span-1">
            <div className="glass-card p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <FiPlus className="text-emerald-500" />
                Create New Alert
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Commodity</label>
                  <select 
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="input-field"
                  >
                    {commodities.map(c => (
                      <option key={c} value={c} className="bg-slate-900">{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">State</label>
                  <input 
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Alert Condition</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="alertType" 
                        value="ABOVE"
                        checked={alertType === 'ABOVE'}
                        onChange={() => setAlertType('ABOVE')}
                        className="text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-slate-300 text-sm">Price goes ABOVE</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="alertType" 
                        value="BELOW"
                        checked={alertType === 'BELOW'}
                        onChange={() => setAlertType('BELOW')}
                        className="text-emerald-500 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                      />
                      <span className="text-slate-300 text-sm">Price goes BELOW</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Target Price (₹/Quintal)</label>
                  <input 
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder="e.g. 2000"
                    min="1"
                    className="input-field"
                  />
                </div>

                <button type="submit" className="w-full btn-primary mt-2">
                  Save Alert
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Alerts Table */}
          <div className="col-span-1 lg:col-span-2">
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-slate-800/80">
                <h2 className="text-xl font-semibold text-white">My Alerts</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/50">
                    <tr>
                      <th className="table-header py-4">Commodity</th>
                      <th className="table-header py-4">State</th>
                      <th className="table-header py-4">Condition</th>
                      <th className="table-header py-4">Target Price</th>
                      <th className="table-header py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">Loading alerts...</td>
                      </tr>
                    ) : alerts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">No alerts set. Create one to get SMS notifications.</td>
                      </tr>
                    ) : (
                      alerts.map((alert) => (
                        <tr key={alert._id || alert.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="table-cell font-medium text-white">{alert.commodity}</td>
                          <td className="table-cell text-slate-300">{alert.state}</td>
                          <td className="table-cell text-slate-300">
                            {alert.type === 'ABOVE' ? 'Goes above' : 'Goes below'}
                          </td>
                          <td className="table-cell text-slate-300">₹{alert.targetPrice} / Qtl</td>
                          <td className="table-cell text-right">
                            <button 
                              onClick={() => handleDelete(alert._id || alert.id)}
                              className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                              title="Delete alert"
                            >
                              <FiTrash2 className="w-4 h-4" />
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
    </div>
  );
};

export default Alerts;
