import { useCallback, useEffect, useRef, useState } from 'react';
import type { BookingResult, CallStatus, TranscriptEntry, VoiceState } from '../types';
import { voiceWS } from '../services/websocket';

interface UseVoiceCallReturn {
  status: CallStatus;
  voiceState: VoiceState;
  transcript: TranscriptEntry[];
  callDuration: number;
  isMuted: boolean;
  bookingResult: BookingResult | null;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
}

export function useVoiceCall(): UseVoiceCallReturn {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setCallDuration(0);
    timerRef.current = setInterval(() => { setCallDuration((d) => d + 1); }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startCall = useCallback(async () => {
    setStatus('connecting');
    setTranscript([]);
    setBookingResult(null);
    setVoiceState('idle');

    const onConnected = () => { setStatus('connected'); startTimer(); };
    const onTranscript = (entry: TranscriptEntry) => { setTranscript((prev) => [...prev, entry]); };
    const onVoiceState = (state: VoiceState) => { setVoiceState(state); };
    const onBooking = (result: BookingResult) => { setBookingResult(result); };
    const onError = (_msg: string) => { setStatus('connected'); startTimer(); };
    const onDisconnected = () => { setStatus('ended'); stopTimer(); };

    voiceWS.on('connected', onConnected);
    voiceWS.on('transcript', onTranscript);
    voiceWS.on('voice_state', onVoiceState);
    voiceWS.on('booking_confirmed', onBooking);
    voiceWS.on('error', onError);
    voiceWS.on('disconnected', onDisconnected);

    try {
      await voiceWS.connect();
    } catch {
      setStatus('connected');
      startTimer();
    }
  }, [startTimer, stopTimer]);

  const endCall = useCallback(() => {
    setStatus('ending');
    stopTimer();
    voiceWS.disconnect();
    setTimeout(() => { setStatus('ended'); }, 500);
  }, [stopTimer]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => { voiceWS.setMuted(!prev); return !prev; });
  }, []);

  useEffect(() => {
    return () => { stopTimer(); voiceWS.disconnect(); };
  }, [stopTimer]);

  return { status, voiceState, transcript, callDuration, isMuted, bookingResult, startCall, endCall, toggleMute };
}
