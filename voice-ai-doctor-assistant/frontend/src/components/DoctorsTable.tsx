import React, { useState } from 'react';
import type { Doctor } from '../types';
import { Search } from 'lucide-react';

interface DoctorsTableProps {
  doctors: Doctor[];
  loading?: boolean;
}

const specialityColors: Record<string, string> = {
  Cardiologist:     'bg-red-100 text-red-700',
  Neurologist:      'bg-purple-100 text-purple-700',
  Pediatrician:     'bg-yellow-100 text-yellow-700',
  Orthopedist:      'bg-blue-100 text-blue-700',
  Dermatologist:    'bg-pink-100 text-pink-700',
  'General Physician': 'bg-green-100 text-green-700',
};

const defaultColor = 'bg-slate-100 text-slate-700';

const daysAbbr: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

const specialities = ['All', 'Cardiologist', 'Neurologist', 'Pediatrician', 'Orthopedist', 'Dermatologist', 'General Physician'];

const DoctorsTable: React.FC<DoctorsTableProps> = ({ doctors, loading }) => {
  const [search, setSearch] = useState('');
  const [specialityFilter, setSpecialityFilter] = useState('All');

  const filtered = doctors.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.speciality.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialityFilter === 'All' || d.speciality === specialityFilter;
    return matchSearch && matchSpec;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <select
          value={specialityFilter}
          onChange={(e) => setSpecialityFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
          {specialities.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Doctor</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Speciality</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Experience</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Available Days</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Loading doctors...
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">No doctors found</td>
              </tr>
            )}
            {filtered.map((doctor, idx) => (
              <tr
                key={doctor.id}
                className={`hover:bg-blue-50/40 transition-colors duration-100 ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {doctor.name.split(' ').slice(1, 2).join('').charAt(0)}
                    </div>
                    <span className="font-medium text-slate-800 text-sm">{doctor.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${specialityColors[doctor.speciality] ?? defaultColor}`}>
                    {doctor.speciality}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">{doctor.experience} yrs</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {doctor.available_days.map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        {daysAbbr[day] ?? day}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
        Showing {filtered.length} of {doctors.length} doctors
      </div>
    </div>
  );
};

export default DoctorsTable;
