import React, { useState } from 'react';
import type { Appointment } from '../types';
import { format, parseISO } from 'date-fns';
import { XCircle } from 'lucide-react';

interface AppointmentsTableProps {
  appointments: Appointment[];
  loading?: boolean;
  onCancel: (id: number) => Promise<void>;
}

function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return '•'.repeat(phone.length - 4) + phone.slice(-4);
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

type StatusFilter = 'all' | 'confirmed' | 'cancelled';

const AppointmentsTable: React.FC<AppointmentsTableProps> = ({ appointments, loading, onCancel }) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [cancelling, setCancelling] = useState<number | null>(null);

  const filtered = appointments.filter((a) => filter === 'all' || a.status === filter);

  const handleCancel = async (id: number) => {
    setCancelling(id);
    await onCancel(id);
    setCancelling(null);
  };

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Filter tabs */}
      <div className="px-6 pt-5 pb-0 border-b border-slate-100">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors duration-150 ${
                filter === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.key === 'all' ? appointments.length : appointments.filter(a => a.status === tab.key).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">ID</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Patient Phone</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Doctor</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Date</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Time</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading appointments...
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No appointments found</td>
              </tr>
            )}
            {filtered.map((appt, idx) => (
              <tr
                key={appt.id}
                className={`hover:bg-blue-50/30 transition-colors duration-100 ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}
              >
                <td className="px-6 py-4 text-sm text-slate-500 font-mono">#{appt.id}</td>
                <td className="px-6 py-4 text-sm font-mono text-slate-700">{maskPhone(appt.patient_phone)}</td>
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{appt.doctor_name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{formatDate(appt.appointment_date)}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{appt.appointment_time}</td>
                <td className="px-6 py-4">
                  {appt.status === 'confirmed' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 ring-1 ring-green-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Confirmed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      Cancelled
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {appt.status === 'confirmed' && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancelling === appt.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors duration-150 disabled:opacity-50"
                    >
                      {cancelling === appt.id ? (
                        <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <XCircle size={12} />
                      )}
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
        Showing {filtered.length} of {appointments.length} appointments
      </div>
    </div>
  );
};

export default AppointmentsTable;
