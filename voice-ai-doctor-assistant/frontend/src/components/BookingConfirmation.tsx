import React from 'react';
import type { BookingResult } from '../types';
import { CheckCircle, Calendar, Clock, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BookingConfirmationProps {
  booking: BookingResult;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

const BookingConfirmation: React.FC<BookingConfirmationProps> = ({ booking }) => {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle size={20} className="text-green-600" />
        <span className="font-semibold text-green-800 text-sm">Appointment Confirmed!</span>
        <span className="ml-auto text-xs font-mono text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
          #{booking.appointment_id}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <User size={14} className="text-green-500 flex-shrink-0" />
          <span>{booking.doctor_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Calendar size={14} className="text-green-500 flex-shrink-0" />
          <span>{formatDate(booking.appointment_date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Clock size={14} className="text-green-500 flex-shrink-0" />
          <span>{booking.appointment_time}</span>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
