import type { Appointment, DashboardStats, Doctor } from '../types';

const BASE_URL = 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  // For void responses (DELETE)
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function fetchStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/stats');
}

export async function fetchDoctors(): Promise<Doctor[]> {
  return request<Doctor[]>('/api/doctors');
}

export async function fetchAppointments(): Promise<Appointment[]> {
  return request<Appointment[]>('/api/appointments');
}

export async function cancelAppointment(id: number): Promise<void> {
  await request<void>(`/api/appointments/${id}`, { method: 'DELETE' });
}
