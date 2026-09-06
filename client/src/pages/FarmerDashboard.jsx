import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { 
  FiTrendingUp, FiMessageSquare, FiMap, FiLogOut, 
  FiZap, FiBarChart2, FiUser, FiSend, FiLoader 
} from 'react-icons/fi';

const COMMODITIES = ['Onion', 'Wheat', 'Rice', 'Tomato', 'Potato', 'Maize', 'Groundnut'];
const STATES = ['Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Rajasthan', 'Karnataka', 'Gujarat', 'Punjab'];

const FarmerDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  // UI State
  const [activeTab, setActiveTab] = useState('market');

  // Data State
  const [commodity, setCommodity] = useState(user?.crops?.[0] || 'Onion');
  const [state, setState] = useState(user?.region?.state || 'Maharashtra');
  const [days, setDays] = useState(30);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Hello! I am your AI Agronomy Advisor. Ask me anything about crop planning, weather, or market trends.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, [commodity, state, days]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/farmer/prices', { params: { commodity, state, days } });
      const formatted = (res.data.data || [])
        .sort((a, b) => new Date(a.arrivalDate) - new Date(b.arrivalDate))
        .map(p => ({
          date: format(new Date(p.arrivalDate), 'dd MMM'),
          minPrice: p.minPrice,
          maxPrice: p.maxPrice,
          modalPrice: p.modalPrice,
          mandi: p.mandiName
        }));
      setPrices(formatted);
    } catch (err) {
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatMessage('');
    setChatLoading(true);

    try {
      const res = await api.post('/ml/chat', { message: userMsg });
      const reply = res.data.response || res.data.message || 'Received response from agent.';
      setChatHistory(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (err) {
      const errorMsg = err.response?.status === 503 
        ? 'ML service is offline — start the Python service' 
        : 'An error occurred while chatting with the AI Advisor.';
      setChatHistory(prev => [...prev, { role: 'error', text: errorMsg }]);
    } finally {
      setChatLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-3 shadow-xl text-sm">
        <p className="text-[#fafafa] font-medium mb-1.5">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="leading-relaxed">
            {entry.name}: ₹{entry.value?.toLocaleString('en-IN')}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-[#fafafa] font-sans overflow-hidden">
      
      {/* SIDEBAR (Sleek, Linear/Vercel inspired) */}
      <aside className="w-64 border-r border-[#27272a] bg-[#09090b] flex flex-col justify-between hidden md:flex">
        <div>
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-[#27272a]">
            <div className="w-7 h-7 rounded bg-[#10b981] flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xs">AF</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">AgriFlow</span>
          </div>

          {/* Navigation */}
          <div className="px-4 py-6 space-y-1">
            <p className="px-2 text-xs font-semibold text-[#71717a] mb-2 uppercase tracking-wider">Menu</p>
            
            <button 
              onClick={() => setActiveTab('market')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'market' ? 'bg-[#27272a] text-white' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50'
              }`}
            >
              <FiTrendingUp className="w-4 h-4" /> Market Insights
            </button>
            
            <button 
              onClick={() => setActiveTab('advisor')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'advisor' ? 'bg-[#27272a] text-white' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50'
              }`}
            >
              <FiMessageSquare className="w-4 h-4" /> AI Advisor
            </button>
            
            <button 
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'map' ? 'bg-[#27272a] text-white' : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50'
              }`}
            >
              <FiMap className="w-4 h-4" /> Market Map
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="px-4 py-6 space-y-4 border-t border-[#27272a]">
          {/* Upgrade Button - Elegant, not desperate */}
          <button 
            onClick={() => navigate('/pricing')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#10b981] to-[#059669] text-white text-sm font-medium py-2 rounded-md hover:opacity-90 transition-opacity shadow-sm"
          >
            <FiZap className="w-4 h-4" /> Upgrade to Pro
          </button>
          
          {/* User Profile */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center">
                <FiUser className="w-4 h-4 text-[#a1a1aa]" />
              </div>
              <div>
                <p className="text-sm font-medium leading-none truncate w-24">{user?.name}</p>
                <p className="text-xs text-[#71717a] mt-1 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="text-[#a1a1aa] hover:text-white">
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* Header - Simple Breadcrumb Style */}
        <header className="h-16 flex items-center px-8 border-b border-[#27272a]">
          <h2 className="text-sm font-medium text-[#a1a1aa]">
            AgriFlow <span className="mx-2 text-[#3f3f46]">/</span> 
            <span className="text-white capitalize">
              {activeTab === 'market' ? 'Market Insights' : activeTab === 'advisor' ? 'AI Advisor' : 'Market Map'}
            </span>
          </h2>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">

          {/* VIEW: MARKET INSIGHTS */}
          {activeTab === 'market' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Market Insights</h1>
                  <p className="text-sm text-[#a1a1aa] mt-1">Analyze 15M+ rows of historical crop data.</p>
                </div>
                {/* Filters */}
                <div className="flex items-center gap-3 bg-[#18181b] border border-[#27272a] p-1.5 rounded-lg">
                  <select value={commodity} onChange={(e) => setCommodity(e.target.value)} className="bg-transparent text-sm text-[#fafafa] focus:outline-none px-2 py-1 cursor-pointer">
                    {COMMODITIES.map(c => <option key={c} value={c} className="bg-[#09090b]">{c}</option>)}
                  </select>
                  <div className="w-px h-4 bg-[#27272a]"></div>
                  <select value={state} onChange={(e) => setState(e.target.value)} className="bg-transparent text-sm text-[#fafafa] focus:outline-none px-2 py-1 cursor-pointer max-w-[120px]">
                    {STATES.map(s => <option key={s} value={s} className="bg-[#09090b]">{s}</option>)}
                  </select>
                  <div className="w-px h-4 bg-[#27272a]"></div>
                  <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent text-sm text-[#fafafa] focus:outline-none px-2 py-1 cursor-pointer">
                    <option value={7} className="bg-[#09090b]">7D</option>
                    <option value={30} className="bg-[#09090b]">30D</option>
                    <option value={90} className="bg-[#09090b]">90D</option>
                  </select>
                </div>
              </div>

              {/* Chart Card */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-sm font-medium mb-6 flex items-center gap-2">
                  <FiBarChart2 className="w-4 h-4 text-[#a1a1aa]" /> Price Trend (Modal, Min, Max)
                </h3>
                
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : prices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-[#71717a]">
                    <FiBarChart2 className="w-8 h-8 mb-3 opacity-50" />
                    <p className="text-sm">No price data found.</p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={prices} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Line type="monotone" dataKey="modalPrice" name="Modal" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="maxPrice" name="Max" stroke="#3f3f46" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="minPrice" name="Min" stroke="#3f3f46" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-[#27272a]">
                  <h3 className="text-sm font-medium">Recent Mandi Records</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#27272a] bg-[#18181b]/50">
                        <th className="px-6 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Mandi</th>
                        <th className="px-6 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Modal Price</th>
                        <th className="px-6 py-3 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272a]">
                      {prices.slice(0, 10).map((p, i) => (
                        <tr key={i} className="hover:bg-[#18181b] transition-colors">
                          <td className="px-6 py-3 whitespace-nowrap text-[#a1a1aa]">{p.date}</td>
                          <td className="px-6 py-3 whitespace-nowrap font-medium">{p.mandi}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-[#10b981] font-medium">₹{p.modalPrice?.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-xs text-[#71717a]">
                            ₹{p.minPrice} — ₹{p.maxPrice}
                          </td>
                        </tr>
                      ))}
                      {prices.length === 0 && (
                        <tr><td colSpan="4" className="px-6 py-8 text-center text-[#71717a]">No records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AI ADVISOR (ChatGPT Style UI) */}
          {activeTab === 'advisor' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-140px)] flex flex-col">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">AI Advisor</h1>
                <p className="text-sm text-[#a1a1aa] mt-1">Powered by Google Gemini.</p>
              </div>

              <div className="flex-1 bg-[#09090b] border border-[#27272a] rounded-xl flex flex-col overflow-hidden shadow-sm">
                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-[#18181b] border border-[#27272a] text-white' 
                          : msg.role === 'error'
                          ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                          : 'bg-gradient-to-br from-[#10b981]/10 to-[#059669]/10 border border-[#10b981]/20 text-white'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl px-5 py-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[#a1a1aa] rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-[#a1a1aa] rounded-full animate-bounce [animation-delay:-.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-[#a1a1aa] rounded-full animate-bounce [animation-delay:-.3s]"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-[#18181b] border-t border-[#27272a]">
                  <form onSubmit={handleChatSubmit} className="flex gap-3 relative">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Ask about crop rotation, fertilizers, or weather..."
                      className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-4 pr-12 py-3 text-sm text-white placeholder-[#71717a] focus:outline-none focus:border-[#10b981] transition-colors shadow-inner"
                      disabled={chatLoading}
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatMessage.trim()}
                      className="absolute right-2 top-2 p-1.5 rounded-md text-[#10b981] hover:bg-[#10b981]/10 disabled:opacity-50 transition-colors"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MAP (Placeholder) */}
          {activeTab === 'map' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Market Map</h1>
                <p className="text-sm text-[#a1a1aa] mt-1">Geospatial view of Mandi locations.</p>
              </div>
              <div className="bg-[#09090b] border border-[#27272a] rounded-xl h-[400px] flex flex-col items-center justify-center text-[#71717a] shadow-sm">
                <FiMap className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">Map View is coming soon.</p>
                <p className="text-xs mt-1">Will integrate Leaflet or Mapbox to plot Mandi GPS coordinates.</p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default FarmerDashboard;
