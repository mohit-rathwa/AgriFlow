import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiLogOut, FiUser, FiBell, FiZap } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    farmer: 'Farmer',
    mandiAgent: 'Mandi Agent',
    admin: 'Admin'
  };

  return (
    <nav className="bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/80 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AF</span>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">AgriFlow</span>
          </div>
          
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white leading-none">{user.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{roleLabel[user.role] || user.role}</p>
                </div>
              </div>
              {user.role === 'farmer' && (
                <div className="flex items-center gap-2">
                  <Link to="/alerts" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800/50">
                    <FiBell className="w-4 h-4" />
                    <span className="hidden md:inline">Alerts</span>
                  </Link>
                  <Link to="/pricing" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800/50">
                    <FiZap className="w-4 h-4" />
                    <span className="hidden md:inline">Upgrade</span>
                  </Link>
                </div>
              )}
              <div className="w-px h-8 bg-slate-800 hidden sm:block"></div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800/50"
              >
                <FiLogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
