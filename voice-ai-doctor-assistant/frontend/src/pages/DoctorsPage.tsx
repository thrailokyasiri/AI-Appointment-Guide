import React, { useState } from 'react';
import type { Doctor } from '../types';
import DoctorsTable from '../components/DoctorsTable';
import { Search } from 'lucide-react';

interface Props {
  doctors: Doctor[];
  loading: boolean;
}

const SPECIALITIES = ['All', 'Cardiologist', 'Neurologist', 'Pediatrician', 'Orthopedist', 'Dermatologist', 'General Physician'];

const DoctorsPage: React.FC<Props> = ({ doctors, loading }) => {
  const [search, setSearch] = useState('');
  const [speciality, setSpeciality] = useState('All');

  const filtered = doctors.filter((d) => {
    const matchSearch =
      search === '' ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.speciality.toLowerCase().includes(search.toLowerCase());
    const matchSpec = speciality === 'All' || d.speciality === speciality;
    return matchSearch && matchSpec;
  });

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Doctors</h2>
          <p className="text-sm text-slate-500 mt-1">{doctors.length} physicians registered</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search doctors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-52"
            />
          </div>
          <select
            value={speciality}
            onChange={(e) => setSpeciality(e.target.value)}
            className="py-2 px-3 text-sm border border-slate-200 rounded-lg bg-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {SPECIALITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {loading && doctors.length === 0 ? (
        <div className="card animate-pulse h-64" />
      ) : (
        <DoctorsTable doctors={filtered} />
      )}
    </div>
  );
};

export default DoctorsPage;
