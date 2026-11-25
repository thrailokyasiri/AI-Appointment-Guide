export interface Doctor {
  id: number;
  name: string;
  speciality: string;
  experience: number;
  available_days: string[];
  slots?: AppointmentSlot[];
}

export interface AppointmentSlot {
  id: number;
  doctor_id: number;
  appointment_date: string;
  appointment_time: string;
  status: 'available' | 'booked';
}

export interface Appointment {
  id: number;
  patient_phone: string;
  doctor_id: number;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

export interface DashboardStats {
  total_doctors: number;
  available_slots: number;
  total_appointments: number;
  confirmed_appointments: number;
  cancelled_appointments: number;
}

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'ending' | 'ended';
export type VoiceState = 'listening' | 'speaking' | 'processing' | 'idle';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export interface BookingResult {
  appointment_id: number;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
}
