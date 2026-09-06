import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useStore } from '../../store/useStore';

export default function AppLayout() {
  const { sidebarOpen } = useStore();

  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <Navbar />
        <main className="p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
