import React, { useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Mic,
  Activity,
  Menu,
  X,
  Heart,
} from 'lucide-react';
import Overview from './pages/Overview';
import DoctorsPage from './pages/DoctorsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import VoiceAssistant from './pages/VoiceAssistant';
import { useDashboardData } from './hooks/useDashboardData';

type Tab = 'overview' | 'voice' | 'doctors' | 'appointments';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'voice', label: 'Voice Assistant', icon: Mic },
  { id: 'doctors', label: 'Doctors', icon: Users },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const { stats, doctors, appointments, loading, refresh } = useDashboardData(callActive);

  const handleCallStatusChange = useCallback((active: boolean) => {
    setCallActive(active);
    if (!active) {
      // Refresh data after a call ends (new appointments may have been booked)
      setTimeout(refresh, 1000);
    }
  }, [refresh]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-100
          flex flex-col transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
            <Heart size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm leading-tight">City Health</h1>
            <p className="text-xs text-slate-400 leading-tight">AI Clinic Manager</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group
                ${activeTab === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <Icon
                size={18}
                className={activeTab === id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}
              />
              {label}
              {id === 'voice' && callActive && (
                <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-green-500" />
            <span className="text-xs text-slate-500">System operational</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Voice AI v1.0 · FastAPI backend</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {callActive && (
              <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Call active
              </span>
            )}
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
              <Mic size={11} />
              Voice AI Ready
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && (
              <Overview stats={stats} loading={loading} />
            )}
            {activeTab === 'voice' && (
              <VoiceAssistant onCallStatusChange={handleCallStatusChange} />
            )}
            {activeTab === 'doctors' && (
              <DoctorsPage doctors={doctors} loading={loading} />
            )}
            {activeTab === 'appointments' && (
              <AppointmentsPage
                appointments={appointments}
                loading={loading}
                onRefresh={refresh}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
