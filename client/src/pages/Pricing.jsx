import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';

const Pricing = () => {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [plans, setPlans] = useState([
    {
      id: 'free',
      name: 'Kisan Free',
      price: 0,
      features: ['Basic mandi prices', 'Daily updates', 'Community access']
    },
    {
      id: 'pro',
      name: 'Kisan Pro',
      price: 299,
      features: ['Real-time prices', 'Price alerts (SMS)', 'Priority support', 'Market trends']
    },
    {
      id: 'premium',
      name: 'Kisan Premium',
      price: 799,
      features: ['All Pro features', 'Direct buyer contact', '1-on-1 expert advisory', 'Early access to features']
    }
  ]);
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/subscription/plans');
        if (response.data && response.data.length > 0) {
          setPlans(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch plans', error);
      }
    };
    fetchPlans();
  }, []);

  const handleUpgrade = async (planId) => {
    if (!token) {
      navigate('/login');
      return;
    }
    
    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }

    setLoadingPlan(planId);
    try {
      const response = await api.post('/subscription/checkout', { plan: planId });
      if (response.data && response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Stripe not configured yet - add API keys');
      }
    } catch (error) {
      if (error.response && error.response.status === 400 && error.response.data.message === 'Stripe not configured') {
        toast.error('Stripe not configured yet - add API keys');
      } else {
        toast.error('Payment configuration error or server error');
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Simple, Transparent Pricing</h2>
        <p className="mt-4 text-lg text-slate-400">Start free. Upgrade when you need more.</p>
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Free Plan */}
          <div className="glass-card p-8 flex flex-col border border-slate-700 relative">
            <h3 className="text-xl font-semibold text-white">Kisan Free</h3>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">₹0</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-left">
              {plans.find(p => p.id === 'free')?.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <FiCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleUpgrade('free')}
              className="mt-8 w-full btn-outline"
            >
              Get Started
            </button>
          </div>

          {/* Pro Plan */}
          <div className="glass-card p-8 flex flex-col border border-emerald-500/50 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white">Kisan Pro</h3>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">₹299</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-left">
              {plans.find(p => p.id === 'pro')?.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <FiCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleUpgrade('pro')}
              disabled={loadingPlan === 'pro'}
              className="mt-8 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingPlan === 'pro' ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : null}
              Upgrade Now
            </button>
          </div>

          {/* Premium Plan */}
          <div className="glass-card p-8 flex flex-col border border-purple-500/50 relative">
            <h3 className="text-xl font-semibold text-white">Kisan Premium</h3>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">₹799</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-left">
              {plans.find(p => p.id === 'premium')?.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <FiCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleUpgrade('premium')}
              disabled={loadingPlan === 'premium'}
              className="mt-8 w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-2.5 px-5 rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
               {loadingPlan === 'premium' ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : null}
              Upgrade Now
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Pricing;
