import { useCallback, useEffect, useRef, useState } from 'react';
import type { Appointment, DashboardStats, Doctor } from '../types';
import { fetchAppointments, fetchDoctors, fetchStats } from '../services/api';

interface UseDashboardDataReturn {
  stats: DashboardStats | null;
  doctors: Doctor[];
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// callActive: true when a voice call is in progress (triggers 3-second polling)
export function useDashboardData(callActive?: boolean): UseDashboardDataReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [s, d, a] = await Promise.all([fetchStats(), fetchDoctors(), fetchAppointments()]);
      setStats(s);
      setDoctors(d);
      setAppointments(a);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Poll every 3s when call is active
  useEffect(() => {
    if (callActive) {
      intervalRef.current = setInterval(() => { void loadAll(); }, 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callActive, loadAll]);

  return { stats, doctors, appointments, loading, error, refresh: loadAll };
}
