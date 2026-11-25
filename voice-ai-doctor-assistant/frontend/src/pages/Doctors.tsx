import React from 'react';
import type { Doctor } from '../types';
import DoctorsTable from '../components/DoctorsTable';
import { Users } from 'lucide-react';

interface DoctorsPageProps {
  doctors: Doctor[];
  loading?: boolean;
}

const DoctorsPage: React.FC<DoctorsPageProps> = ({ doctors, loading }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Doctors</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and view registered physicians</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium">
          <Users size={16} />
          {doctors.length} doctors
        </div>
      </div>
      <DoctorsTable doctors={doctors} loading={loading} />
    </div>
  );
};

export default DoctorsPage;
