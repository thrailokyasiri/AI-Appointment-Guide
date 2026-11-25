import React, { useEffect } from 'react';
import type { Appointment } from '../types';
import AppointmentsTable from '../components/AppointmentsTable';
import { Calendar, RefreshCw } from 'lucide-react';
import { cancelAppointment } from '../services/api';

interface AppointmentsPageProps {
  appointments: Appointment[];
  loading?: boolean;
  onRefresh: () => void;
}

const AppointmentsPage: React.FC<AppointmentsPageProps> = ({ appointments, loading, onRefresh }) => {
  // Auto-refresh every 5 seconds
  useEffect(() => {
    const timer = setInterval(onRefresh, 5000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const handleCancel = async (id: number) => {
    await cancelAppointment(id);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage patient appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium">
            <Calendar size={16} />
            {appointments.length} total
          </span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
      <AppointmentsTable
        appointments={appointments}
        loading={loading}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default AppointmentsPage;
