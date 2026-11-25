import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: number | string;
  Icon: LucideIcon;
  accent: 'blue' | 'green' | 'purple' | 'red' | 'orange';
  description?: string;
}

const accentMap: Record<StatsCardProps['accent'], { bg: string; text: string; icon: string; ring: string }> = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500',   ring: 'ring-blue-100' },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-500',  ring: 'ring-green-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500', ring: 'ring-purple-100' },
  red:    { bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500',    ring: 'ring-red-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', ring: 'ring-orange-100' },
};

const StatsCard: React.FC<StatsCardProps> = ({ label, value, Icon, accent, description }) => {
  const colors = accentMap[accent];
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow duration-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-slate-400 mt-2">{description}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colors.bg} ring-1 ${colors.ring} group-hover:scale-110 transition-transform duration-200`}>
          <Icon size={22} className={colors.icon} />
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
