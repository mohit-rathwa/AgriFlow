import { NavLink, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const navItems = [
  { path: '/agent', label: 'Intelligence Agent', icon: '🤖' },
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/upload', label: 'Upload', icon: '📤' },
  { path: '/analysis', label: 'Analysis', icon: '🔬' },
  { path: '/simulate', label: 'Simulate', icon: '⚡' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/data-quality', label: 'Data Quality', icon: '🛡️' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, user, logout } = useStore();
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-dark-900/95 backdrop-blur-2xl border-r border-dark-700/50 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-20 lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-dark-700/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-agri-500 to-agri-700 flex items-center justify-center text-xl shadow-lg shadow-agri-500/20 flex-shrink-0">
            🌾
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'lg:w-0 lg:opacity-0'}`}>
            <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap">AgriFlow</h1>
            <p className="text-[10px] text-dark-400 font-medium tracking-wider uppercase whitespace-nowrap">Supply Chain Intel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className={`px-3 py-2 text-[10px] font-semibold text-dark-500 uppercase tracking-widest ${!sidebarOpen && 'lg:hidden'}`}>
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-agri-500/10 text-agri-400 border border-agri-500/20 shadow-sm shadow-agri-500/5'
                    : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/80 border border-transparent'
                }`}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
              >
                <span className={`text-lg flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                <span className={`whitespace-nowrap transition-all duration-300 ${!sidebarOpen && 'lg:hidden'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={`ml-auto w-1.5 h-1.5 rounded-full bg-agri-400 animate-pulse ${!sidebarOpen && 'lg:hidden'}`} />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-dark-700/50 p-4">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'lg:justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-agri-400 to-agri-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${!sidebarOpen && 'lg:hidden'}`}>
              <p className="text-sm font-medium text-dark-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-dark-500 truncate">{user?.email || 'user@example.com'}</p>
            </div>
            <button
              onClick={logout}
              className={`p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 flex-shrink-0 ${!sidebarOpen && 'lg:hidden'}`}
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
