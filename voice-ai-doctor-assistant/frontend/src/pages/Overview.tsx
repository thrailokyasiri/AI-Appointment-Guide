import React from 'react';
import type { DashboardStats } from '../types';
import StatsCard from '../components/StatsCard';
import { Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  stats: DashboardStats | null;
  loading: boolean;
}

const Overview: React.FC<Props> = ({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-28 bg-slate-100 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Total Doctors', value: stats?.total_doctors ?? 0, Icon: Users, accent: 'blue' as const, description: 'Registered physicians' },
    { label: 'Available Slots', value: stats?.available_slots ?? 0, Icon: Clock, accent: 'purple' as const, description: 'Open appointment slots' },
    { label: 'Total Appointments', value: stats?.total_appointments ?? 0, Icon: Calendar, accent: 'orange' as const, description: 'All time bookings' },
    { label: 'Confirmed', value: stats?.confirmed_appointments ?? 0, Icon: CheckCircle, accent: 'green' as const, description: 'Active appointments' },
    { label: 'Cancelled', value: stats?.cancelled_appointments ?? 0, Icon: XCircle, accent: 'red' as const, description: 'Cancelled appointments' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
        <p className="text-sm text-slate-500 mt-1">Real-time clinic statistics</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((c) => (
          <StatsCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  );
};

export default Overview;
