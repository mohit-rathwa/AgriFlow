import { useStore } from '../../store/useStore';
import { useDatasets } from '../../hooks/useDataset';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/upload': 'Upload Dataset',
  '/analysis': 'Analysis',
  '/simulate': 'Simulate',
  '/data-quality': 'Data Quality',
};

export default function Navbar() {
  const { sidebarOpen, toggleSidebar, user, activeDatasetId, setActiveDatasetId } = useStore();
  const { data: datasets } = useDatasets();
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] || 'AgriFlow';

  return (
    <header className="sticky top-0 z-30 bg-dark-950/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Left section */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/80 transition-all duration-200 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">{pageTitle}</h2>
            <p className="text-xs text-dark-500 hidden sm:block">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {/* Dataset selector */}
          {datasets && datasets.length > 0 && (
            <select
              value={activeDatasetId || ''}
              onChange={(e) => setActiveDatasetId(e.target.value || null)}
              className="hidden md:block px-3 py-1.5 bg-dark-800/80 border border-dark-700/50 rounded-lg text-sm text-dark-200 focus:outline-none focus:border-agri-500/50 transition-all duration-200 max-w-[200px]"
            >
              <option value="">Select Dataset</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>
          )}

          {/* Notification bell */}
          <button className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/80 transition-all duration-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-agri-500 rounded-full animate-pulse" />
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-dark-700/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-agri-400 to-agri-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-dark-200">{user?.name || 'User'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
